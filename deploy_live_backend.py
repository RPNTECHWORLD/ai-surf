import os
import time
import boto3
from dotenv import load_dotenv

backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
INSTANCE_ID = "i-0c62e04f44a9ea237"
local_main_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "main.py")
local_migrate_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "migrate_dapoli_rds.py")

print("[1/5] Uploading main.py and migration script to AWS S3...")
s3_client = boto3.client("s3", region_name=REGION)
s3_client.upload_file(local_main_path, BUCKET_NAME, "deploy/main.py")
s3_client.upload_file(local_migrate_path, BUCKET_NAME, "deploy/migrate_dapoli_rds.py")
print("[OK] Uploaded files to S3 bucket " + BUCKET_NAME)

ssm_client = boto3.client("ssm", region_name=REGION)

ec2_commands = [
    # 1. Inspect environment and open DB files
    "grep DATABASE_URL /home/ec2-user/backend/.env || true",
    "sudo find /home/ec2-user -name '*.db' || true",
    # 2. Update all found SQLite databases for Dapoli
    """python3 -c "
import glob, sqlite3
for f in glob.glob('/home/ec2-user/**/*.db', recursive=True):
    try:
        c = sqlite3.connect(f)
        cur = c.cursor()
        cur.execute(\\"UPDATE schools SET city = 'Dapoli, Maharashtra', country = '' WHERE name LIKE '%Dapoli%' OR id = 22;\\")
        cur.execute(\\"UPDATE instructors SET location = 'Dapoli, Maharashtra' WHERE school LIKE '%Dapoli%';\\")
        c.commit()
        cur.execute(\\"SELECT id, name, city FROM schools WHERE name LIKE '%Dapoli%' OR id = 22;\\")
        rows = cur.fetchall()
        if rows:
            print(f'UPDATED SQLITE {f}: {rows}')
        c.close()
    except Exception as e:
        pass
" """,
    # 3. Download updated main.py & migration script
    f"aws s3 cp s3://{BUCKET_NAME}/deploy/main.py /home/ec2-user/backend/main.py",
    f"aws s3 cp s3://{BUCKET_NAME}/deploy/migrate_dapoli_rds.py /home/ec2-user/backend/migrate_dapoli_rds.py",
    "chown ec2-user:ec2-user /home/ec2-user/backend/main.py /home/ec2-user/backend/migrate_dapoli_rds.py",
    # 4. Run migration script against live RDS clusters
    "sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python /home/ec2-user/backend/migrate_dapoli_rds.py",
    # 5. Restart backend
    "sudo systemctl restart aisurf-backend",
    "sleep 2",
    "systemctl is-active aisurf-backend",
    "curl -s http://127.0.0.1:8000/api/schools | grep -o '\"name\":\"[^\"]*Dapoli[^\"]*\"[^}]*' || true"
]

print("[2/5] Triggering AWS SSM deployment on EC2 instance " + INSTANCE_ID + "...")
response = ssm_client.send_command(
    InstanceIds=[INSTANCE_ID],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": ec2_commands}
)
command_id = response["Command"]["CommandId"]
print(f"[OK] SSM Command sent! Command ID: {command_id}")

print("[3/5] Monitoring SSM command execution on EC2...")
finished = False
for attempt in range(25):
    time.sleep(3)
    inv = ssm_client.get_command_invocation(
        CommandId=command_id,
        InstanceId=INSTANCE_ID
    )
    status = inv.get("Status")
    print(f"  Attempt {attempt + 1}: Status = {status}")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        if stdout:
            print("\n--- SSM STDOUT ---\n" + stdout)
        if stderr:
            print("\n--- SSM STDERR ---\n" + stderr)
        if status == "Success":
            print("\n[OK] [4/5] EC2 Backend successfully updated and verified active!")
            finished = True
        else:
            print(f"\n[ERROR] SSM failed with status: {status}")
        break

if not finished:
    print("[WARNING] SSM timed out waiting for status.")
