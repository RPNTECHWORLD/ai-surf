from main import engine, Base
from sqlalchemy import text

def run_sql(stmt):
    try:
        with engine.connect() as conn:
            conn.execute(text(stmt))
            conn.commit()
            print(f"OK: {stmt.strip()[:60]}...")
    except Exception as e:
        print(f"SKIP/ERR: {stmt.strip()[:60]}... -> {e}")

# 1. Base metadata create all for any newly defined tables
try:
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed.")
except Exception as e:
    print(f"Base.metadata.create_all: {e}")

# 2. students table migrations
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(50) DEFAULT 'Male';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 20;")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR(50) DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS division VARCHAR(50) DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS stance VARCHAR(50) DEFAULT 'regular';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS surf_stats TEXT DEFAULT '{}';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS performance_logs TEXT DEFAULT '[]';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50) DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 1;")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS course_duration VARCHAR(100) DEFAULT '3 Days Course';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS start_date VARCHAR(50) DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS end_date VARCHAR(50) DEFAULT '';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS session_time VARCHAR(50) DEFAULT 'Morning 6:00 AM';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS staying_at_school VARCHAR(20) DEFAULT 'Yes';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(50) DEFAULT 'WhatsApp Text';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_details TEXT DEFAULT '[]';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_token VARCHAR(128);")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS school VARCHAR(150) DEFAULT 'Aquatic Indica Surf School';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';")
run_sql("ALTER TABLE students ADD COLUMN IF NOT EXISTS swimming_ability VARCHAR(50) DEFAULT 'Swimmer';")

# 3. instructors table migrations
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email VARCHAR;")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS dob VARCHAR;")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS specializations TEXT DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS rates VARCHAR DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS location VARCHAR DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 5.0;")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS image VARCHAR DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS reviews TEXT DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT '[\"English\"]';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS intro_video VARCHAR DEFAULT '';")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 100.00;")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS school VARCHAR DEFAULT 'Individual / Freelance Coach';")

# 4. users table migrations
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_school BOOLEAN DEFAULT false;")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS social_id VARCHAR;")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR;")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR;")

# 5. sessions table migrations
run_sql("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS image_url VARCHAR DEFAULT '';")
run_sql("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url VARCHAR DEFAULT '';")
run_sql("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_name VARCHAR(200) DEFAULT '';")

# 6. activity_log table migrations
run_sql("ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS school VARCHAR(150) DEFAULT 'Aquatic Indica Surf School';")
run_sql("""
    UPDATE activity_log
    SET school = s.school
    FROM students s
    WHERE (activity_log.text LIKE s.name || ' %' OR activity_log.text LIKE '% with ' || s.name || '%')
      AND s.school IS NOT NULL AND s.school != '';
""")
run_sql("""
    UPDATE activity_log
    SET school = i.school
    FROM instructors i
    WHERE (activity_log.text LIKE '%' || i.name || '%' OR activity_log.text LIKE 'New instructor ' || i.name || '%')
      AND i.school IS NOT NULL AND i.school != ''
      AND (activity_log.school IS NULL OR activity_log.school = 'Aquatic Indica Surf School');
""")
run_sql("""
    UPDATE activity_log
    SET school = sch.name
    FROM schools sch
    WHERE activity_log.text LIKE '%' || sch.owner || '%'
      AND activity_log.text LIKE 'School Admin account created%';
""")

# 7. school_invite_links table migrations
run_sql("""
CREATE TABLE IF NOT EXISTS school_invite_links (
    id SERIAL PRIMARY KEY,
    code VARCHAR(128) UNIQUE NOT NULL,
    school VARCHAR(150) NOT NULL,
    max_count INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    course_duration VARCHAR(100) DEFAULT '3 Days Course',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
""")

run_sql("""
ALTER TABLE school_invite_links ADD COLUMN IF NOT EXISTS course_duration VARCHAR(100) DEFAULT '3 Days Course';
""")

print("MIGRATION_SUCCESS")

