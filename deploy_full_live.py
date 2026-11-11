import os
import sys
import time
import zipfile
import subprocess
from dotenv import load_dotenv

# Try importing boto3, if not in standard sys.path, add .venv
try:
    import boto3
except ImportError:
    venv_site = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Lib", "site-packages")
    if os.path.exists(venv_site):
        sys.path.insert(0, venv_site)
    import boto3

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
backend_env_path = os.path.join(ROOT_DIR, "backend", ".env")
load_dotenv(backend_env_path)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
BACKEND_INSTANCE_ID = "i-0c62e04f44a9ea237"
FRONTEND_INSTANCE_ID = "i-02999b6093bc5bfd2"
STACK_NAME = "aisurf-frontend-stack"

BACKEND_MAIN = os.path.join(ROOT_DIR, "backend", "main.py")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
ZIP_PATH = os.path.join(ROOT_DIR, "aisurf-frontend.zip")

print("=" * 65)
print("     ATHNEX LIVE / AI SURF — FULL AWS PRODUCTION DEPLOYMENT")
print("=" * 65)

s3 = boto3.client("s3", region_name=REGION)
ssm = boto3.client("ssm", region_name=REGION)
cfn = boto3.client("cloudformation", region_name=REGION)

# =====================================================================
# 1. DEPLOY BACKEND
# =====================================================================
print("\n" + "-" * 50)
print("  STEP 1: DEPLOYING BACKEND (FastAPI / PostgreSQL)")
print("-" * 50)

print(f"[*] Uploading {BACKEND_MAIN} to s3://{BUCKET_NAME}/deploy/main.py...")
s3.upload_file(BACKEND_MAIN, BUCKET_NAME, "deploy/main.py")
print("[+] Backend main.py uploaded to S3.")

print(f"[*] Executing SSM deploy command on Backend EC2 ({BACKEND_INSTANCE_ID})...")
backend_cmds = [
    f"aws s3 cp s3://{BUCKET_NAME}/deploy/main.py /home/ec2-user/backend/main.py",
    "chown ec2-user:ec2-user /home/ec2-user/backend/main.py",
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
print(f"[*] SSM Command sent! Command ID: {cmd_id}")

print("[*] Waiting for backend deployment to complete...")
backend_success = False
for _ in range(25):
    time.sleep(2)
    inv = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=BACKEND_INSTANCE_ID)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        print(f"[*] Backend deployment status: {status}")
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        if stdout:
            print(f"[STDOUT]: {stdout}")
        if stderr:
            print(f"[STDERR]: {stderr}")
        if status == "Success" and "active" in stdout.lower():
            backend_success = True
            print("[+] Backend service is ACTIVE and successfully running!")
        break

if not backend_success:
    print("[!] Warning: Backend deployment finished with unexpected status.")

# =====================================================================
# 2. BUILD & DEPLOY FRONTEND
# =====================================================================
print("\n" + "-" * 50)
print("  STEP 2: BUILDING & DEPLOYING FRONTEND (Vite React)")
print("-" * 50)

print("[*] Running Vite React production build...")
build_res = subprocess.run("npm run build", shell=True, cwd=FRONTEND_DIR)
if build_res.returncode != 0:
    print("[ERROR] Frontend build failed!")
    sys.exit(1)
print("[+] Frontend build succeeded!")

print("[*] Packaging dist/ folder into aisurf-frontend.zip...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(DIST_DIR):
        for file in files:
            file_path = os.path.join(root, file)
            archive_name = os.path.relpath(file_path, DIST_DIR)
            zipf.write(file_path, archive_name)
print(f"[+] Zip created ({os.path.getsize(ZIP_PATH):,} bytes).")

print(f"[*] Uploading {ZIP_PATH} to s3://{BUCKET_NAME}/aisurf-frontend.zip...")
s3.upload_file(ZIP_PATH, BUCKET_NAME, "aisurf-frontend.zip")
print("[+] Uploaded to S3.")

# Resolve frontend instance ID & URL from CloudFormation
frontend_instance = FRONTEND_INSTANCE_ID
frontend_url = "http://54.242.160.238"  # fallback default
try:
    stack_resp = cfn.describe_stacks(StackName=STACK_NAME)
    outputs = {o["OutputKey"]: o["OutputValue"] for o in stack_resp["Stacks"][0].get("Outputs", [])}
    if outputs.get("FrontendInstanceId"):
        frontend_instance = outputs["FrontendInstanceId"]
    if outputs.get("FrontendUrl"):
        frontend_url = outputs["FrontendUrl"]
    elif outputs.get("FrontendPublicIp"):
        frontend_url = f"http://{outputs['FrontendPublicIp']}"
except Exception as e:
    print(f"[INFO] CloudFormation info: {e}")

print(f"[*] Deploying latest build onto Frontend EC2 ({frontend_instance})...")
frontend_cmds = [
    f"aws s3 cp s3://{BUCKET_NAME}/aisurf-frontend.zip /tmp/frontend.zip",
    "rm -rf /var/www/frontend/*",
    "unzip -o /tmp/frontend.zip -d /var/www/frontend",
    "chmod -R 755 /var/www/frontend",
    "systemctl restart nginx",
    "systemctl is-active nginx"
]

resp = ssm.send_command(
    InstanceIds=[frontend_instance],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": frontend_cmds}
)
cmd_id = resp["Command"]["CommandId"]
print(f"[*] Frontend SSM Command ID: {cmd_id}")

print("[*] Waiting for frontend deployment to complete...")
frontend_success = False
for _ in range(25):
    time.sleep(2)
    inv = ssm.get_command_invocation(CommandId=cmd_id, InstanceId=frontend_instance)
    status = inv.get("Status")
    if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
        print(f"[*] Frontend deployment status: {status}")
        stdout = inv.get("StandardOutputContent", "").strip()
        stderr = inv.get("StandardErrorContent", "").strip()
        if stdout:
            print(f"[STDOUT]: {stdout}")
        if stderr:
            print(f"[STDERR]: {stderr}")
        if status == "Success" and "active" in stdout.lower():
            frontend_success = True
            print("[+] Nginx successfully reloaded with latest frontend build!")
        break

print("\n" + "=" * 65)
if backend_success and frontend_success:
    print("  🎉 FULL PRODUCTION DEPLOYMENT SUCCESSFUL!")
else:
    print("  DEPLOYMENT FINISHED (Check logs above for details)")
print(f"  Live Frontend URL: {frontend_url}")
print(f"  Live Achievements: {frontend_url}/achievements")
print("=" * 65)

