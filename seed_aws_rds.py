import os
from urllib.parse import urlparse
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import boto3
import json

# Load env
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
print("Connecting to:", DATABASE_URL)

try:
    if "amazonaws.com" in DATABASE_URL:
        parsed = urlparse(DATABASE_URL)
        db_host = parsed.hostname
        db_port = parsed.port or 5432
        db_user = parsed.username or "postgres"
        db_name = parsed.path.lstrip("/")
        
        connection_uri = f"postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}"
        engine = create_engine(connection_uri, connect_args={"sslmode": "require", "connect_timeout": 5})
        
        @event.listens_for(engine, "do_connect")
        def provide_token(dialect, conn_rec, cargs, cparams):
            client = boto3.client("rds", region_name=os.getenv("AWS_REGION", "us-east-1"))
            token = client.generate_db_auth_token(
                DBHostname=db_host,
                Port=db_port,
                DBUsername=db_user,
                Region=os.getenv("AWS_REGION", "us-east-1")
            )
            cparams["password"] = token

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Import seed function
        import sys
        sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
        from main import seed_database
        
        print("[INFO] Seeding AWS RDS PostgreSQL database with force=True...")
        with SessionLocal() as db:
            seed_database(db, force=True)
            print("[SUCCESS] AWS RDS PostgreSQL database seeded successfully with demo data!")
except Exception as e:
    print("[ERROR] Failed to seed AWS RDS PostgreSQL:", str(e))
