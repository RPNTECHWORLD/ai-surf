from main import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email VARCHAR;"))
        conn.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS dob VARCHAR;"))
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_by_school BOOLEAN DEFAULT 0;"))
        except Exception:
            pass
        conn.commit()
        print("MIGRATION_SUCCESS")
except Exception as e:
    print("MIGRATION_ERROR:", e)
