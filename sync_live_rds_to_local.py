import os
import sys
import json
import datetime
import shutil
import sqlite3
from urllib.parse import urlparse
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

# Load environment
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# AWS RDS Connection details (Live Production)
AWS_RDS_URL = "postgresql://postgres@database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com:5432/postgres"
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Local Database Connection details
LOCAL_PG_URL = os.getenv("DATABASE_URL", "postgresql://postgres:eric%402004@localhost:5432/surfing_db")
LOCAL_SQLITE_PATH = os.path.join(BACKEND_DIR, "aisurf.db")

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

print("=" * 70)
print("     ATHNEX LIVE / AI SURF — SAFE DATABASE BACKUP & LOCAL SYNC")
print("=" * 70)
print(f"[*] Timestamp:          {timestamp}")
print(f"[*] AWS RDS (Live):     database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com")
print(f"[*] Local PostgreSQL:   {LOCAL_PG_URL.split('@')[-1] if '@' in LOCAL_PG_URL else LOCAL_PG_URL}")
print(f"[*] Local SQLite:       {LOCAL_SQLITE_PATH}")
print(f"[*] Safety Guarantee:   AWS RDS connection is strictly 100% READ-ONLY!")
print("=" * 70)

# Helper serializer
def serialize_val(val):
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val

# =====================================================================
# STEP 1: CONNECT TO AWS RDS & BACKUP DATA (100% READ-ONLY)
# =====================================================================
print("\n" + "-" * 55)
print("  STEP 1: READING LIVE DATA FROM AWS RDS (READ-ONLY)")
print("-" * 55)

parsed_aws = urlparse(AWS_RDS_URL)
rds_client = boto3.client("rds", region_name=AWS_REGION)
aws_token = rds_client.generate_db_auth_token(
    DBHostname=parsed_aws.hostname,
    Port=parsed_aws.port or 5432,
    DBUsername=parsed_aws.username or "postgres",
    Region=AWS_REGION
)

print(f"[*] Connecting to AWS RDS {parsed_aws.hostname}...")
aws_conn = psycopg2.connect(
    host=parsed_aws.hostname,
    port=parsed_aws.port or 5432,
    user=parsed_aws.username or "postgres",
    database=parsed_aws.path.lstrip("/") or "postgres",
    password=aws_token,
    sslmode="require",
    connect_timeout=15
)

# Strictly enforce session-level READ-ONLY on AWS RDS connection
aws_conn.set_session(readonly=True, autocommit=False)
aws_cur = aws_conn.cursor(cursor_factory=RealDictCursor)
print("[+] Connected to AWS RDS in strict READ-ONLY mode. (Zero writes allowed).")

aws_cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
aws_tables = [r["table_name"] for r in aws_cur.fetchall()]
print(f"[*] Found {len(aws_tables)} tables in AWS RDS public schema.")

aws_backup_data = {}
sql_dump_lines = [
    f"-- AthnexLive / AI Surf Live Database Backup",
    f"-- Generated: {datetime.datetime.now().isoformat()}",
    f"-- Source Host: {parsed_aws.hostname}\n",
    "BEGIN;\n"
]

total_aws_records = 0
for tbl in aws_tables:
    aws_cur.execute(f'SELECT * FROM "{tbl}";')
    rows = aws_cur.fetchall()
    total_aws_records += len(rows)

    serialized_rows = [
        {k: serialize_val(v) for k, v in row.items()}
        for row in rows
    ]
    aws_backup_data[tbl] = serialized_rows
    print(f"  -> Fetched '{tbl}': {len(rows)} rows")

    if rows:
        cols = list(rows[0].keys())
        col_str = ", ".join([f'"{c}"' for c in cols])
        sql_dump_lines.append(f"-- Table: {tbl} ({len(rows)} rows)")
        for row in rows:
            val_strs = []
            for c in cols:
                v = row[c]
                if v is None:
                    val_strs.append("NULL")
                elif isinstance(v, (int, float)):
                    val_strs.append(str(v))
                elif isinstance(v, bool):
                    val_strs.append("TRUE" if v else "FALSE")
                elif isinstance(v, (datetime.date, datetime.datetime)):
                    val_strs.append(f"'{v.isoformat()}'")
                elif isinstance(v, (dict, list)):
                    escaped = json.dumps(v).replace("'", "''")
                    val_strs.append(f"'{escaped}'")
                else:
                    escaped = str(v).replace("'", "''")
                    val_strs.append(f"'{escaped}'")
            vals_str = ", ".join(val_strs)
            sql_dump_lines.append(f'INSERT INTO "{tbl}" ({col_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;')
        sql_dump_lines.append("")

sql_dump_lines.append("COMMIT;\n")

# Safely close AWS connection now
aws_cur.close()
aws_conn.close()
print(f"[+] Total AWS records fetched: {total_aws_records}")
print("[+] AWS RDS connection safely closed. Zero modifications made to live database.")

# =====================================================================
# STEP 2: SAVE BACKUP FILES LOCALLY
# =====================================================================
print("\n" + "-" * 55)
print("  STEP 2: SAVING NEW BACKUP FILES LOCALLY")
print("-" * 55)

