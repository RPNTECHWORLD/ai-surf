import os
from main import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("Purging AWS RDS PostgreSQL tables...")
    db.execute(text("""
        TRUNCATE TABLE 
            attendance_records, 
            sessions, 
            badges, 
            heat_surfers, 
            scores, 
            heats, 
            events, 
            students, 
            instructors 
        CASCADE;
    """))
    db.execute(text("DELETE FROM users WHERE email IS NULL OR email != 'rpntechworld@gmail.com';"))
    db.commit()
    print("SUCCESS: AWS RDS DATABASE TRUNCATED & PURGED SUCCESSFULLY! ONLY rpntechworld@gmail.com RETAINED.")
except Exception as e:
    db.rollback()
    print("ERROR:", e)
finally:
    db.close()
