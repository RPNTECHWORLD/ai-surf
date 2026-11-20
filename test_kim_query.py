import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User
from sqlalchemy import func
db = SessionLocal()
u = db.query(User).filter(User.email == 'kim@gmail.com').first()
print('User:', u.id, u.email, 'u.student:', u.student)
st1 = db.query(Student).filter(func.lower(Student.email) == 'kim@gmail.com').first()
print('st1:', st1.id, st1.name, st1.school, st1.user_id)
st_by_user = db.query(Student).filter(Student.user_id == u.id).first()
print('st_by_user:', st_by_user.id if st_by_user else None)
all_kim = db.query(Student).filter(func.lower(Student.email) == 'kim@gmail.com').all()
for k in all_kim:
    print('All kim:', k.id, k.name, k.school, k.user_id, k.course_duration)
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
