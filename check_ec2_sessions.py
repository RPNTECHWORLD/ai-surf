import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User, SurfSession
db = SessionLocal()
print('=== SESSIONS FOR VELAVAN (843) ===')
for s in db.query(SurfSession).filter((SurfSession.student_id == 843) | SurfSession.student_name.ilike('%velavan%') | SurfSession.guest_name.ilike('%velavan%')).all():
    print(s.id, s.student_id, s.student_name, s.guest_name, s.date, s.status, s.attendance)

print('=== SESSIONS FOR ABI (889) ===')
for s in db.query(SurfSession).filter((SurfSession.student_id == 889) | SurfSession.student_name.ilike('%abi%') | SurfSession.guest_name.ilike('%abi%')).all():
    print(s.id, s.student_id, s.student_name, s.guest_name, s.date, s.status, s.attendance)
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
