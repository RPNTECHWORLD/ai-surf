import sqlite3

con = sqlite3.connect('aisurf.db')
cur = con.cursor()
cols = [c[1] for c in cur.execute('PRAGMA table_info(sessions)').fetchall()]
print('Columns in sessions:', cols)
if 'instructor_ids' not in cols:
    cur.execute("ALTER TABLE sessions ADD COLUMN instructor_ids TEXT DEFAULT '[]'")
    con.commit()
    print('Added instructor_ids column to sessions table')
else:
    print('instructor_ids already exists')
