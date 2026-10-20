import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(dbname='surfing_db', user='postgres', password='eric@2004', host='localhost', port=5432)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = [r['table_name'] for r in cur.fetchall()]

for t in tables:
    try:
        cur.execute(f"SELECT * FROM {t} WHERE id = 214")
        res = cur.fetchall()
        if res:
            print(f"Found in {t}:", [dict(x) for x in res])
    except Exception:
        conn.rollback()

# Also search for any student with Eric or Sheldon
cur.execute("SELECT * FROM students WHERE name ILIKE '%Eric%' OR name ILIKE '%Sheldon%'")
print("STUDENTS LIKE ERIC:", [dict(x) for x in cur.fetchall()])

# Also search for any user with Eric or Sheldon
cur.execute("SELECT * FROM users WHERE email ILIKE '%eric%'")
print("USERS LIKE ERIC:", [dict(x) for x in cur.fetchall()])
