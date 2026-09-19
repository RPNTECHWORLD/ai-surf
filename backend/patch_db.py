import sys
from sqlalchemy import text
from main import engine, Base

def run_migrations():
    print("Connecting to database...")
    with engine.connect() as conn:
        # Check sessions columns
        alter_statements = [
            # sessions table
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS image_url VARCHAR DEFAULT '';",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url VARCHAR DEFAULT '';",
            "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_name VARCHAR DEFAULT '';",
            
            # students table
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_token VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 0;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS course_duration VARCHAR DEFAULT '3 Days Course';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS start_date VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS end_date VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS session_time VARCHAR DEFAULT '08:30 AM';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS staying_at_school VARCHAR DEFAULT 'Yes';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR DEFAULT 'WhatsApp Text';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_details TEXT;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS school VARCHAR DEFAULT 'Aquatic Indica Surf School';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR DEFAULT 'approved';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR DEFAULT '';",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS division VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS stance VARCHAR;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS surf_stats TEXT;",
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS performance_logs TEXT;",

            # instructors table
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS bio TEXT;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS specializations TEXT;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS rates VARCHAR;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS location VARCHAR;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS reviews TEXT;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT '[\"English\"]';",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS intro_video VARCHAR DEFAULT '';",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 100.00;",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS school VARCHAR DEFAULT 'Individual / Freelance Coach';",
            "ALTER TABLE instructors ADD COLUMN IF NOT EXISTS dob VARCHAR;",

            # users table
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR DEFAULT 'approved';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_school BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS social_id VARCHAR;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR;"
        ]
        
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
                print(f"Executed: {stmt[:60]}...")
            except Exception as e:
                print(f"Notice executing {stmt[:40]}: {e}")
        
        conn.commit()
        print("All database columns successfully checked/updated!")

if __name__ == "__main__":
    run_migrations()
