import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

instance_id = 'i-0c62e04f44a9ea237'
commands = [
    'cd /home/ec2-user/backend',
    'sudo -u ec2-user bash -c "cat <<\'EOF\' > .env',
    'PORT=8000',
    'AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY>',
    'AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_KEY>',
    'AWS_REGION=us-east-1',
    'DATABASE_URL=postgresql://postgres@database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com:5432/postgres',
    'EOF"',
    'systemctl restart aisurf-backend',
    'systemctl status aisurf-backend'
]

print("Sending SSM env update command...")
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
                # print without unicode characters to avoid windows stdout mapping crash
                output = plugin.get('Output', '').encode('ascii', 'ignore').decode('ascii')
                print(output)
            break
    time.sleep(2)
