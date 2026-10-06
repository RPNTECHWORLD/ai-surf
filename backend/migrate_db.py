from main import engine, Base
from sqlalchemy import text

def add_col(table, col, col_type, default_val=None):
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                cols = [r[1] for r in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()]
                if col not in cols:
                    d_clause = f" DEFAULT {default_val}" if default_val is not None else ""
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}{d_clause}"))
                    conn.commit()
                    print(f"OK [sqlite]: ADD COLUMN {table}.{col}")
                else:
                    print(f"EXISTS [sqlite]: {table}.{col}")
            else:
                d_clause = f" DEFAULT {default_val}" if default_val is not None else ""
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}{d_clause}"))
                conn.commit()
                print(f"OK [pg]: ADD COLUMN {table}.{col}")
    except Exception as e:
        print(f"ERR: {table}.{col} -> {e}")

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

# 2. students table columns
add_col("students", "gender", "VARCHAR(50)", "'Male'")
add_col("students", "age", "INTEGER", "20")
add_col("students", "bio", "TEXT", "''")
add_col("students", "dob", "VARCHAR(50)", "''")
add_col("students", "division", "VARCHAR(50)", "''")
add_col("students", "stance", "VARCHAR(50)", "'regular'")
add_col("students", "surf_stats", "TEXT", "'{}'")
add_col("students", "performance_logs", "TEXT", "'[]'")
add_col("students", "whatsapp_number", "VARCHAR(50)", "''")
add_col("students", "guests_count", "INTEGER", "1")
add_col("students", "course_duration", "VARCHAR(100)", "'3 Days Course'")
add_col("students", "start_date", "VARCHAR(50)", "''")
add_col("students", "end_date", "VARCHAR(50)", "''")
add_col("students", "session_time", "VARCHAR(50)", "'Morning 6:00 AM'")
add_col("students", "staying_at_school", "VARCHAR(20)", "'Yes'")
add_col("students", "reminder_preference", "VARCHAR(50)", "'WhatsApp Text'")
add_col("students", "reminder_sent", "BOOLEAN", "FALSE")
add_col("students", "guests_details", "TEXT", "'[]'")
add_col("students", "invite_token", "VARCHAR(128)", "NULL")
add_col("students", "school", "VARCHAR(150)", "'Aquatic Indica Surf School'")
add_col("students", "approval_status", "VARCHAR(50)", "'approved'")
add_col("students", "swimming_ability", "VARCHAR(50)", "'Swimmer'")

# 3. instructors table columns
add_col("instructors", "email", "VARCHAR", "''")
add_col("instructors", "dob", "VARCHAR", "''")
add_col("instructors", "bio", "TEXT", "''")
add_col("instructors", "specializations", "TEXT", "''")
add_col("instructors", "rates", "VARCHAR", "''")
add_col("instructors", "location", "VARCHAR", "''")
add_col("instructors", "rating", "FLOAT", "5.0")
add_col("instructors", "image", "VARCHAR", "''")
add_col("instructors", "reviews", "TEXT", "''")
add_col("instructors", "languages", "TEXT", "'[\"English\"]'")
add_col("instructors", "intro_video", "VARCHAR", "''")
add_col("instructors", "price", "FLOAT", "100.00")
add_col("instructors", "school", "VARCHAR", "'Individual / Freelance Coach'")

# 4. users table columns
add_col("users", "created_by_school", "BOOLEAN", "false")
add_col("users", "approval_status", "VARCHAR(50)", "'approved'")
add_col("users", "auth_provider", "VARCHAR(50)", "'email'")
add_col("users", "social_id", "VARCHAR", "NULL")
add_col("users", "password_plain", "VARCHAR", "NULL")
add_col("users", "name", "VARCHAR", "''")

# 5. sessions table columns
add_col("sessions", "image_url", "VARCHAR", "''")
add_col("sessions", "video_url", "VARCHAR", "''")
add_col("sessions", "group_name", "VARCHAR(200)", "''")
add_col("sessions", "student_name", "VARCHAR(200)", "''")
add_col("sessions", "guest_name", "VARCHAR(200)", "''")

# 6. activity_log table columns
add_col("activity_log", "school", "VARCHAR(150)", "'Aquatic Indica Surf School'")

# 7. school_invite_links table
if engine.dialect.name == "sqlite":
    run_sql("""
    CREATE TABLE IF NOT EXISTS school_invite_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(128) UNIQUE NOT NULL,
        school VARCHAR(150) NOT NULL,
        max_count INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        course_duration VARCHAR(100) DEFAULT '3 Days Course',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
    );
    """)
else:
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

add_col("school_invite_links", "course_duration", "VARCHAR(100)", "'3 Days Course'")

print("MIGRATION_SUCCESS")
