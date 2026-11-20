import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
from dotenv import load_dotenv
load_dotenv('backend/.env')
from main import SessionLocal, Student, User, SurfSession

db = SessionLocal()
print('=== USERS ===')
users = db.query(User).filter(User.name.ilike('%velavan%') | User.name.ilike('%abi%')).all()
for u in users:
    print(f'User ID: {u.id}, Email: {u.email}, Name: {u.name}, Role: {u.role}, School: {u.school}, StudentID: {u.student_id}, CourseDur: {getattr(u, "course_duration", None)}')

print('\n=== STUDENTS ===')
students = db.query(Student).filter(Student.name.ilike('%velavan%') | Student.name.ilike('%abi%')).all()
for s in students:
    sess_count = db.query(SurfSession).filter(SurfSession.student_id == s.id).count()
    name_sess_count = db.query(SurfSession).filter(SurfSession.student_name.ilike(f'%{s.name}%') | SurfSession.guest_name.ilike(f'%{s.name}%')).count()
    print(f'Student ID: {s.id}, UserID: {s.user_id}, Email: {s.email}, Name: {s.name}, School: {s.school}, CourseDur: {s.course_duration}, SessionsById: {sess_count}, SessionsByName: {name_sess_count}')

db.close()
