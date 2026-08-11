import os
from sqlalchemy import create_engine, event
from urllib.parse import urlparse
import boto3

def migrate():
    DATABASE_URL = 'postgresql://postgres@database-2.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com:5432/postgres'
    parsed = urlparse(DATABASE_URL)
    db_host = parsed.hostname
    db_port = parsed.port or 5432
    db_user = parsed.username or 'postgres'
    db_name = parsed.path.lstrip('/')

    connection_uri = f'postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}'
    engine = create_engine(connection_uri, connect_args={'sslmode': 'require'})

    @event.listens_for(engine, "do_connect")
    def provide_token(dialect, conn_rec, cargs, cparams):
        client = boto3.client("rds", region_name="us-east-1")
        token = client.generate_db_auth_token(
            DBHostname=db_host,
            Port=db_port,
            DBUsername=db_user,
            Region="us-east-1"
        )
        cparams["password"] = token

    conn = engine.raw_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255)')
        conn.commit()
        print('Column password_plain added successfully!')
    except Exception as e:
        print('Migration Error:', e)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    migrate()
