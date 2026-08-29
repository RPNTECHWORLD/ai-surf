import os
import psycopg2
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL not found in backend/.env")
    exit(1)

try:
    print("[INFO] Connecting to AWS RDS PostgreSQL to remove fake demo data...")
    parsed = urlparse(DATABASE_URL)
    db_host = parsed.hostname
    db_port = parsed.port or 5432
    db_user = parsed.username or "postgres"
    db_name = parsed.path.lstrip("/")

    rds_client = boto3.client("rds", region_name=os.getenv("AWS_REGION", "us-east-1"))
    token = rds_client.generate_db_auth_token(
        DBHostname=db_host,
        Port=db_port,
        DBUsername=db_user,
        Region=os.getenv("AWS_REGION", "us-east-1")
    )

    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        database=db_name,
        password=token,
        sslmode="require"
    )
    cursor = conn.cursor()

    demo_coach_names = ('Kai Lenny', 'Bethany Hamilton', 'Kolohe Andino', 'Carissa Moore', 'Marcus Silva')
    demo_emails = (
        'kai@aisurf.com', 'bethany@aisurf.com', 'kolohe@aisurf.com', 'carissa@aisurf.com', 'marcus@aisurf.com',
        'chloe@aisurf.com', 'john@aisurf.com', 'emma@aisurf.com', 'ericsheldon@gmail.com', 'demo1@g.com',
        'aarav@aisurf.com', 'priya@aisurf.com', 'admin@aisurf.com'
    )
    demo_student_names = ('Chloe Kim', 'John Miller', 'Emma Watson', 'Eric Sheldon', 'demo1', 'Aarav Sharma', 'Priya Nair')

    print("[INFO] Deleting demo logs and mock heats...")
    cursor.execute("DELETE FROM mock_heat_waves WHERE mock_heat_id IN (SELECT id FROM mock_heats WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s));", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM mock_heats WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM nutrition_logs WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM sc_logs WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM technical_logs WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM mental_logs WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))
    cursor.execute("DELETE FROM badges WHERE student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s);", (demo_student_names, demo_emails))

    print("[INFO] Deleting sessions linked to demo instructors or demo students...")
    cursor.execute("""
        DELETE FROM sessions 
        WHERE instructor_id IN (SELECT id FROM instructors WHERE name IN %s OR email IN %s)
           OR student_id IN (SELECT id FROM students WHERE name IN %s OR email IN %s)
           OR student_id IS NULL;
    """, (demo_coach_names, demo_emails, demo_student_names, demo_emails))

    print("[INFO] Deleting demo students...")
    cursor.execute("DELETE FROM students WHERE name IN %s OR email IN %s;", (demo_student_names, demo_emails))

    print("[INFO] Deleting demo instructors...")
    cursor.execute("DELETE FROM instructors WHERE name IN %s OR email IN %s;", (demo_coach_names, demo_emails))

    print("[INFO] Deleting demo users...")
    cursor.execute("DELETE FROM users WHERE email IN %s;", (demo_emails,))

    conn.commit()
    print("[SUCCESS] All fake/demo coaches, students, and sessions have been permanently purged from AWS RDS!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print("[ERROR] Purge failed:", str(e))
