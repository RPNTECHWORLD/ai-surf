import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User, SurfSession
db = SessionLocal()
print('=== USERS ===')
for u in db.query(User).filter(User.name.ilike('%velavan%') | User.name.ilike('%abi%')).all():
    print('User:', u.id, u.email, u.name, u.role, getattr(u, 'school_name', None))
print('=== STUDENTS ===')
for s in db.query(Student).filter(Student.name.ilike('%velavan%') | Student.name.ilike('%abi%')).all():
    c_by_id = db.query(SurfSession).filter(SurfSession.student_id == s.id).count()
    c_by_name = db.query(SurfSession).filter(SurfSession.student_name.ilike(f'%{s.name}%') | SurfSession.guest_name.ilike(f'%{s.name}%')).count()
    print('Student:', s.id, s.user_id, s.email, s.name, s.school, s.course_duration, 'SessById:', c_by_id, 'SessByName:', c_by_name)
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
