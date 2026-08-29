import os
import psycopg2
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

parsed = urlparse(DATABASE_URL)
db_host = parsed.hostname
db_port = parsed.port or 5432
db_user = parsed.username or "postgres"
db_name = parsed.path.lstrip("/")

rds_client = boto3.client("rds", region_name=os.getenv("AWS_REGION", "us-east-1"))
token = rds_client.generate_db_auth_token(
    DBHostname=db_host,
    Port=db_port,
    DBUsername=db_user,
    Region=os.getenv("AWS_REGION", "us-east-1")
)

conn = psycopg2.connect(
    host=db_host,
    port=db_port,
    user=db_user,
    database=db_name,
    password=token,
    sslmode="require"
)
cursor = conn.cursor()

print("--- INSTRUCTORS ---")
cursor.execute("SELECT id, name, email FROM instructors;")
for row in cursor.fetchall():
    print(row)

print("\n--- STUDENTS ---")
cursor.execute("SELECT id, name, email FROM students;")
for row in cursor.fetchall():
    print(row)

print("\n--- USERS ---")
cursor.execute("SELECT id, email, role FROM users;")
for row in cursor.fetchall():
    print(row)

cursor.close()
conn.close()
