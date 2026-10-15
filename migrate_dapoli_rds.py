import os
import psycopg2
import boto3
from urllib.parse import urlparse
from dotenv import load_dotenv

# Try to find .env in current or backend directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(env_path)

clusters = [
    "aisurf-db-cluster.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com",
    "database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com"
]
db_port = 5432
db_user = "postgres"
db_name = "postgres"
region = os.getenv("AWS_REGION", "us-east-1")
rds_client = boto3.client("rds", region_name=region)

for db_host in clusters:
    print(f"\n--- Connecting to RDS cluster: {db_host} ---")
    try:
        token = rds_client.generate_db_auth_token(
            DBHostname=db_host,
            Port=db_port,
            DBUsername=db_user,
            Region=region
        )
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            database=db_name,
            password=token,
            sslmode="require",
            connect_timeout=10
        )
        cur = conn.cursor()
        print(f"Ensuring columns exist on {db_host}...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS image VARCHAR DEFAULT '';")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR DEFAULT '';")
        cur.execute("ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo VARCHAR DEFAULT '';")

        print(f"Updating Dapoli school location on {db_host}...")
        cur.execute("UPDATE schools SET city = 'Dapoli, Maharashtra', country = '' WHERE name ILIKE '%Dapoli%' OR id = 22;")
        cur.execute("UPDATE instructors SET location = 'Dapoli, Maharashtra' WHERE school ILIKE '%Dapoli%';")
        conn.commit()

        cur.execute("SELECT id, name, city, country FROM schools WHERE name ILIKE '%Dapoli%' OR id = 22;")
        print(f"Dapoli School in {db_host}: {cur.fetchall()}")
        cur.close()
        conn.close()
        print(f"[SUCCESS] Updated {db_host}!")
    except Exception as e:
        print(f"[ERROR] Could not update {db_host}: {e}")

print("Live RDS Database successfully updated!")

# Also update SQLite aisurf.db on EC2 and local
import sqlite3
sqlite_paths = [
    "/home/ec2-user/backend/aisurf.db",
    "/home/ec2-user/aisurf.db",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "aisurf.db"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "aisurf.db")
]

for sp in sqlite_paths:
    if os.path.exists(sp):
        try:
            s_conn = sqlite3.connect(sp)
            s_cur = s_conn.cursor()
            s_cur.execute("UPDATE schools SET city = 'Dapoli, Maharashtra', country = '' WHERE name LIKE '%Dapoli%' OR id = 22;")
            s_cur.execute("UPDATE instructors SET location = 'Dapoli, Maharashtra' WHERE school LIKE '%Dapoli%';")
            s_conn.commit()
            s_cur.execute("SELECT id, name, city FROM schools WHERE name LIKE '%Dapoli%' OR id = 22;")
            print(f"Updated SQLite at {sp}: {s_cur.fetchall()}")
            s_conn.close()
        except Exception as e:
            print(f"SQLite update error for {sp}: {e}")

