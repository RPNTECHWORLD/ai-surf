import psycopg2
import json

conn = psycopg2.connect(
    dbname="surfing_db",
    user="postgres",
    password="eric@2004",
    host="localhost",
    port=5432
)
cur = conn.cursor()

correct_slots = [
    {
        "id": 1,
        "startTime": "06:30 AM",
        "time": "06:30 AM - 08:30 AM",
        "duration": "120",
        "maxStudents": 10,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "active": True,
        "title": "120 min · (Daily)"
    },
    {
        "id": 2,
        "startTime": "09:30 AM",
        "time": "09:30 AM - 11:30 AM",
        "duration": "120",
        "maxStudents": 10,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "active": True,
        "title": "120 min · (Daily)"
    },
    {
        "id": 3,
        "startTime": "02:00 PM",
        "time": "02:00 PM - 04:00 PM",
        "duration": "120",
        "maxStudents": 10,
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "active": True,
        "title": "120 min · (Daily)"
    }
]

slots_json = json.dumps(correct_slots)

# 1. Update school_slot_configs
cur.execute("UPDATE school_slot_configs SET slots_json = %s WHERE slot_date = %s OR slot_date IS NULL;", (slots_json, "2026-10-20"))
print(f"Updated school_slot_configs for 2026-10-20 & master: {cur.rowcount} rows")

# Also sanitize any other rows that have maxStudents: 80 or 08:30 AM
cur.execute("SELECT id, slots_json FROM school_slot_configs;")
for s_id, s_raw in cur.fetchall():
    if s_raw and ("80" in s_raw or "08:30 AM" in s_raw):
        try:
            parsed = json.loads(s_raw)
            changed = False
            for s in parsed:
                if s.get("maxStudents") == 80:
                    s["maxStudents"] = 10
                    changed = True
                if s.get("startTime") == "08:30 AM":
                    s["startTime"] = "06:30 AM"
                    s["time"] = "06:30 AM - 08:30 AM"
                    s["duration"] = "120"
                    changed = True
            if changed:
                cur.execute("UPDATE school_slot_configs SET slots_json = %s WHERE id = %s;", (json.dumps(parsed), s_id))
                print(f"Sanitized slots for school_slot_configs id {s_id}")
        except Exception as e:
            pass

# 2. Update sessions table for 2026-10-20
cur.execute("""
    UPDATE sessions 
    SET time = '06:30 AM - 08:30 AM', duration_mins = 120 
    WHERE date LIKE '%2026-10-20%' OR date LIKE '%Oct 20, 2026%';
""")
print(f"Updated sessions: {cur.rowcount} rows")

# 3. Update session_drafts
cur.execute("SELECT id, draft_data FROM session_drafts WHERE session_date = '2026-10-20';")
rows = cur.fetchall()
for d_id, d_data in rows:
    try:
        draft = json.loads(d_data)
        draft["capacity"] = 10
        draft["slotCapacityMap"] = {"1": 10, "2": 10, "3": 10}
        for g in draft.get("trainingGroups", []):
            g["slotId"] = 1
        cur.execute("UPDATE session_drafts SET draft_data = %s WHERE id = %s;", (json.dumps(draft), d_id))
        print(f"Updated session_draft {d_id}")
    except Exception as e:
        print("Error updating draft:", e)

conn.commit()
cur.close()
conn.close()
print("DATABASE SYNC FINISHED SUCCESSFULLY!")
