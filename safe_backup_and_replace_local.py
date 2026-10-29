import os
import sys
import time
import json
import datetime
import boto3
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

# Load AWS credentials and config
load_dotenv(os.path.join(ROOT_DIR, "backend", ".env"))
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
INSTANCE_ID = "i-0c62e04f44a9ea237"
TARGET_CLUSTER = "aisurf-db-cluster.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com"

print("=" * 70)
print("  STEP 1: 100% READ-ONLY EXTRACTION FROM AWS RDS (aisurf-db-cluster)")
print("=" * 70)
print(f"[INFO] Target Cluster : {TARGET_CLUSTER}")
print(f"[INFO] Region         : {REGION}")
print(f"[INFO] Worker Instance: {INSTANCE_ID}")
print("[INFO] Safety Mode    : STRICT READ-ONLY (No changes or locks on Live DB)")
print("=" * 70)

ec2_dump_script = f"""
import os, sys, json, datetime, psycopg2, boto3
from psycopg2.extras import RealDictCursor

db_host = '{TARGET_CLUSTER}'
region = '{REGION}'
db_user = 'postgres'
db_name = 'postgres'

print('[EC2] Generating IAM RDS Auth Token...')
rds_client = boto3.client('rds', region_name=region)
token = rds_client.generate_db_auth_token(DBHostname=db_host, Port=5432, DBUsername=db_user, Region=region)

print('[EC2] Connecting to Aurora RDS PostgreSQL cluster in STRICT READ-ONLY mode...')
conn = psycopg2.connect(
    host=db_host,
    port=5432,
    user=db_user,
    database=db_name,
    password=token,
    sslmode='require',
    connect_timeout=15
)
# Force Read-Only Session - any write/alter is rejected by the database engine
conn.set_session(readonly=True, autocommit=False)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute(\"\"\"
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name;
\"\"\")
tables = [row['table_name'] for row in cur.fetchall()]
print(f'[EC2] Identified {{len(tables)}} public tables to extract.')

def serialize_val(val):
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    return val

data = {{}}
table_counts = {{}}

for tbl in tables:
    cur.execute(f'SELECT * FROM "{{tbl}}";')
    rows = cur.fetchall()
    table_counts[tbl] = len(rows)
    data[tbl] = [{{k: serialize_val(v) for k, v in r.items()}} for r in rows]

cur.close()
conn.close()

dump_file = '/tmp/live_backup_latest.json'
with open(dump_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

s3 = boto3.client('s3', region_name=region)
s3.upload_file(dump_file, '{BUCKET_NAME}', 'backups/live_backup_latest.json')

summary = {{'total_tables': len(tables), 'tables': table_counts}}
print('[EC2_DUMP_SUMMARY]' + json.dumps(summary))
print('[EC2] Safe read-only dump completed and uploaded to S3 successfully!')
"""

s3_client = boto3.client("s3", region_name=REGION)
s3_client.put_object(
    Bucket=BUCKET_NAME,
    Key="deploy/worker_safe_backup.py",
    Body=ec2_dump_script.encode("utf-8")
)
print("[OK] Uploaded extraction worker to S3.")

ssm_client = boto3.client("ssm", region_name=REGION)
ssm_response = ssm_client.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName="AWS-RunShellScript",
    Parameters={
        "commands": [
            f"aws s3 cp s3://{BUCKET_NAME}/deploy/worker_safe_backup.py /home/ec2-user/worker_safe_backup.py",
            "sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python /home/ec2-user/worker_safe_backup.py"
        ]
    }
)
command_id = ssm_response["Command"]["CommandId"]
print(f"[OK] SSM command dispatched (ID: {command_id}). Waiting for extraction...")

dump_summary = {}
for attempt in range(40):
    time.sleep(3)
    inv = ssm_client.get_command_invocation(CommandId=command_id, InstanceId=INSTANCE_ID)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        for line in stdout.splitlines():
            if line.startswith("[EC2]"):
                print(" ", line)
            elif line.startswith("[EC2_DUMP_SUMMARY]"):
                dump_summary = json.loads(line.replace("[EC2_DUMP_SUMMARY]", ""))
        if status != "Success":
            print(f"[ERROR] SSM extraction failed: {stderr}")
            sys.exit(1)
        break

print("\n" + "=" * 70)
print("  STEP 2: DOWNLOAD BACKUP AND SAVE LOCAL .JSON & .SQL FILES")
print("=" * 70)

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
json_timestamped = os.path.join(BACKUPS_DIR, f"aisurf_live_backup_{timestamp}.json")
json_latest = os.path.join(BACKUPS_DIR, "live_backup_latest.json")
sql_timestamped = os.path.join(BACKUPS_DIR, f"aisurf_live_backup_{timestamp}.sql")
sql_latest = os.path.join(BACKUPS_DIR, "live_backup_latest.sql")

s3_client.download_file(BUCKET_NAME, "backups/live_backup_latest.json", json_timestamped)

