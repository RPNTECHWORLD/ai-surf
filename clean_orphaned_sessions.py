import os
import psycopg2
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

# Load database config
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL not found in backend/.env")
    exit(1)

try:
    print("[INFO] Connecting to AWS RDS PostgreSQL to delete orphaned sessions...")
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

    # Find and delete sessions where student does not exist or student_id is null
    cursor.execute("""
        DELETE FROM sessions 
        WHERE student_id IS NULL 
           OR student_id NOT IN (SELECT id FROM students);
    """)
    deleted_count = cursor.rowcount
    conn.commit()
    print(f"[SUCCESS] Deleted {deleted_count} orphaned sessions without valid students!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print("[ERROR] Cleanup failed:", str(e))
