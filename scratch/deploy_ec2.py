import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

instance_id = 'i-0c62e04f44a9ea237'
commands = [
    'cd /home/ec2-user',
    'aws s3 cp s3://aisurf-media-uploads-149051628601/aisurf-backend.zip backend.zip',
    'unzip -o backend.zip -d backend',
    'chown -R ec2-user:ec2-user backend',
    'sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python /home/ec2-user/backend/migrate_db.py',
    'systemctl restart aisurf-backend',
    'systemctl status aisurf-backend'
]

print("Sending SSM command...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"Command sent successfully. CommandId: {command_id}")

# Wait for command execution
print("Waiting for command to complete...")
while True:
    invocations = ssm.list_command_invocations(
        CommandId=command_id,
        Details=True
    )
    if invocations['CommandInvocations']:
        status = invocations['CommandInvocations'][0]['Status']
        print(f"Current Status: {status}")
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            plugins = invocations['CommandInvocations'][0]['CommandPlugins']
            for plugin in plugins:
                print(f"--- Plugin: {plugin['Name']} ({plugin['Status']}) ---")
                print("Output:")
                print(plugin.get('Output', 'No Output'))
            break
    time.sleep(2)