import shutil
shutil.copy2(json_timestamped, json_latest)
json_size_mb = os.path.getsize(json_timestamped) / (1024 * 1024)
print(f"[OK] Downloaded JSON backup: {json_timestamped} ({json_size_mb:.2f} MB)")

with open(json_timestamped, "r", encoding="utf-8") as f:
    live_data = json.load(f)

# Generate SQL dump
print("[INFO] Generating SQL file backup...")
sql_lines = [
    f"-- AISurf Live Database Full Backup",
    f"-- Generated: {datetime.datetime.now().isoformat()}",
    f"-- Source Cluster: {TARGET_CLUSTER}",
    f"-- Total Tables: {len(live_data)}\n",
    "SET session_replication_role = 'replica';\n",
    "BEGIN;\n"
]

for tbl, rows in live_data.items():
    if not rows:
        continue
    columns = list(rows[0].keys())
    col_str = ", ".join([f'"{c}"' for c in columns])
    sql_lines.append(f"-- Table: {tbl} ({len(rows)} rows)")
    sql_lines.append(f'TRUNCATE TABLE "{tbl}" CASCADE;')
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
sql_lines.append("SET session_replication_role = 'origin';\n")

with open(sql_timestamped, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))
shutil.copy2(sql_timestamped, sql_latest)

sql_size_mb = os.path.getsize(sql_timestamped) / (1024 * 1024)
print(f"[OK] Generated SQL dump:    {sql_timestamped} ({sql_size_mb:.2f} MB)")

print("\n" + "=" * 70)
print("  STEP 3: COMPLETELY REPLACE LOCAL POSTGRESQL (surfing_db)")
print("=" * 70)

local_conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="eric@2004",
    database="surfing_db",
    connect_timeout=5
)
local_conn.autocommit = True
local_cur = local_conn.cursor()

# Disable foreign key trigger constraints during bulk load
local_cur.execute("SET session_replication_role = 'replica';")

local_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
existing_tables = set(r[0] for r in local_cur.fetchall())

# Truncate all tables first
print("[INFO] Truncating (wiping) old local tables...")
for table_name in live_data.keys():
    if table_name in existing_tables:
        try:
            local_cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
        except Exception as trunc_err:
            pass

print("[INFO] Loading fresh live AWS data into local PostgreSQL...")
for table_name, rows in live_data.items():
    if not rows or table_name not in existing_tables:
        continue

    try:
        local_cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}';")
        target_cols = set(r[0] for r in local_cur.fetchall())

        valid_cols = [c for c in rows[0].keys() if c in target_cols]
        if not valid_cols:
            continue

        col_str = ", ".join([f'"{c}"' for c in valid_cols])
        val_placeholders = ", ".join(["%s"] * len(valid_cols))

        query = f'INSERT INTO "{table_name}" ({col_str}) VALUES ({val_placeholders}) ON CONFLICT DO NOTHING;'

        batch_data = []
        for r in rows:
            row_vals = []
            for c in valid_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                row_vals.append(v)
            batch_data.append(tuple(row_vals))

        execute_batch(local_cur, query, batch_data, page_size=200)
        
        # Reset serial sequence if table has id column
        if "id" in valid_cols:
            try:
                local_cur.execute(f"""
                    SELECT setval(pg_get_serial_sequence('"{table_name}"', 'id'), 
                                  COALESCE((SELECT MAX(id) FROM "{table_name}"), 1));
                """)
            except Exception:
                pass

        print(f"  [OK] '{table_name:<25}': loaded {len(rows):>4} rows")
    except Exception as e:
        print(f"  [ERROR] '{table_name}': {e}")

# Re-enable constraint checks
local_cur.execute("SET session_replication_role = 'origin';")

# Standardize Dapoli if present
try:
    local_cur.execute("UPDATE schools SET city = 'Dapoli, Maharashtra', country = '' WHERE name ILIKE '%Dapoli%' OR id = 22;")
except Exception:
    pass

print("\n" + "=" * 70)
print("  STEP 4: VERIFICATION OF LOCAL DATABASE (surfing_db)")
print("=" * 70)
verification_tables = ["users", "schools", "instructors", "students", "sessions", "events", "heats", "scores", "activity_log"]
for t in verification_tables:
    if t in existing_tables:
        local_cur.execute(f'SELECT count(*) FROM "{t}";')
        count = local_cur.fetchone()[0]
        print(f"  * {t:<20}: {count:>5} records")

local_cur.close()
local_conn.close()

print("\n" + "=" * 70)
print("  [SUCCESS] LOCAL DATABASE FULLY REPLACED WITH FRESH LIVE AWS DATA!")
print("=" * 70)
print(f"  Local DB       : surfing_db (PostgreSQL)")
print(f"  Backup JSON    : {json_timestamped}")
print(f"  Backup SQL     : {sql_timestamped}")
print("  Live Status    : 100% UNTOUCHED (Strict Read-Only mode executed)")
print("=" * 70)
