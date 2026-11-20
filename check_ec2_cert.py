import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, School
db = SessionLocal()
s = db.query(School).filter(School.name.ilike('%rpn%')).first()
if s:
    print('School ID:', s.id, 'Name:', s.name)
    print('Cert Config:', s.certificate_json)
    print('Poster URL:', getattr(s, 'poster_url', None))
db.close()
"""

res = ssm.send_command(
    InstanceIds=['i-0c62e04f44a9ea237'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [
        'cd /home/ec2-user/backend',
        f'/home/ec2-user/backend/.venv/bin/python3 -c "{remote_py}"'
    ]}
)
cid = res['Command']['CommandId']
time.sleep(3)
for _ in range(5):
    out = ssm.get_command_invocation(CommandId=cid, InstanceId='i-0c62e04f44a9ea237')
    if out['Status'] in ['Success', 'Failed']:
        print("STDOUT:\n", out['StandardOutputContent'])
        print("STDERR:\n", out['StandardErrorContent'])
        break
    time.sleep(2)
