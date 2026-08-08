import os, boto3, psycopg2
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
cur.execute("SELECT id, email, password_hash, school_name, admin_id FROM school_admins WHERE LOWER(email) = 'ericsheldon04@gmail.com'")
row = cur.fetchone()
print("QUERY_RESULT:", row)
cur.close()
conn.close()
