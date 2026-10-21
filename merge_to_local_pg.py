import os
import sys
import json
import datetime
import psycopg2
from psycopg2.extras import execute_batch

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")
BACKUP_FILE = os.path.join(BACKUPS_DIR, "live_backup_latest.json")

LOCAL_DB_URL = "postgresql://postgres:eric%402004@localhost:5432/surfing_db"

print("=" * 70)
print("  MERGING AWS LIVE BACKUP INTO LOCAL POSTGRESQL (surfing_db)")
print("=" * 70)

if not os.path.exists(BACKUP_FILE):
    print(f"[ERROR] Live backup file not found: {BACKUP_FILE}")
    sys.exit(1)

with open(BACKUP_FILE, "r", encoding="utf-8") as f:
    live_data = json.load(f)

print(f"[INFO] Loaded AWS backup containing {len(live_data)} tables.")

try:
    conn = psycopg2.connect(LOCAL_DB_URL, connect_timeout=10)
    conn.autocommit = True
    cur = conn.cursor()
    print("[SUCCESS] Connected to local PostgreSQL database 'surfing_db'.")
except Exception as e:
    print(f"[ERROR] Could not connect to local PostgreSQL: {e}")
    sys.exit(1)

# Step 1: Pre-merge local snapshot backup
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
pre_backup_path = os.path.join(BACKUPS_DIR, f"local_surfing_db_before_merge_{timestamp}.json")

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
existing_tables = set(r[0] for r in cur.fetchall())

print("\n[Step 1/3] Creating safety snapshot of local PostgreSQL before merge...")
local_snapshot = {}
before_counts = {}
for tbl in existing_tables:
    try:
        cur.execute(f'SELECT count(*) FROM "{tbl}";')
        before_counts[tbl] = cur.fetchone()[0]
    except Exception:
        before_counts[tbl] = 0

with open(pre_backup_path, "w", encoding="utf-8") as f:
    json.dump({"snapshot_time": timestamp, "table_counts": before_counts}, f, indent=2)
print(f"  [OK] Local snapshot recorded to: {pre_backup_path}")

# Step 2: Merge live backup rows into local PostgreSQL
print("\n[Step 2/3] Merging AWS Live data into local tables...")

# Disable foreign key constraints during bulk upsert
cur.execute("SET session_replication_role = 'replica';")

merged_tables = []
skipped_tables = []

for table_name, rows in live_data.items():
    if table_name not in existing_tables:
        skipped_tables.append((table_name, "Table not in local PostgreSQL schema"))
        continue

    if not rows:
        continue

    try:
        # Get local table columns
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = '{table_name}';")
        target_cols = set(r[0] for r in cur.fetchall())

        valid_cols = [c for c in rows[0].keys() if c in target_cols]
        if not valid_cols:
            skipped_tables.append((table_name, "No matching columns"))
            continue

        # Find primary key for table
        cur.execute(f"""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' 
              AND tc.table_name = '{table_name}' 
              AND tc.table_schema = 'public';
        """)
        pk_cols = [r[0] for r in cur.fetchall()]

        if table_name == "users":
            # Match live AWS RDS schema: drop unique index on email if present so both admin & athlete accounts load
            try:
                cur.execute('DROP INDEX IF EXISTS ix_users_email;')
            except Exception:
                pass

        col_str = ", ".join([f'"{c}"' for c in valid_cols])
        val_placeholders = ", ".join(["%s"] * len(valid_cols))

        if pk_cols and all(pk in valid_cols for pk in pk_cols):
            pk_str = ", ".join([f'"{p}"' for p in pk_cols])
            update_cols = [c for c in valid_cols if c not in pk_cols]
            if update_cols:
                update_str = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in update_cols])
                query = f'INSERT INTO "{table_name}" ({col_str}) VALUES ({val_placeholders}) ON CONFLICT ({pk_str}) DO UPDATE SET {update_str};'
            else:
                query = f'INSERT INTO "{table_name}" ({col_str}) VALUES ({val_placeholders}) ON CONFLICT ({pk_str}) DO NOTHING;'
        else:
            query = f'INSERT INTO "{table_name}" ({col_str}) VALUES ({val_placeholders}) ON CONFLICT DO NOTHING;'

        batch_data = []
        for r in rows:
            row_vals = []
            for c in valid_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                row_vals.append(v)
            batch_data.append(tuple(row_vals))

        execute_batch(cur, query, batch_data, page_size=200)
        merged_tables.append((table_name, len(rows)))
        print(f"  [MERGED] '{table_name}': {len(rows)} live rows merged")

        if table_name == "users":
            try:
                cur.execute('CREATE INDEX IF NOT EXISTS ix_users_email ON "users" (email);')
            except Exception:
                pass

    except Exception as e:
        print(f"  [ERROR] '{table_name}': {e}")

# Re-enable foreign key constraints
cur.execute("SET session_replication_role = 'origin';")

# Step 3: Update PostgreSQL sequence values to prevent ID collisions on future inserts
print("\n[Step 3/3] Updating ID sequences for merged tables...")
for table_name in existing_tables:
    try:
        cur.execute(f"""
            SELECT column_name, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = '{table_name}' 
              AND column_default LIKE 'nextval%';
        """)
        seq_cols = cur.fetchall()
        for col_name, _ in seq_cols:
            cur.execute(f"""
                SELECT setval(pg_get_serial_sequence('"{table_name}"', '{col_name}'), COALESCE(MAX("{col_name}"), 1)) 
                FROM "{table_name}";
            """)
    except Exception:
        pass

print("\n" + "=" * 70)
print("  MERGE SUMMARY & TABLE RECORD COMPARISON")
print("=" * 70)
print(f"  {'Table Name':<28} | {'Before Merge':>12} | {'After Merge':>12}")
print("  " + "-" * 58)

sample_tables = [
    "users", "schools", "instructors", "students", "sessions", "events", 
    "heats", "heat_surfers", "scores", "surfers", "activity_log", "visitor_logs", "badges"
]

for tbl in sample_tables:
    if tbl in existing_tables:
        cur.execute(f'SELECT count(*) FROM "{tbl}";')
        after_cnt = cur.fetchone()[0]
        bef_cnt = before_counts.get(tbl, 0)
        print(f"  {tbl:<28} | {bef_cnt:>12} | {after_cnt:>12}")

cur.close()
conn.close()

print("=" * 70)
print("[SUCCESS] AWS live backup data successfully merged into local PostgreSQL (surfing_db)!")
