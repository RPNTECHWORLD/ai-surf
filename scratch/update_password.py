import os, boto3, psycopg2, bcrypt
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres@database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com:5432/postgres"
parsed = urlparse(DATABASE_URL)
db_host = parsed.hostname
db_port = parsed.port or 5432
db_user = parsed.username or "postgres"
db_name = parsed.path.lstrip("/")

client = boto3.client("rds", region_name="us-east-1")
token = client.generate_db_auth_token(
    DBHostname=db_host,
    Port=db_port,
    DBUsername=db_user,
    Region="us-east-1"
)

conn = psycopg2.connect(
    host=db_host,
    port=db_port,
    user=db_user,
    password=token,
    database=db_name,
    sslmode="require"
)
cur = conn.cursor()

# Generate new bcrypt hash for "eric123"
new_hash = bcrypt.hashpw(b"eric123", bcrypt.gensalt(12)).decode('utf-8')

# Update school_admins table
cur.execute("UPDATE school_admins SET password_hash = %s WHERE LOWER(email) = 'ericsheldon04@gmail.com'", (new_hash,))
conn.commit()

print(f"PASSWORD_RESET_SUCCESSFUL: Hash set to {new_hash}")

cur.close()
conn.close()
