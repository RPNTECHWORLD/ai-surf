import os
import sys
import json
import sqlite3
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
AQUATICX_DIR = os.path.join(ROOT_DIR, "aquaticxsportssoftware", "backend")
BACKUP_FILE = os.path.join(ROOT_DIR, "backups", "rds_backup_latest.json")

print("=" * 60)
print("  LOADING AWS RDS BACKUP INTO LOCAL DATABASES")
print("=" * 60)

if not os.path.exists(BACKUP_FILE):
    print(f"[ERROR] Backup file not found: {BACKUP_FILE}")
    sys.exit(1)

with open(BACKUP_FILE, "r", encoding="utf-8") as f:
    backup_data = json.load(f)

print(f"[INFO] Loaded backup with {len(backup_data)} tables.")

def sync_to_sqlite(db_path, target_tables=None, description=""):
    print(f"\n--- Syncing to {description}: {db_path} ---")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Backup existing SQLite file
    if os.path.exists(db_path):
        bak_path = db_path + ".bak"
        shutil.copy2(db_path, bak_path)
        print(f"  [BACKUP] Existing file backed up to {bak_path}")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = OFF;")

    for tbl, rows in backup_data.items():
        if target_tables and tbl not in target_tables:
            continue

        if not rows:
            print(f"  [EMPTY] Table '{tbl}' has 0 rows in backup.")
            continue

        sample_row = rows[0]
        sample_cols = list(sample_row.keys())

        # Check if table exists in SQLite
        cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{tbl}';")
        exists = cur.fetchone() is not None

        if exists:
            # Check if id column is INTEGER PRIMARY KEY while AWS has non-int id
            cur.execute(f"PRAGMA table_info(\"{tbl}\");")
            existing_cols_info = cur.fetchall()
            existing_col_names = [c[1] for c in existing_cols_info]
            id_col_info = next((c for c in existing_cols_info if c[1] == 'id'), None)
            
            # Check if any row has string id
            has_str_id = any(isinstance(r.get('id'), str) and not r.get('id', '').isdigit() for r in rows if r.get('id') is not None)
            
            if id_col_info and id_col_info[2].upper() == 'INTEGER' and id_col_info[5] == 1 and has_str_id:
                print(f"  [REBUILD] Table '{tbl}' has INTEGER PK but data has string IDs. Rebuilding with TEXT PK...")
                cur.execute(f"DROP TABLE \"{tbl}\";")
                exists = False

        if not exists:
            # Create table dynamically
            col_defs = []
            for col in sample_cols:
                if col == "id":
                    col_defs.append(f'"{col}" TEXT PRIMARY KEY')
                else:
                    col_defs.append(f'"{col}" TEXT')
            create_sql = f'CREATE TABLE "{tbl}" ({", ".join(col_defs)});'
            cur.execute(create_sql)
            existing_col_names = sample_cols
        else:
            # Add any missing columns to existing table
            cur.execute(f"PRAGMA table_info(\"{tbl}\");")
            existing_col_names = [c[1] for c in cur.fetchall()]
            for col in sample_cols:
                if col not in existing_col_names:
                    try:
                        cur.execute(f'ALTER TABLE "{tbl}" ADD COLUMN "{col}" TEXT;')
                        existing_col_names.append(col)
                    except Exception as e:
                        print(f"    [WARN] Failed to add column {col} to {tbl}: {e}")

        # Clear existing data
        cur.execute(f'DELETE FROM "{tbl}";')

        # Insert rows
        cols_to_insert = [c for c in sample_cols if c in existing_col_names]
        col_names_str = ", ".join([f'"{c}"' for c in cols_to_insert])
        placeholders = ", ".join(["?"] * len(cols_to_insert))
        insert_sql = f'INSERT OR REPLACE INTO "{tbl}" ({col_names_str}) VALUES ({placeholders})'

        batch = []
        for r in rows:
            row_vals = []
            for c in cols_to_insert:
                v = r.get(c)
                if isinstance(v, (dict, list)):
                    row_vals.append(json.dumps(v))
                elif isinstance(v, bool):
                    row_vals.append(1 if v else 0)
                else:
                    row_vals.append(v)
            batch.append(row_vals)

        cur.executemany(insert_sql, batch)
        print(f"  [OK] Table '{tbl}': inserted {len(batch)} rows.")

    conn.commit()
    cur.execute("PRAGMA foreign_keys = ON;")
    conn.close()
    print(f"  [SUCCESS] Finished syncing to {description}.")


# 1. Sync all AI Surf tables + shared tables into backend/aisurf.db
aisurf_db_path = os.path.join(BACKEND_DIR, "aisurf.db")
sync_to_sqlite(aisurf_db_path, description="AI Surf Backend SQLite (aisurf.db)")

# 2. Sync AquaticX tables into aquaticxsportssoftware/backend/database.sqlite
aquaticx_db_path = os.path.join(AQUATICX_DIR, "database.sqlite")
aquaticx_tables = {
    'events', 'surfers', 'event_surfers', 'heats', 'heat_surfers',
    'scores', 'judges', 'judge_assignments', 'invite_links',
    'viewer_heartbeats', 'viewer_stats_history', 'visitor_logs',
    'registrations', 'school_admins', 'super_admins'
}
sync_to_sqlite(aquaticx_db_path, target_tables=aquaticx_tables, description="AquaticX SQLite (database.sqlite)")

print("\n" + "=" * 60)
print("  ALL LOCAL DATABASES SYNCED TO EXACT AWS RDS DATA!")
print("=" * 60)