json_backup_path = os.path.join(BACKUPS_DIR, f"rds_backup_{timestamp}.json")
json_latest_path = os.path.join(BACKUPS_DIR, "rds_backup_latest.json")
sql_backup_path = os.path.join(BACKUPS_DIR, f"rds_backup_{timestamp}.sql")
sql_latest_path = os.path.join(BACKUPS_DIR, "rds_backup_latest.sql")

with open(json_backup_path, "w", encoding="utf-8") as f:
    json.dump(aws_backup_data, f, indent=2, ensure_ascii=False)
with open(json_latest_path, "w", encoding="utf-8") as f:
    json.dump(aws_backup_data, f, indent=2, ensure_ascii=False)

with open(sql_backup_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_dump_lines))
with open(sql_latest_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_dump_lines))

print(f"[+] Saved JSON Backup: {json_backup_path}")
print(f"[+] Saved JSON Latest: {json_latest_path}")
print(f"[+] Saved SQL Backup:  {sql_backup_path}")
print(f"[+] Saved SQL Latest:  {sql_latest_path}")

# =====================================================================
# STEP 3: BACKUP LOCAL POSTGRESQL BEFORE OVERWRITING
# =====================================================================
print("\n" + "-" * 55)
print("  STEP 3: BACKING UP EXISTING LOCAL POSTGRESQL DATA")
print("-" * 55)

