import boto3, json, time

ssm = boto3.client('ssm', region_name='us-east-1')
remote_py = """
from main import SessionLocal, Student, User, SurfSession
db = SessionLocal()
s562 = db.query(Student).filter(Student.id == 562).first()
s557 = db.query(Student).filter(Student.id == 557).first()
print('=== STUDENT 562 ===')
if s562:
    print('ID:', s562.id, 'Name:', s562.name, 'Email:', s562.email, 'School:', s562.school, 'UserID:', s562.user_id, 'CourseDur:', s562.course_duration, 'InstructorID:', s562.instructor_id)
print('=== STUDENT 557 ===')
if s557:
    print('ID:', s557.id, 'Name:', s557.name, 'Email:', s557.email, 'School:', s557.school, 'UserID:', s557.user_id, 'CourseDur:', s557.course_duration, 'InstructorID:', s557.instructor_id)
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
