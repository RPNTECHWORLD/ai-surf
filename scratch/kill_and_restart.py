import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

instance_id = 'i-0c62e04f44a9ea237'
commands = [
    'sudo fuser -k 8000/tcp || true',
    'systemctl restart aisurf-backend',
    'sleep 3',
    'systemctl status aisurf-backend'
]

print("Sending SSM kill and restart command...")
response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"CommandId: {command_id}")

while True:
    invocations = ssm.list_command_invocations(
        CommandId=command_id,
        Details=True
    )
    if invocations['CommandInvocations']:
        status = invocations['CommandInvocations'][0]['Status']
        print(f"Status: {status}")
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            plugins = invocations['CommandInvocations'][0]['CommandPlugins']
            for plugin in plugins:
                print(f"Plugin: {plugin['Name']} ({plugin['Status']})")
                output = plugin.get('Output', '').encode('ascii', 'ignore').decode('ascii')
                print(output)
            break
    time.sleep(2)
