import sys
sys.path.insert(0, 'backend')
from main import SessionLocal, Student, User, SurfSession

db = SessionLocal()
print('--- USERS with arun ---')
users = db.query(User).filter((User.name.ilike('%arun%')) | (User.email.ilike('%arun%'))).all()
for u in users:
    print(f'User ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}')

print('--- STUDENTS with arun ---')
students = db.query(Student).filter((Student.name.ilike('%arun%')) | (Student.email.ilike('%arun%'))).all()
for s in students:
    print(f'Student ID: {s.id}, User_ID: {s.user_id}, Name: {s.name}, Email: {s.email}')

print('--- SESSIONS with RPNitheesh or Group B ---')
sessions = db.query(SurfSession).filter((SurfSession.notes.ilike('%Group B%')) | (SurfSession.student_name.ilike('%RPNitheesh%'))).all()
for sess in sessions:
    print(f'Session ID: {sess.id}, Student ID: {sess.student_id}, Student Name: {sess.student_name}, Notes: {sess.notes}')

