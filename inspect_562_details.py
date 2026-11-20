import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User, SurfSession
db = SessionLocal()
s562 = db.query(Student).filter(Student.id == 562).first()
s557 = db.query(Student).filter(Student.id == 557).first()
print('562 sessions:', db.query(SurfSession).filter(SurfSession.student_id == 562).all())
print('557 sessions:', db.query(SurfSession).filter(SurfSession.student_id == 557).all())
print('562 dict:', s562.__dict__)
print('557 dict:', s557.__dict__)
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
