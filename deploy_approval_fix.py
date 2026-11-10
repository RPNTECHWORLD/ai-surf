import os
import sys
sys.path.insert(0, r"d:\surfing\ai\.venv\Lib\site-packages")
import time
import zipfile
import boto3
from dotenv import load_dotenv

# Load env variables
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
BACKEND_INSTANCE_ID = "i-0c62e04f44a9ea237"
FRONTEND_INSTANCE_ID = "i-02999b6093bc5bfd2"

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_MAIN = os.path.join(ROOT_DIR, "backend", "main.py")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
ZIP_PATH = os.path.join(ROOT_DIR, "aisurf-frontend.zip")

print("=" * 60)
print("  DEPLOYING SCHOOL ADMIN AUTO-APPROVAL FIX TO AWS")
print("=" * 60)

s3 = boto3.client("s3", region_name=REGION)
ssm = boto3.client("ssm", region_name=REGION)

# --- 1. Backend Deployment ---
print("\n[1/4] Uploading backend/main.py to S3...")
s3.upload_file(BACKEND_MAIN, BUCKET_NAME, "deploy/main.py")
print(f"[OK] Uploaded to s3://{BUCKET_NAME}/deploy/main.py")

print("\n[2/4] Updating backend on EC2 instance " + BACKEND_INSTANCE_ID + "...")
backend_cmds = [
    f"aws s3 cp s3://{BUCKET_NAME}/deploy/main.py /home/ec2-user/backend/main.py",
    "chown ec2-user:ec2-user /home/ec2-user/backend/main.py",
    "sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python -c \""
    "import os\n"
    "from sqlalchemy import create_engine, text\n"
    "from dotenv import load_dotenv\n"
    "load_dotenv('/home/ec2-user/backend/.env')\n"
    "url = os.getenv('DATABASE_URL')\n"
    "if url:\n"
    "    engine = create_engine(url)\n"
    "    with engine.begin() as conn:\n"
    "        conn.execute(text(\\\"UPDATE users SET approval_status = 'approved' WHERE role IN ('admin', 'superadmin');\\\"))\n"
    "        print('SUCCESS: Updated RDS PostgreSQL users table!')\n"
    "\"",
    "sudo systemctl restart aisurf-backend",
    "sleep 2",
    "systemctl is-active aisurf-backend"
]

resp = ssm.send_command(
    InstanceIds=[BACKEND_INSTANCE_ID],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": backend_cmds}
)
cmd_id = resp["Command"]["CommandId"]
print(f"[INFO] Backend SSM Command ID: {cmd_id}")

for _ in range(20):
    time.sleep(3)
    inv = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=BACKEND_INSTANCE_ID)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        print(f"[STATUS] Backend deployment: {status}")
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        if stdout:
            print(f"[STDOUT]:\n{stdout}")
        if stderr:
            print(f"[STDERR]:\n{stderr}")
        break

# --- 2. Frontend Packaging & Deployment ---
print("\n[3/4] Packaging frontend dist/ into zip...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(DIST_DIR):
        for file in files:
            file_path = os.path.join(root, file)
            archive_name = os.path.relpath(file_path, DIST_DIR)
            zipf.write(file_path, archive_name)
print(f"[OK] Created {ZIP_PATH} ({os.path.getsize(ZIP_PATH):,} bytes)")

print(f"\nUploading {ZIP_PATH} to S3...")
s3.upload_file(ZIP_PATH, BUCKET_NAME, "aisurf-frontend.zip")
print(f"[OK] Uploaded to s3://{BUCKET_NAME}/aisurf-frontend.zip")

print("\n[4/4] Deploying frontend on EC2 instance " + FRONTEND_INSTANCE_ID + "...")
frontend_cmds = [
    f"aws s3 cp s3://{BUCKET_NAME}/aisurf-frontend.zip /tmp/frontend.zip",
    "rm -rf /var/www/frontend/*",
    "unzip -o /tmp/frontend.zip -d /var/www/frontend",
    "chmod -R 755 /var/www/frontend",
    "systemctl restart nginx",
    "systemctl is-active nginx"
]

resp_fe = ssm.send_command(
    InstanceIds=[FRONTEND_INSTANCE_ID],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": frontend_cmds}
)
fe_cmd_id = resp_fe["Command"]["CommandId"]
print(f"[INFO] Frontend SSM Command ID: {fe_cmd_id}")

for _ in range(20):
    time.sleep(3)
    inv_fe = ssm.get_command_invocation(CommandId=fe_cmd_id, InstanceId=FRONTEND_INSTANCE_ID)
    status_fe = inv_fe.get("Status")
    if status_fe in ["Success", "Failed", "Cancelled", "TimedOut"]:
        print(f"[STATUS] Frontend deployment: {status_fe}")
        stdout = inv_fe.get("StandardOutputContent", "").strip()
        stderr = inv_fe.get("StandardErrorContent", "").strip()
        if stdout:
            print(f"[STDOUT]:\n{stdout}")
        if stderr:
            print(f"[STDERR]:\n{stderr}")
        break

print("\n" + "=" * 60)
print("  ALL SERVICES DEPLOYED SUCCESSFULLY TO AWS!")
print("=" * 60)
