import os
import sys
import time
import json
import boto3
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

LOCAL_BACKUP_JSON = os.path.join(BACKUPS_DIR, "live_backup_latest.json")

load_dotenv(os.path.join(ROOT_DIR, ".env"))
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
INSTANCE_ID = "i-0c62e04f44a9ea237"

print("=" * 65)
print("  STEP 1: DUMP FRESH LIVE DATABASE ON AWS EC2 VIA SSM")
print("=" * 65)

ec2_dump_script = """
import os, sys, json, datetime, psycopg2, boto3
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv('/home/ec2-user/backend/.env')
db_host = 'aisurf-db-cluster.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com'
region = 'us-east-1'

rds_client = boto3.client('rds', region_name=region)
token = rds_client.generate_db_auth_token(DBHostname=db_host, Port=5432, DBUsername='postgres', Region=region)
conn = psycopg2.connect(host=db_host, port=5432, user='postgres', database='postgres', password=token, sslmode='require')
conn.set_session(readonly=True)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;")
tables = [row['table_name'] for row in cur.fetchall()]

def serialize_val(val):
    if isinstance(val, (datetime.date, datetime.datetime, datetime.time)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    return val

data = {}
for tbl in tables:
    cur.execute(f'SELECT * FROM "{tbl}";')
    rows = cur.fetchall()
    data[tbl] = [{k: serialize_val(v) for k, v in r.items()} for r in rows]

with open('/tmp/live_backup_latest.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

s3 = boto3.client('s3', region_name=region)
s3.upload_file('/tmp/live_backup_latest.json', 'aisurf-media-uploads-149051628601', 'backups/live_backup_latest.json')
print(f'Successfully dumped {len(tables)} tables to S3!')
"""

s3_client = boto3.client("s3", region_name=REGION)
s3_client.put_object(
    Bucket=BUCKET_NAME,
    Key="deploy/worker_dump.py",
    Body=ec2_dump_script.encode("utf-8")
)
print("[OK] Uploaded dump worker to S3.")

ssm_client = boto3.client("ssm", region_name=REGION)
ssm_response = ssm_client.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName="AWS-RunShellScript",
    Parameters={
        "commands": [
            f"aws s3 cp s3://{BUCKET_NAME}/deploy/worker_dump.py /home/ec2-user/worker_dump.py",
            "sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python /home/ec2-user/worker_dump.py"
        ]
    }
)
command_id = ssm_response["Command"]["CommandId"]
print(f"[OK] SSM Dump command sent! ID: {command_id}")

print("Waiting for EC2 to export live database...")
for attempt in range(20):
    time.sleep(3)
    inv = ssm_client.get_command_invocation(CommandId=command_id, InstanceId=INSTANCE_ID)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        if stdout:
            print(f"[EC2 Output]: {stdout}")
        if status != "Success":
            print(f"[ERROR] SSM dump failed: {stderr}")
            sys.exit(1)
        break

print("\n" + "=" * 65)
print("  STEP 2: DOWNLOAD FRESH LIVE BACKUP FROM AWS S3")
print("=" * 65)
s3_client.download_file(BUCKET_NAME, "backups/live_backup_latest.json", LOCAL_BACKUP_JSON)
file_size_kb = os.path.getsize(LOCAL_BACKUP_JSON) / 1024
print(f"[OK] Downloaded fresh live backup: {LOCAL_BACKUP_JSON} ({file_size_kb:.2f} KB)")

print("\n" + "=" * 65)
print("  STEP 3: RESTORE INTO LOCAL POSTGRESQL (surfing_db)")
print("=" * 65)

with open(LOCAL_BACKUP_JSON, "r", encoding="utf-8") as f:
    live_data = json.load(f)

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

# Bypass FK constraint checks for bulk import
local_cur.execute("SET session_replication_role = 'replica';")

local_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
existing_tables = set(r[0] for r in local_cur.fetchall())

# Truncate all target tables once before inserting
for table_name in live_data.keys():
    if table_name in existing_tables:
        try:
            local_cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
        except Exception:
            pass

synced_count = 0
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
        synced_count += 1
        print(f"  [OK] '{table_name}': {len(rows)} live rows loaded")
    except Exception as e:
        print(f"  [ERROR] '{table_name}': {e}")

local_cur.execute("SET session_replication_role = 'origin';")

# Verify Dapoli
try:
    local_cur.execute("UPDATE schools SET city = 'Dapoli, Maharashtra', country = '' WHERE name ILIKE '%Dapoli%' OR id = 22;")
    local_cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'instructors';")
    inst_cols = [r[0] for r in local_cur.fetchall()]
    if "school" in inst_cols:
        local_cur.execute("UPDATE instructors SET location = 'Dapoli, Maharashtra' WHERE school ILIKE '%Dapoli%';")
    elif "school_name" in inst_cols:
        local_cur.execute("UPDATE instructors SET location = 'Dapoli, Maharashtra' WHERE school_name ILIKE '%Dapoli%';")
except Exception as e:
    pass

print("\n" + "=" * 65)
print("  STEP 4: VERIFICATION & SUMMARY")
print("=" * 65)
for t in ["users", "schools", "instructors", "students", "sessions", "events", "heats", "scores"]:
    local_cur.execute(f"SELECT count(*) FROM {t};")
    print(f"  -> Total {t.capitalize()}: {local_cur.fetchone()[0]}")

local_cur.execute("SELECT id, name, city FROM schools WHERE name ILIKE '%Dapoli%' OR id = 22;")
print(f"  -> Dapoli School: {local_cur.fetchall()}")

local_cur.close()
local_conn.close()

print("\n" + "=" * 65)
print("  [ALL COMPLETE] Live AWS data successfully pulled & set as local database!")
print("=" * 65)
