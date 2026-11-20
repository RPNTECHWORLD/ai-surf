import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
res = ssm.send_command(
    InstanceIds=['i-0c62e04f44a9ea237'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [
        'curl -s http://localhost:8000/api/students?school=all | head -c 500'
    ]}
)
cid = res['Command']['CommandId']
time.sleep(3)
out = ssm.get_command_invocation(CommandId=cid, InstanceId='i-0c62e04f44a9ea237')
print(out['StandardOutputContent'])
