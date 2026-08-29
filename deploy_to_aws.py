import os
import boto3
from dotenv import load_dotenv

# Load env variables
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "aisurf-media-uploads-149051628601")
REGION = os.getenv("AWS_REGION", "us-east-1")
INSTANCE_ID = "i-0c62e04f44a9ea237"

local_main_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "main.py")

try:
    print(f"[INFO] Uploading local main.py to S3 bucket {BUCKET_NAME}...")
    s3_client = boto3.client("s3", region_name=REGION)
    s3_client.upload_file(local_main_path, BUCKET_NAME, "deploy/main.py")
    print("[SUCCESS] Successfully uploaded main.py to S3!")

    print(f"[INFO] Triggering SSM command on EC2 instance {INSTANCE_ID} to pull and deploy...")
    ssm_client = boto3.client("ssm", region_name=REGION)
    
    commands = [
        f"aws s3 cp s3://{BUCKET_NAME}/deploy/main.py /home/ec2-user/backend/main.py",
        "sudo systemctl restart aisurf-backend"
    ]
    
    response = ssm_client.send_command(
        InstanceIds=[INSTANCE_ID],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": commands}
    )
    
    command_id = response["Command"]["CommandId"]
    print(f"[SUCCESS] SSM deployment command sent! Command ID: {command_id}")
except Exception as e:
    print("[ERROR] Deployment failed:", str(e))