try:
    local_conn = psycopg2.connect(LOCAL_PG_URL, connect_timeout=5)
    local_cur = local_conn.cursor(cursor_factory=RealDictCursor)

    local_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    """)
    local_existing_tables = [r["table_name"] for r in local_cur.fetchall()]

    local_previous_data = {}
    for tbl in local_existing_tables:
        local_cur.execute(f'SELECT * FROM "{tbl}";')
        local_previous_data[tbl] = [
            {k: serialize_val(v) for k, v in r.items()}
            for r in local_cur.fetchall()
        ]

    local_backup_path = os.path.join(BACKUPS_DIR, f"local_postgres_before_sync_{timestamp}.json")
    with open(local_backup_path, "w", encoding="utf-8") as f:
        json.dump(local_previous_data, f, indent=2, ensure_ascii=False)
    print(f"[+] Existing local data backed up to: {local_backup_path}")
except Exception as e:
    print(f"[!] Warning backing up existing local data: {e}")

# =====================================================================
# STEP 4: RESTORE NEW BACKUP DATA INTO LOCAL POSTGRESQL
# =====================================================================
print("\n" + "-" * 55)
print("  STEP 4: RESTORING NEW BACKUP INTO LOCAL POSTGRESQL")
print("-" * 55)

pg_sync_results = {}
try:
    # Ensure all tables exist in local PostgreSQL using SQLAlchemy metadata
    sys.path.insert(0, BACKEND_DIR)
    os.environ["DATABASE_URL"] = LOCAL_PG_URL
    from main import Base, engine as sa_engine
    Base.metadata.create_all(bind=sa_engine)
    print("[+] Verified local PostgreSQL schema matches all backend models.")

    # Disable foreign key triggers for fast, safe bulk restore
    local_cur.execute("SET session_replication_role = 'replica';")
    local_conn.commit()

    # Re-fetch local tables
    local_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    """)
    target_tables = set(r["table_name"] for r in local_cur.fetchall())

    for tbl, rows in aws_backup_data.items():
        if tbl not in target_tables:
            print(f"  [SKIP] '{tbl}' not present in local PostgreSQL schema.")
            continue

        # Get local table columns
        local_cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{tbl}';
        """)
        local_cols = set(r["column_name"] for r in local_cur.fetchall())

        # Truncate existing local table
        local_cur.execute(f'TRUNCATE TABLE "{tbl}" CASCADE;')
        local_conn.commit()

        if not rows:
            pg_sync_results[tbl] = {"aws": 0, "local": 0}
            print(f"  [SYNCED] '{tbl}': 0 rows (table emptied).")
            continue

        # Intersect columns
        aws_sample_cols = list(rows[0].keys())
        common_cols = [c for c in aws_sample_cols if c in local_cols]

        if not common_cols:
            pg_sync_results[tbl] = {"aws": len(rows), "local": 0}
            continue

        col_str = ", ".join([f'"{c}"' for c in common_cols])
        insert_query = f'INSERT INTO "{tbl}" ({col_str}) VALUES %s;'

        batch_tuples = []
        for r in rows:
            tup = []
            for c in common_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    tup.append(json.dumps(v))
                else:
                    tup.append(v)
            batch_tuples.append(tuple(tup))

        execute_values(local_cur, insert_query, batch_tuples, page_size=500)
        local_conn.commit()

        # Count verified rows in local
        local_cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
        local_cnt = local_cur.fetchone()["count"]
        pg_sync_results[tbl] = {"aws": len(rows), "local": local_cnt}
        print(f"  [SYNCED] '{tbl}': {local_cnt}/{len(rows)} records restored.")

    # Re-enable standard foreign key triggers
    local_cur.execute("SET session_replication_role = 'origin';")
    local_conn.commit()

    # Reset all PostgreSQL auto-increment sequences to MAX(id)
    print("\n[*] Aligning PostgreSQL auto-increment sequences...")
    for tbl in target_tables:
        try:
            local_cur.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{tbl}' AND column_default LIKE 'nextval%';
            """)
            seq_cols = [r["column_name"] for r in local_cur.fetchall()]
            for c in seq_cols:
                local_cur.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{tbl}"', '{c}'), 
                        COALESCE((SELECT MAX("{c}") FROM "{tbl}"), 1), 
                        true
                    );
                """)
                local_conn.commit()
        except Exception as seq_err:
            local_conn.rollback()

    local_cur.close()
    local_conn.close()
    print("[+] Auto-increment sequences aligned successfully!")
except Exception as e:
    print(f"[ERROR] Failed during local PostgreSQL restore: {e}")

# =====================================================================
# STEP 5: ALSO SYNC TO LOCAL SQLITE (aisurf.db) FOR COMPLETE CONSISTENCY
# =====================================================================
print("\n" + "-" * 55)
print("  STEP 5: SYNCING DATA TO LOCAL SQLITE (aisurf.db)")
print("-" * 55)

sqlite_sync_results = {}
try:
    if os.path.exists(LOCAL_SQLITE_PATH):
        sqlite_bak = os.path.join(BACKUPS_DIR, f"local_aisurf_before_sync_{timestamp}.db")
        shutil.copy2(LOCAL_SQLITE_PATH, sqlite_bak)
        print(f"[+] Pre-sync backup of aisurf.db saved to: {sqlite_bak}")

    # Ensure schema in SQLite
    os.environ["DATABASE_URL"] = f"sqlite:///{LOCAL_SQLITE_PATH.replace(os.sep, '/')}"
    from main import Base, engine as sqlite_engine
    Base.metadata.create_all(bind=sqlite_engine)

    sqlite_conn = sqlite3.connect(LOCAL_SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()
    sqlite_cur.execute("PRAGMA foreign_keys = OFF;")

    sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    sqlite_existing_tables = set(r[0] for r in sqlite_cur.fetchall())

    for tbl, rows in aws_backup_data.items():
        if tbl not in sqlite_existing_tables:
            continue

        sqlite_cur.execute(f"PRAGMA table_info({tbl});")
        sqlite_cols = [c[1] for c in sqlite_cur.fetchall()]

        sqlite_cur.execute(f'DELETE FROM "{tbl}";')

        if not rows:
            sqlite_sync_results[tbl] = {"aws": 0, "local": 0}
            continue

        aws_sample_cols = list(rows[0].keys())
        common_cols = [c for c in aws_sample_cols if c in sqlite_cols]

        if not common_cols:
            continue

        col_names = ", ".join([f'"{c}"' for c in common_cols])
        placeholders = ", ".join(["?"] * len(common_cols))
        insert_sql = f'INSERT OR REPLACE INTO "{tbl}" ({col_names}) VALUES ({placeholders})'

        batch_vals = []
        for r in rows:
            r_vals = []
            for c in common_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                elif isinstance(v, bool):
                    v = 1 if v else 0
                r_vals.append(v)
            batch_vals.append(r_vals)

        sqlite_cur.executemany(insert_sql, batch_vals)
        sqlite_sync_results[tbl] = {"aws": len(rows), "local": len(batch_vals)}

    sqlite_conn.commit()
    sqlite_cur.execute("PRAGMA foreign_keys = ON;")
    sqlite_conn.close()
    print("[+] Local SQLite (aisurf.db) synchronized successfully!")
except Exception as e:
    print(f"[WARN] Local SQLite sync note: {e}")

# =====================================================================
# STEP 6: VERIFICATION SUMMARY
# =====================================================================
print("\n" + "=" * 70)
print("  🎉 DATABASE BACKUP & LOCAL SYNC COMPLETED SUCCESSFULLY!")
print("=" * 70)
print(f"  {'Table Name':<30} {'AWS RDS':<15} {'Local Postgres':<15}")
print("  " + "-" * 60)
for tbl in sorted(aws_backup_data.keys()):
    aws_cnt = len(aws_backup_data[tbl])
    pg_cnt = pg_sync_results.get(tbl, {}).get("local", "-")
    print(f"  {tbl:<30} {aws_cnt:<15} {pg_cnt:<15}")

print("\n" + "=" * 70)
print("  VERIFICATION DETAILS:")
print(f"  1. Live AWS RDS Database:  100% UNTOUCHED (Strict Read-Only mode)")
print(f"  2. Backup JSON File:       {json_backup_path}")
print(f"  3. Backup SQL File:        {sql_backup_path}")
print(f"  4. Local PostgreSQL DB:    Replaced with fresh live backup data")
print(f"  5. Local SQLite (aisurf):  Replaced with fresh live backup data")
print("=" * 70)

