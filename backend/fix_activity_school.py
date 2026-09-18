import sqlite3

conn = sqlite3.connect('aisurf.db')
cur = conn.cursor()

# Show all schools in DB
cur.execute("SELECT DISTINCT name FROM schools LIMIT 10")
schools = cur.fetchall()
print("Schools:", schools)

# Show all instructors with school
cur.execute("SELECT id, name, school FROM instructors LIMIT 10")
instructors = cur.fetchall()
print("\nInstructors:")
for i in instructors:
    print(i)

# Show all students with school
cur.execute("SELECT id, name, school FROM students LIMIT 10")
students = cur.fetchall()
print("\nStudents:")
for s in students:
    print(s)

# For each null-school activity, try to figure out school by text matching
cur.execute("SELECT id, text FROM activity_log WHERE school IS NULL")
null_records = cur.fetchall()

# Build lookup maps
cur.execute("SELECT name, school FROM instructors WHERE school IS NOT NULL")
inst_map = {row[0]: row[1] for row in cur.fetchall()}

cur.execute("SELECT name, school FROM students WHERE school IS NOT NULL")
stu_map = {row[0]: row[1] for row in cur.fetchall()}

print("\n\nInstructor map:", inst_map)
print("Student map:", stu_map)

updated = 0
for act_id, text in null_records:
    school_found = None
    # Check if any instructor name appears in text
    for name, school in inst_map.items():
        if name and name in text:
            school_found = school
            break
    # Check if any student name appears in text
    if not school_found:
        for name, school in stu_map.items():
            if name and name in text:
                school_found = school
                break
    
    if school_found:
        cur.execute("UPDATE activity_log SET school = ? WHERE id = ?", (school_found, act_id))
        updated += 1
        print(f"  Set school='{school_found}' for: {text[:60]}")
    else:
        # Default fallback - assign to Aquatic Indica
        cur.execute("UPDATE activity_log SET school = 'Aquatic Indica Surf School' WHERE id = ?", (act_id,))
        print(f"  Fallback school for: {text[:60]}")
        updated += 1

conn.commit()
print(f"\nUpdated {updated} records")

# Final check
cur.execute("SELECT id, text, school FROM activity_log ORDER BY id DESC LIMIT 10")
print("\nFinal state:")
for r in cur.fetchall():
    print(r)

conn.close()
