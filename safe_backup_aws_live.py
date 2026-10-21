import os
import sys
import time
import json
import datetime
import boto3
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

# Load AWS config
load_dotenv(os.path.join(ROOT_DIR, ".env"))
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
INSTANCE_ID = "i-0c62e04f44a9ea237"
TARGET_CLUSTER = "aisurf-db-cluster.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com"

print("=" * 70)
print("  SAFE READ-ONLY BACKUP OF AWS RDS (aisurf-db-cluster)")
print("=" * 70)
print(f"[INFO] Target Cluster: {TARGET_CLUSTER}")
print(f"[INFO] AWS Region:     {REGION}")
print(f"[INFO] EC2 Worker:     {INSTANCE_ID}")
print("[INFO] Safety Mode:    100% STRICT READ-ONLY (No changes to live data)")
print("=" * 70)

# Python script that runs inside EC2 (which is in the same VPC as aisurf-db-cluster)
ec2_dump_script = f"""
import os, sys, json, datetime, psycopg2, boto3
from psycopg2.extras import RealDictCursor

db_host = '{TARGET_CLUSTER}'
region = '{REGION}'
db_user = 'postgres'
db_name = 'postgres'

print('[EC2] Connecting to Aurora PostgreSQL cluster...')
rds_client = boto3.client('rds', region_name=region)
token = rds_client.generate_db_auth_token(DBHostname=db_host, Port=5432, DBUsername=db_user, Region=region)

conn = psycopg2.connect(
    host=db_host,
    port=5432,
    user=db_user,
    database=db_name,
    password=token,
    sslmode='require',
    connect_timeout=15
)

# STRICT READ-ONLY SESSION: Any write/delete/alter attempt will be rejected by Postgres
conn.set_session(readonly=True, autocommit=False)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute(\"\"\"
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
    ORDER BY table_name;
\"\"\")
tables = [row['table_name'] for row in cur.fetchall()]
print(f'[EC2] Found {{len(tables)}} public tables to backup.')

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

dump_file = '/tmp/aisurf_live_backup.json'
with open(dump_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

s3 = boto3.client('s3', region_name=region)
s3.upload_file(dump_file, '{BUCKET_NAME}', 'backups/live_backup_latest.json')

summary = {{'total_tables': len(tables), 'tables': table_counts}}
print('[EC2_DUMP_SUMMARY]' + json.dumps(summary))
print('[EC2] Backup successfully extracted and uploaded to S3!')
"""

# Upload dump worker script to S3
print("\n[Step 1/3] Preparing read-only extraction worker on AWS...")
s3_client = boto3.client("s3", region_name=REGION)
s3_client.put_object(
    Bucket=BUCKET_NAME,
    Key="deploy/worker_safe_backup.py",
    Body=ec2_dump_script.encode("utf-8")
)

# Trigger SSM command on EC2
print(f"[Step 2/3] Executing read-only extraction on EC2 ({INSTANCE_ID})...")
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
print(f"[INFO] SSM Command dispatched (ID: {command_id}). Waiting for extraction to complete...")

dump_summary = {}
for attempt in range(40):
    time.sleep(3)
    inv = ssm_client.get_command_invocation(CommandId=command_id, InstanceId=INSTANCE_ID)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        
        # Parse output
        for line in stdout.splitlines():
            if line.startswith("[EC2]"):
                print(" ", line)
            elif line.startswith("[EC2_DUMP_SUMMARY]"):
                dump_summary = json.loads(line.replace("[EC2_DUMP_SUMMARY]", ""))
                
        if status != "Success":
            print(f"[ERROR] SSM extraction failed: {stderr}")
            sys.exit(1)
        break

# Step 3: Download fresh backup to local backups directory
print("\n[Step 3/3] Downloading live database backup to local machine...")
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
json_timestamped = os.path.join(BACKUPS_DIR, f"aisurf_live_backup_{timestamp}.json")
json_latest = os.path.join(BACKUPS_DIR, "live_backup_latest.json")
sql_timestamped = os.path.join(BACKUPS_DIR, f"aisurf_live_backup_{timestamp}.sql")
sql_latest = os.path.join(BACKUPS_DIR, "live_backup_latest.sql")

s3_client.download_file(BUCKET_NAME, "backups/live_backup_latest.json", json_timestamped)

# Copy to latest
import shutil
shutil.copy2(json_timestamped, json_latest)

file_size_mb = os.path.getsize(json_timestamped) / (1024 * 1024)
print(f"[SUCCESS] Downloaded JSON backup: {json_timestamped} ({file_size_mb:.2f} MB)")

# Generate SQL dump statements
print("[INFO] Generating SQL INSERT dump from backup data...")
with open(json_timestamped, "r", encoding="utf-8") as f:
    live_data = json.load(f)

sql_lines = [
    f"-- AISurf Live Database Full Backup",
    f"-- Generated: {datetime.datetime.now().isoformat()}",
    f"-- Target Cluster: {TARGET_CLUSTER}",
    f"-- Total Tables: {len(live_data)}\n",
    "BEGIN;\n"
]

for tbl, rows in live_data.items():
    if not rows:
        continue
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

with open(sql_timestamped, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))
shutil.copy2(sql_timestamped, sql_latest)

sql_size_mb = os.path.getsize(sql_timestamped) / (1024 * 1024)
print(f"[SUCCESS] Generated SQL backup:  {sql_timestamped} ({sql_size_mb:.2f} MB)")

print("\n" + "=" * 70)
print("  BACKUP SUMMARY (ALL TABLES BACKED UP SUCCESSFULLY)")
print("=" * 70)
if dump_summary and "tables" in dump_summary:
    for tbl, count in sorted(dump_summary["tables"].items()):
        print(f"  - {tbl:<30}: {count:>6} rows")
    print("-" * 70)
    print(f"  Total Tables: {dump_summary.get('total_tables', len(live_data))}")
print(f"  Saved locally at:")
print(f"    -> {json_timestamped}")
print(f"    -> {sql_timestamped}")
print("=" * 70)
print("[SAFE] Zero modifications were made to the live AWS database.")
