from main import engine
from sqlalchemy import text

def run_sql(stmt):
    try:
        with engine.connect() as conn:
            conn.execute(text(stmt))
            conn.commit()
            print(f"OK: {stmt.strip()[:50]}...")
    except Exception as e:
        print(f"SKIP/ERR: {stmt.strip()[:50]}... -> {e}")

run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS email VARCHAR;")
run_sql("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS dob VARCHAR;")
run_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_school BOOLEAN DEFAULT false;")
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
print("MIGRATION_SUCCESS")
