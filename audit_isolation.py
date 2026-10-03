import os
import psycopg2
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
parsed = urlparse(DATABASE_URL)
rds_client = boto3.client("rds", region_name="us-east-1")
token = rds_client.generate_db_auth_token(
    DBHostname=parsed.hostname,
    Port=parsed.port or 5432,
    DBUsername=parsed.username or "postgres",
    Region="us-east-1"
)

conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port or 5432,
    user=parsed.username or "postgres",
    database=parsed.path.lstrip("/"),
    password=token,
    sslmode="require"
)
cur = conn.cursor()

print("=" * 60)
print("1. REGISTERED SURF SCHOOLS IN AWS RDS")
print("=" * 60)
cur.execute("SELECT id, name, owner, email FROM schools ORDER BY id ASC;")
for sc in cur.fetchall():
    print(f"School #{sc[0]}: '{sc[1]}' (Email: {sc[3]})")

print("\n" + "=" * 60)
print("2. STUDENTS BREAKDOWN BY SCHOOL")
print("=" * 60)
cur.execute("SELECT COALESCE(school, ''), COUNT(*), string_agg(name, ', ') FROM students GROUP BY school ORDER BY COUNT(*) DESC;")
for row in cur.fetchall():
    sch = row[0] if row[0] else "[NO SCHOOL / EMPTY]"
    count = row[1]
    st_list = row[2] or ""
    preview = (st_list[:90] + "...") if len(st_list) > 90 else st_list
    print(f"* '{sch}': {count} students")
    print(f"   -> {preview}")

print("\n" + "=" * 60)
print("3. COACHES / INSTRUCTORS BREAKDOWN BY SCHOOL")
print("=" * 60)
cur.execute("SELECT COALESCE(school, ''), COUNT(*), string_agg(name, ', ') FROM instructors GROUP BY school ORDER BY COUNT(*) DESC;")
for row in cur.fetchall():
    sch = row[0] if row[0] else "[NO SCHOOL / FREELANCE]"
    count = row[1]
    inst_list = row[2] or ""
    preview = (inst_list[:90] + "...") if len(inst_list) > 90 else inst_list
    print(f"* '{sch}': {count} coaches")
    print(f"   -> {preview}")

print("\n" + "=" * 60)
print("4. SESSIONS BREAKDOWN BY SCHOOL")
print("=" * 60)
cur.execute("SELECT COALESCE(school, ''), COUNT(*) FROM sessions GROUP BY school ORDER BY COUNT(*) DESC;")
for row in cur.fetchall():
    sch = row[0] if row[0] else "[NO SCHOOL / EMPTY]"
    print(f"* '{sch}': {row[1]} sessions")

conn.close()
