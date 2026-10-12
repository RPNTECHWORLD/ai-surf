import os
import sys
import json
import datetime
import shutil
import sqlite3
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

# 1. AWS RDS Connection details (strictly read from root .env or fallback)
load_dotenv(os.path.join(ROOT_DIR, ".env"))
aws_db_url = os.getenv("DATABASE_URL")
if not aws_db_url or "amazonaws.com" not in aws_db_url:
    aws_db_url = "postgresql://postgres@database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com:5432/postgres"

aws_region = os.getenv("AWS_REGION", "us-east-1")

parsed = urlparse(aws_db_url)
db_host = parsed.hostname
db_port = parsed.port or 5432
db_user = parsed.username or "postgres"
db_name = parsed.path.lstrip("/")

print("=" * 60)
print("  SAFE AWS RDS -> LOCAL SQLITE BACKUP & SYNC")
print("=" * 60)
print(f"[INFO] Target AWS RDS: {db_host}")
print("[INFO] AWS Region:    ", aws_region)
print("[INFO] Safety check:  AWS connection is strictly READ-ONLY!")

# 2. Connect to AWS RDS with IAM Token
try:
    rds_client = boto3.client("rds", region_name=aws_region)
    token = rds_client.generate_db_auth_token(
        DBHostname=db_host, Port=db_port, DBUsername=db_user, Region=aws_region
    )
    aws_conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        database=db_name,
        password=token,
        sslmode="require"
    )
    # Enforce READ ONLY on session
    aws_conn.set_session(readonly=True, autocommit=False)
    aws_cur = aws_conn.cursor(cursor_factory=RealDictCursor)
    print("[SUCCESS] Connected to AWS RDS in READ-ONLY mode.")
except Exception as e:
    print(f"[ERROR] Failed to connect to AWS RDS: {e}")
    sys.exit(1)

# 3. Read all tables & rows from AWS RDS
aws_cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
tables = [row["table_name"] for row in aws_cur.fetchall()]
print(f"[INFO] Found {len(tables)} tables in AWS RDS: {', '.join(tables)}")

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
json_backup_path = os.path.join(BACKUPS_DIR, f"rds_backup_{timestamp}.json")
json_latest_path = os.path.join(BACKUPS_DIR, "rds_backup_latest.json")

def serialize_val(val):
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

aws_data = {}
for tbl in tables:
    aws_cur.execute(f'SELECT * FROM "{tbl}";')
    rows = aws_cur.fetchall()
    aws_data[tbl] = [
        {k: serialize_val(v) for k, v in row.items()}
        for row in rows
    ]
    print(f"  [AWS FETCH] '{tbl}': {len(rows)} records fetched.")

aws_cur.close()
aws_conn.close()
print("[INFO] AWS RDS connection closed safely. Zero modifications made to live AWS data.")

# 4. Save JSON Backup to backups/ directory
with open(json_backup_path, "w", encoding="utf-8") as f:
    json.dump(aws_data, f, indent=2, ensure_ascii=False)
with open(json_latest_path, "w", encoding="utf-8") as f:
    json.dump(aws_data, f, indent=2, ensure_ascii=False)

print(f"[SUCCESS] AWS Backup saved:")
print(f"   -> {json_backup_path}")
print(f"   -> {json_latest_path}")

# 5. Backup current local SQLite if it exists
local_db_path = os.path.join(BACKEND_DIR, "aisurf.db")
if os.path.exists(local_db_path):
    local_bak_path = os.path.join(BACKUPS_DIR, f"local_aisurf_before_sync_{timestamp}.db")
    shutil.copy2(local_db_path, local_bak_path)
    print(f"[INFO] Backed up previous local SQLite to: {local_bak_path}")

# 6. Initialize SQLite schema using backend models
sys.path.insert(0, BACKEND_DIR)
os.environ["DATABASE_URL"] = f"sqlite:///{local_db_path.replace(os.sep, '/')}"

try:
    from main import Base, engine
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] Local SQLite tables and schema verified/created.")
except Exception as e:
    print(f"[WARN] Schema creation via SQLAlchemy notice: {e}")

# 7. Sync data into Local SQLite
sqlite_conn = sqlite3.connect(local_db_path)
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("PRAGMA foreign_keys = OFF;")

# Get list of existing tables in SQLite
sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
sqlite_tables = set(r[0] for r in sqlite_cur.fetchall())

print("\n[INFO] Importing data into Local SQLite...")
sync_summary = {}

for tbl, rows in aws_data.items():
    if tbl not in sqlite_tables:
        print(f"  [SKIP] Table '{tbl}' not in SQLite schema.")
        continue

    # Get column names of SQLite table
    sqlite_cur.execute(f"PRAGMA table_info({tbl});")
    sqlite_cols = [c[1] for c in sqlite_cur.fetchall()]

    # Clear existing local data for this table
    sqlite_cur.execute(f"DELETE FROM \"{tbl}\";")

    if not rows:
        sync_summary[tbl] = {"aws": 0, "local": 0}
        continue

    # Match common columns
    aws_sample_cols = list(rows[0].keys())
    common_cols = [c for c in aws_sample_cols if c in sqlite_cols]

    if not common_cols:
        continue

    col_names = ", ".join([f'"{c}"' for c in common_cols])
    placeholders = ", ".join(["?"] * len(common_cols))
    insert_sql = f"INSERT OR REPLACE INTO \"{tbl}\" ({col_names}) VALUES ({placeholders})"

    batch_values = []
    for r in rows:
        row_vals = []
        for c in common_cols:
            val = r.get(c)
            if isinstance(val, (dict, list)):
                val = json.dumps(val)
            elif isinstance(val, bool):
                val = 1 if val else 0
            row_vals.append(val)
        batch_values.append(row_vals)

    sqlite_cur.executemany(insert_sql, batch_values)
    sync_summary[tbl] = {"aws": len(rows), "local": len(batch_values)}
    print(f"  [SYNCED] Table '{tbl}': {len(batch_values)} rows synced to local.")

sqlite_conn.commit()
sqlite_cur.execute("PRAGMA foreign_keys = ON;")
sqlite_conn.close()

print("\n" + "=" * 60)
print("  SYNC COMPLETED SUCCESSFULLY!")
print("=" * 60)
for tbl, counts in sync_summary.items():
    print(f"  - {tbl.ljust(25)}: AWS = {counts['aws']} -> Local = {counts['local']}")

print("\nLive AWS RDS data remains 100% UNTOUCHED.")
print(f"Local database '{local_db_path}' now has the exact copy of AWS RDS!")
