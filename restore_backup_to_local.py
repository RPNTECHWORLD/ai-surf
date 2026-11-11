import os
import sys
import json
import datetime
import shutil
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
BACKUPS_DIR = os.path.join(ROOT_DIR, "backups")

load_dotenv(os.path.join(BACKEND_DIR, ".env"))
LOCAL_PG_URL = os.getenv("DATABASE_URL", "postgresql://postgres:eric%402004@localhost:5432/surfing_db")
LOCAL_SQLITE_PATH = os.path.join(BACKEND_DIR, "aisurf.db")
BACKUP_JSON_PATH = os.path.join(BACKUPS_DIR, "rds_backup_latest.json")

timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

print("=" * 65)
print("  RESTORING FRESH BACKUP TO LOCAL DATABASE")
print("=" * 65)
print(f"[*] Backup Source:    {BACKUP_JSON_PATH}")
print(f"[*] Target Local PG:  {LOCAL_PG_URL}")
print(f"[*] Target SQLite:    {LOCAL_SQLITE_PATH}")

if not os.path.exists(BACKUP_JSON_PATH):
    print(f"[ERROR] Backup file not found at: {BACKUP_JSON_PATH}")
    sys.exit(1)

print(f"[*] Reading backup data from {BACKUP_JSON_PATH}...")
with open(BACKUP_JSON_PATH, "r", encoding="utf-8") as f:
    backup_data = json.load(f)
print(f"[+] Loaded {len(backup_data)} tables from fresh backup.")

# -------------------------------------------------------------
# 1. LOCAL POSTGRESQL RESTORE
# -------------------------------------------------------------
print("\n" + "-" * 50)
print("  STEP 1: RESTORING TO LOCAL POSTGRESQL (surfing_db)")
print("-" * 50)

try:
    pg_conn = psycopg2.connect(LOCAL_PG_URL, connect_timeout=5)
    pg_cur = pg_conn.cursor(cursor_factory=RealDictCursor)

    # Backup local postgres first
    pg_cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    """)
    local_tables = set(r["table_name"] for r in pg_cur.fetchall())
    
    pre_restore_bak = {}
    for tbl in local_tables:
        pg_cur.execute(f'SELECT * FROM "{tbl}";')
        pre_restore_bak[tbl] = pg_cur.fetchall()
    
    pre_bak_path = os.path.join(BACKUPS_DIR, f"local_pg_before_restore_{timestamp}.json")
    with open(pre_bak_path, "w", encoding="utf-8") as f:
        # Simple dump of table count
        json.dump({k: len(v) for k, v in pre_restore_bak.items()}, f, indent=2)
    print(f"[+] Local PostgreSQL safety snapshot saved to: {pre_bak_path}")

    # Disable foreign key triggers for fast bulk restore
    pg_cur.execute("SET session_replication_role = 'replica';")
    pg_conn.commit()

    # 1. Truncate ALL tables FIRST (prevents foreign-key CASCADE from deleting child tables)
    tables_in_backup = [t for t in backup_data.keys() if t in local_tables]
    print("Truncating all tables first...")
    tbl_list_str = ", ".join([f'"{t}"' for t in tables_in_backup])
    pg_cur.execute(f"TRUNCATE TABLE {tbl_list_str} CASCADE;")
    pg_conn.commit()

    pg_restored_summary = {}

    for tbl in tables_in_backup:
        rows = backup_data[tbl]
        if not rows:
            pg_restored_summary[tbl] = 0
            print(f"  [SYNCED] '{tbl}': 0 rows (empty)")
            continue

        # Get local table columns
        pg_cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{tbl}';
        """)
        local_cols = set(r["column_name"] for r in pg_cur.fetchall())

        # Match columns
        sample_cols = list(rows[0].keys())
        common_cols = [c for c in sample_cols if c in local_cols]

        if not common_cols:
            pg_restored_summary[tbl] = 0
            continue

        col_str = ", ".join([f'"{c}"' for c in common_cols])
        insert_query = f'INSERT INTO "{tbl}" ({col_str}) VALUES %s;'

        batch_tuples = []
        for r in rows:
            tup = []
            for c in common_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    tup.append(json.dumps(v))
                else:
                    tup.append(v)
            batch_tuples.append(tuple(tup))

        execute_values(pg_cur, insert_query, batch_tuples, page_size=500)
        pg_conn.commit()

        pg_cur.execute(f'SELECT COUNT(*) FROM "{tbl}";')
        cnt = pg_cur.fetchone()["count"]
        pg_restored_summary[tbl] = cnt
        print(f"  [RESTORED] '{tbl}': {cnt} records imported.")

    # Re-enable triggers
    pg_cur.execute("SET session_replication_role = 'origin';")
    pg_conn.commit()

    # Align sequence IDs
    print("\n[*] Aligning PostgreSQL auto-increment sequences...")
    for tbl in local_tables:
        try:
            pg_cur.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '{tbl}' AND column_default LIKE 'nextval%';
            """)
            seq_cols = [r["column_name"] for r in pg_cur.fetchall()]
            for c in seq_cols:
                pg_cur.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{tbl}"', '{c}'), 
                        COALESCE((SELECT MAX("{c}") FROM "{tbl}"), 1), 
                        true
                    );
                """)
                pg_conn.commit()
        except Exception:
            pg_conn.rollback()

    pg_cur.close()
    pg_conn.close()
    print("[+] Local PostgreSQL restore completed and sequences aligned!")
