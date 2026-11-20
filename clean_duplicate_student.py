import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User, SurfSession
db = SessionLocal()
s562 = db.query(Student).filter(Student.id == 562).first()
if s562:
    # check if any sessions exist
    sess_count = db.query(SurfSession).filter(SurfSession.student_id == 562).count()
    if sess_count == 0:
        print('Deleting empty duplicate student 562...')
        db.delete(s562)
        db.commit()
        print('Successfully deleted student 562!')
    else:
        print('Student 562 has sessions, moving them to 557...')
        db.query(SurfSession).filter(SurfSession.student_id == 562).update({SurfSession.student_id: 557})
        db.delete(s562)
        db.commit()
        print('Successfully moved sessions and deleted student 562!')
else:
    print('Student 562 not found.')

# Check user 440
u = db.query(User).filter(User.id == 440).first()
if u:
    u.school_name = 'rpn tech ac'
    db.commit()
    print('Updated User 440 school_name to rpn tech ac')

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
