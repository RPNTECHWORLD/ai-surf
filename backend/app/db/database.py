import os
import boto3
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

def get_db_uri():
    raw_uri = os.getenv("POSTGRES_URI") or os.getenv("DATABASE_URL")
    if raw_uri and "postgresql://" in raw_uri and "database-3" not in raw_uri:
        return raw_uri

    region = os.getenv("AWS_REGION", "us-east-1")
    hostname = os.getenv("RDS_HOSTNAME", "database-3.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com")
    
    try:
        rds = boto3.client(
            "rds",
            region_name=region,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
        )
        token = rds.generate_db_auth_token(DBHostname=hostname, Port=5432, DBUsername="postgres", Region=region)
        return f"postgresql://postgres:{token}@{hostname}:5432/postgres?sslmode=require"
    except Exception as e:
        db_password = os.getenv("RDS_PASSWORD", "")
        return f"postgresql://postgres:{db_password}@{hostname}:5432/postgres?sslmode=require"

POSTGRES_URI = get_db_uri()

engine = create_engine(
    POSTGRES_URI,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