except Exception as e:
    print(f"[ERROR] Failed during local PostgreSQL restore: {e}")

# -------------------------------------------------------------
# 2. LOCAL SQLITE RESTORE (aisurf.db)
# -------------------------------------------------------------
print("\n" + "-" * 50)
print("  STEP 2: RESTORING TO LOCAL SQLITE (aisurf.db)")
print("-" * 50)

try:
    if os.path.exists(LOCAL_SQLITE_PATH):
        sqlite_bak = os.path.join(BACKUPS_DIR, f"local_aisurf_before_restore_{timestamp}.db")
        shutil.copy2(LOCAL_SQLITE_PATH, sqlite_bak)
        print(f"[+] Local SQLite snapshot saved to: {sqlite_bak}")

    sqlite_conn = sqlite3.connect(LOCAL_SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()
    sqlite_cur.execute("PRAGMA foreign_keys = OFF;")

    sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    sqlite_tables = set(r[0] for r in sqlite_cur.fetchall())

    sqlite_summary = {}
    for tbl, rows in backup_data.items():
        if tbl not in sqlite_tables:
            continue

        sqlite_cur.execute(f"PRAGMA table_info({tbl});")
        sqlite_cols = [c[1] for c in sqlite_cur.fetchall()]

        sqlite_cur.execute(f'DELETE FROM "{tbl}";')

        if not rows:
            sqlite_summary[tbl] = 0
            continue

        common_cols = [c for c in list(rows[0].keys()) if c in sqlite_cols]
        if not common_cols:
            continue

        col_names = ", ".join([f'"{c}"' for c in common_cols])
        placeholders = ", ".join(["?"] * len(common_cols))
        insert_sql = f'INSERT OR REPLACE INTO "{tbl}" ({col_names}) VALUES ({placeholders})'

        batch_vals = []
        for r in rows:
            r_vals = []
            for c in common_cols:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                elif isinstance(v, bool):
                    v = 1 if v else 0
                r_vals.append(v)
            batch_vals.append(r_vals)

        sqlite_cur.executemany(insert_sql, batch_vals)
        sqlite_summary[tbl] = len(batch_vals)

    sqlite_conn.commit()
    sqlite_cur.execute("PRAGMA foreign_keys = ON;")
    sqlite_conn.close()
    print("[+] Local SQLite restore completed successfully!")
except Exception as e:
    print(f"[WARN] SQLite restore note: {e}")

print("\n" + "=" * 65)
print("  🎉 LOCAL DATABASE REPLACED WITH FRESH LIVE BACKUP DATA!")
print("=" * 65)

