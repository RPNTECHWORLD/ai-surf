import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

instance_id = 'i-0c62e04f44a9ea237'
commands = [
    'cd /home/ec2-user/backend',
    'sudo -u ec2-user /home/ec2-user/backend/.venv/bin/python3 -c "from main import Base, engine; Base.metadata.create_all(engine); print(\'Tables synced!\')"',
    'systemctl restart aisurf-backend',
    'sleep 2 && systemctl is-active aisurf-backend'
]

print("Syncing DB schema on EC2...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"CommandId: {command_id}")

while True:
    invocations = ssm.list_command_invocations(CommandId=command_id, Details=True)
    if invocations['CommandInvocations']:
        status = invocations['CommandInvocations'][0]['Status']
        print(f"Status: {status}")
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            for plugin in invocations['CommandInvocations'][0]['CommandPlugins']:
                output = plugin.get('Output', '').encode('ascii', 'ignore').decode('ascii')
                print(output)
            break
    time.sleep(2)
