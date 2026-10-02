import os
import sys
import json
import datetime
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3
from dotenv import load_dotenv

# Ensure we read environment variables
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("[ERROR] DATABASE_URL not found in backend/.env")
    sys.exit(1)

parsed = urlparse(db_url)
db_host = parsed.hostname
db_port = parsed.port or 5432
db_user = parsed.username or "postgres"
db_name = parsed.path.lstrip("/")
region = os.getenv("AWS_REGION", "us-east-1")

print(f"[INFO] Connecting to AWS RDS PostgreSQL at {db_host}...")
rds_client = boto3.client("rds", region_name=region)
token = rds_client.generate_db_auth_token(
    DBHostname=db_host, Port=db_port, DBUsername=db_user, Region=region
)

conn = psycopg2.connect(
    host=db_host,
    port=db_port,
    user=db_user,
    database=db_name,
    password=token,
    sslmode="require"
)
cursor = conn.cursor(cursor_factory=RealDictCursor)

backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
os.makedirs(backup_dir, exist_ok=True)

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
json_backup_path = os.path.join(backup_dir, f"rds_backup_{timestamp}.json")
json_latest_path = os.path.join(backup_dir, "rds_backup_latest.json")
sql_backup_path = os.path.join(backup_dir, f"rds_backup_{timestamp}.sql")
sql_latest_path = os.path.join(backup_dir, "rds_backup_latest.sql")

cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
""")
tables = [row["table_name"] for row in cursor.fetchall()]

full_backup_data = {}
sql_lines = [
    f"-- AthnexLive / AISurf Database Full Backup",
    f"-- Generated: {datetime.datetime.now().isoformat()}",
    f"-- Host: {db_host} / Database: {db_name}\n",
    "BEGIN;\n"
]

print(f"[INFO] Found {len(tables)} tables to backup.")

for tbl in tables:
    cursor.execute(f'SELECT * FROM "{tbl}";')
    rows = cursor.fetchall()
    
    # Custom serializer for dates and complex types
    def serialize_val(val):
        if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
            return val.isoformat()
        if isinstance(val, bytes):
            return val.decode("utf-8", errors="replace")
        return val

    serialized_rows = [
        {k: serialize_val(v) for k, v in row.items()}
        for row in rows
    ]
    full_backup_data[tbl] = serialized_rows
    print(f"  [OK] Backed up table '{tbl}': {len(rows)} rows")

    # Generate SQL INSERT statements
    if rows:
        columns = list(rows[0].keys())
        col_str = ", ".join([f'"{c}"' for c in columns])
        sql_lines.append(f"-- Table: {tbl} ({len(rows)} rows)")
        for row in rows:
            val_strs = []
            for c in columns:
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
                    escaped_json = json.dumps(v).replace("'", "''")
                    val_strs.append(f"'{escaped_json}'")
                else:
                    escaped_str = str(v).replace("'", "''")
                    val_strs.append(f"'{escaped_str}'")
            vals_str = ", ".join(val_strs)
            sql_lines.append(f'INSERT INTO "{tbl}" ({col_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;')
        sql_lines.append("")

sql_lines.append("COMMIT;\n")

# Save JSON backup
with open(json_backup_path, "w", encoding="utf-8") as f:
    json.dump(full_backup_data, f, indent=2, ensure_ascii=False)

with open(json_latest_path, "w", encoding="utf-8") as f:
    json.dump(full_backup_data, f, indent=2, ensure_ascii=False)

# Save SQL backup
with open(sql_backup_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

with open(sql_latest_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

cursor.close()
conn.close()

print(f"\n[SUCCESS] Live Database Backup Completed Successfully!")
print(f"  -> JSON Backup: {json_backup_path}")
print(f"  -> JSON Latest: {json_latest_path}")
print(f"  -> SQL Backup:  {sql_backup_path}")
print(f"  -> SQL Latest:  {sql_latest_path}")
