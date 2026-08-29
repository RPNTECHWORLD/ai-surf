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
    print("[INFO] Generating AWS IAM token for database migration...")
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

    print("[INFO] Connecting to AWS RDS PostgreSQL...")
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        database=db_name,
        password=token,
        sslmode="require"
    )
    cursor = conn.cursor()

    print("[INFO] Applying migration to users table...")
    # Add created_by_school to users table
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_school BOOLEAN DEFAULT FALSE;")
    
    # Also add password_plain if not exists (to match SQLite columns)
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR;")
    
    conn.commit()
    print("[SUCCESS] Migrations successfully applied to AWS RDS PostgreSQL!")
    cursor.close()
    conn.close()
except Exception as e:
    print("[ERROR] Migration failed:", str(e))
