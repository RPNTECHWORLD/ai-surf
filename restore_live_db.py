import os
import sys
import json
from urllib.parse import urlparse
import psycopg2
import boto3
from dotenv import load_dotenv

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

backup_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups", "rds_backup_latest.json")

if not os.path.exists(backup_file):
    print(f"[ERROR] Backup file not found at: {backup_file}")
    sys.exit(1)

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
cursor = conn.cursor()

print(f"[INFO] Reading backup from {backup_file}...")
with open(backup_file, "r", encoding="utf-8") as f:
    backup_data = json.load(f)

print(f"[INFO] Restoring {len(backup_data)} tables...")

for tbl, rows in backup_data.items():
    if not rows:
        continue
    cols = list(rows[0].keys())
    col_str = ", ".join([f'"{c}"' for c in cols])
    placeholders = ", ".join(["%s"] * len(cols))
    query = f'INSERT INTO "{tbl}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'

    values_list = []
    for r in rows:
        val_row = []
        for c in cols:
            v = r[c]
            if isinstance(v, (dict, list)):
                val_row.append(json.dumps(v))
            else:
                val_row.append(v)
        values_list.append(tuple(val_row))

    try:
        from psycopg2.extras import execute_batch
        execute_batch(cursor, query, values_list, page_size=200)
        conn.commit()
        print(f"  [OK] Restored table '{tbl}': {len(rows)} records processed.")
    except Exception as e:
        conn.rollback()
        print(f"  [WARN] Table '{tbl}' restore note: {e}")

cursor.close()
conn.close()
print("\n[SUCCESS] Database restore process completed!")
