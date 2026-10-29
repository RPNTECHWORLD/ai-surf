import os
import sys
import time
import zipfile
import subprocess
import boto3
from dotenv import load_dotenv

# Load env variables
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
STACK_NAME = "aisurf-frontend-stack"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
ZIP_PATH = os.path.join(ROOT_DIR, "aisurf-frontend.zip")
CFN_TEMPLATE_PATH = os.path.join(ROOT_DIR, "aisurf-frontend-cfn.yaml")

print("=" * 60)
print("  AI SURF FRONTEND AWS DEPLOYMENT")
print("=" * 60)

# 1. Build Frontend
print("\n[1/5] Building Vite React frontend...")
build_cmd = "npm run build"
result = subprocess.run(build_cmd, shell=True, cwd=FRONTEND_DIR)
if result.returncode != 0:
    print("[ERROR] Frontend build failed!")
    sys.exit(1)
print("[OK] Frontend built successfully!")

# 2. Package dist folder into aisurf-frontend.zip
print("\n[2/5] Packaging dist/ folder into zip archive...")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(DIST_DIR):
        for file in files:
            file_path = os.path.join(root, file)
            archive_name = os.path.relpath(file_path, DIST_DIR)
            zipf.write(file_path, archive_name)
print(f"[OK] Created {ZIP_PATH} ({os.path.getsize(ZIP_PATH):,} bytes)")

# 3. Upload to S3
print(f"\n[3/5] Uploading {os.path.basename(ZIP_PATH)} to S3 bucket '{BUCKET_NAME}'...")
s3_client = boto3.client("s3", region_name=REGION)
s3_client.upload_file(ZIP_PATH, BUCKET_NAME, "aisurf-frontend.zip")
print(f"[OK] Uploaded to s3://{BUCKET_NAME}/aisurf-frontend.zip")

# 4. Deploy or Update CloudFormation Stack
cfn_client = boto3.client("cloudformation", region_name=REGION)
ssm_client = boto3.client("ssm", region_name=REGION)

with open(CFN_TEMPLATE_PATH, "r", encoding="utf-8") as f:
    template_body = f.read()

print(f"\n[4/5] Checking CloudFormation stack '{STACK_NAME}'...")
stack_exists = False
try:
    resp = cfn_client.describe_stacks(StackName=STACK_NAME)
    stack_status = resp["Stacks"][0]["StackStatus"]
    stack_exists = stack_status not in ["DELETE_COMPLETE", "DELETE_FAILED"]
except Exception:
    stack_exists = False

if not stack_exists:
    print(f"[INFO] Stack '{STACK_NAME}' does not exist. Creating new EC2 Frontend stack...")
    cfn_client.create_stack(
        StackName=STACK_NAME,
        TemplateBody=template_body,
        Capabilities=["CAPABILITY_IAM"],
        Parameters=[
            {"ParameterKey": "S3BucketName", "ParameterValue": BUCKET_NAME},
            {"ParameterKey": "S3ObjectKey", "ParameterValue": "aisurf-frontend.zip"},
            {"ParameterKey": "InstanceType", "ParameterValue": "t3.micro"},
            {"ParameterKey": "BackendUrl", "ParameterValue": "http://54.242.160.238:8000"}
        ]
    )
    print("[INFO] Waiting for CloudFormation stack creation to complete (this takes ~2 minutes)...")
    waiter = cfn_client.get_waiter("stack_create_complete")
    waiter.wait(StackName=STACK_NAME)
    print(f"[OK] Stack '{STACK_NAME}' successfully created!")
else:
    print(f"[INFO] Stack '{STACK_NAME}' exists. Getting frontend instance ID for hot-reload update...")

# Get Instance ID & Public IP from Stack Outputs
resp = cfn_client.describe_stacks(StackName=STACK_NAME)
outputs = {o["OutputKey"]: o["OutputValue"] for o in resp["Stacks"][0].get("Outputs", [])}
frontend_ip = outputs.get("FrontendPublicIp", "Unknown")
instance_id = outputs.get("FrontendInstanceId", "")
frontend_url = outputs.get("FrontendUrl", f"http://{frontend_ip}")

print(f"\nFrontend Server Details:")
print(f"  - Instance ID: {instance_id}")
print(f"  - Public IP:   {frontend_ip}")
print(f"  - URL:         {frontend_url}")

# 5. If stack already existed, sync latest frontend zip via SSM
if stack_exists and instance_id:
    print(f"\n[5/5] Deploying new frontend build onto EC2 instance {instance_id} via AWS SSM...")
    update_commands = [
        f"aws s3 cp s3://{BUCKET_NAME}/aisurf-frontend.zip /tmp/frontend.zip",
        "rm -rf /var/www/frontend/*",
        "unzip -o /tmp/frontend.zip -d /var/www/frontend",
        "chmod -R 755 /var/www/frontend",
        "systemctl restart nginx",
        "systemctl is-active nginx"
    ]
    
    response = ssm_client.send_command(
        InstanceIds=[instance_id],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": update_commands}
    )
    command_id = response["Command"]["CommandId"]
    print(f"[INFO] SSM Command sent! Command ID: {command_id}")
    
    print("[INFO] Waiting for SSM deployment command to finish...")
    for _ in range(20):
        time.sleep(3)
        inv = ssm_client.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id
        )
        status = inv.get("Status")
        if status in ["Success", "Failed", "Cancelled", "TimedOut"]:
            print(f"[STATUS] Deployment Status: {status}")
            stdout = inv.get("StandardOutputContent", "").strip()
            stderr = inv.get("StandardErrorContent", "").strip()
            if stdout:
                print(f"[STDOUT]:\n{stdout}")
            if stderr:
                print(f"[STDERR]:\n{stderr}")
            if status == "Success":
                print("[OK] Frontend files updated and Nginx restarted!")
            break
else:
    print("\n[5/5] EC2 instance is initializing via UserData and setting up Nginx...")

print("\n" + "=" * 60)
print(f"  DEPLOYMENT COMPLETE!")
print(f"  AI Surf Frontend Live URL: {frontend_url}")
print("=" * 60)
