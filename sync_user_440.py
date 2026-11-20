import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User
db = SessionLocal()
u = db.query(User).filter(User.id == 440).first()
if u:
    u.school_name = 'rpn tech ac'
    db.commit()
    print('User 440 synced to rpn tech ac')
s557 = db.query(Student).filter(Student.id == 557).first()
if s557 and s557.user_id != 440:
    s557.user_id = 440
    db.commit()
    print('Student 557 linked to User 440')
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
