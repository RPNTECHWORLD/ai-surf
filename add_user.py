import os
import hashlib
import psycopg2
from urllib.parse import urlparse
import boto3
from dotenv import load_dotenv

# Load database config from AiSurf backend .env
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL not found in backend/.env")
    exit(1)

# Hashing algorithm matching AiSurf backend
def hash_password(password: str) -> str:
    salt = b"aisurfsalt12345"
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return pwd_hash.hex()

try:
    print("[INFO] Parsing DATABASE_URL and generating dynamic AWS IAM token...")
    parsed = urlparse(DATABASE_URL)
    db_host = parsed.hostname
    db_port = parsed.port or 5432
    db_user = parsed.username or "postgres"
    db_name = parsed.path.lstrip("/")

    # Generate the AWS RDS auth token
    rds_client = boto3.client("rds", region_name=os.getenv("AWS_REGION", "us-east-1"))
    token = rds_client.generate_db_auth_token(
        DBHostname=db_host,
        Port=db_port,
        DBUsername=db_user,
        Region=os.getenv("AWS_REGION", "us-east-1")
    )

    print("[INFO] Connecting to PostgreSQL using IAM token...")
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        database=db_name,
        password=token,
        sslmode="require"
    )
    cursor = conn.cursor()
    
    email = "rpntechworld@gmail.com"
    pwd = "12345678"
    hashed = hash_password(pwd)
    
    # Check if user already exists
    cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
    existing = cursor.fetchone()
    
    if existing:
        print(f"[INFO] User {email} already exists in 'users' table. Updating password...")
        cursor.execute(
            'UPDATE users SET password_hash = %s, role = %s WHERE email = %s',
            (hashed, "admin", email)
        )
    else:
        print(f"[INFO] Creating user {email} in 'users' table...")
        cursor.execute(
            'INSERT INTO users (email, password_hash, role, auth_provider, created_at) VALUES (%s, %s, %s, %s, NOW())',
            (email, hashed, "admin", "email")
        )
        
    conn.commit()
    cursor.close()
    conn.close()
    print("[SUCCESS] User successfully added/updated in the AiSurf users table!")
except Exception as e:
    print("[ERROR] Failed to add user to PostgreSQL:", str(e))
