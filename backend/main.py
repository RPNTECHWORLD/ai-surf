# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import json
import boto3
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# ─── SQLAlchemy Setup ────────────────────────────────────────────────────────
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, Date, ForeignKey, func, Float, Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session as OrmSession

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aisurf.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        if "amazonaws.com" in DATABASE_URL:
            from urllib.parse import urlparse
            from sqlalchemy import event
            import boto3
            
            parsed = urlparse(DATABASE_URL)
            db_host = parsed.hostname
            db_port = parsed.port or 5432
            db_user = parsed.username or "postgres"
            db_name = parsed.path.lstrip("/")
            
            connection_uri = f"postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}"
            engine = create_engine(connection_uri, connect_args={"sslmode": "require", "connect_timeout": 15})
            
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

            # Verify connection
            with engine.connect() as test_conn:
                pass
        else:
            engine = create_engine(DATABASE_URL)
except Exception as err:
    print(f"Notice: AWS RDS Direct connection error ({err}).")
    DATABASE_URL = "sqlite:///./aisurf.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    password_plain = Column(String, nullable=True)
    role = Column(String, nullable=False)  # "athlete", "coach", "admin"
    auth_provider = Column(String, default="email")  # "email", "google", "apple"
    social_id = Column(String, nullable=True)
    approval_status = Column(String, default="approved")
    created_by_school = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="user_rel", uselist=False)
    instructor = relationship("Instructor", back_populates="user_rel", uselist=False)


class School(Base):
    __tablename__ = "schools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner = Column(String)
    email = Column(String)
    phone = Column(String)
    country = Column(String)
    city = Column(String)
    instructor_count = Column(String)
    website = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Instructor(Base):
    __tablename__ = "instructors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    age = Column(Integer)
    gender = Column(String)
    fitness_level = Column(String)
    experience = Column(String)
    certifications = Column(Text)   # JSON array stored as string
    image = Column(String)
    
    # Coach Profile additions
    bio = Column(Text, nullable=True)
    specializations = Column(Text, nullable=True) # JSON list
    rates = Column(String, nullable=True)
    location = Column(String, nullable=True)
    reviews = Column(Text, nullable=True) # JSON list of reviews
    languages = Column(Text, default="[\"English\"]")
    intro_video = Column(String, default="")
    price = Column(Float, default=100.00)
    school = Column(String, default="Individual / Freelance Coach", nullable=True)

    user_rel = relationship("User", back_populates="instructor")
    students = relationship("Student", back_populates="instructor_rel")
    sessions = relationship("SurfSession", back_populates="instructor_rel")


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String)
    level = Column(String)
    instructor_id = Column(Integer, ForeignKey("instructors.id"))
    image = Column(String)
    last_active = Column(String)
    
    # Athlete Profile additions
    bio = Column(Text, nullable=True)
    dob = Column(String, default="")  # Date of birth (YYYY-MM-DD)
    age = Column(Integer, nullable=True) # Dynamically calculated from dob or stored
    division = Column(String, nullable=True)
    stance = Column(String, nullable=True) # "regular" / "goofy"
    surf_stats = Column(Text, nullable=True) # JSON
    performance_logs = Column(Text, nullable=True) # JSON

    # Aquatic Indica Surf School Registration Fields
    whatsapp_number = Column(String, nullable=True)
    guests_count = Column(Integer, default=1)
    course_duration = Column(String, default="3 Days Course")
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    session_time = Column(String, default="08:30 AM")
    staying_at_school = Column(String, default="Yes") # "Yes" / "No"
    reminder_preference = Column(String, default="WhatsApp Text") # "WhatsApp Text", "Phone Call", "Notice Board"
    reminder_sent = Column(Boolean, default=False)
    guests_details = Column(Text, nullable=True) # JSON list of accompanying guest profiles
    invite_token = Column(String, nullable=True, unique=True) # Shareable registration token
    school = Column(String, default="Aquatic Indica Surf School")
    approval_status = Column(String, default="approved")

    user_rel = relationship("User", back_populates="student")
    instructor_rel = relationship("Instructor", back_populates="students")
    sessions = relationship("SurfSession", back_populates="student_rel", cascade="all, delete-orphan")
    badges = relationship("Badge", back_populates="student_rel")

    nutrition_logs = relationship("NutritionLog", back_populates="student_rel")
    sc_logs = relationship("SCLog", back_populates="student_rel")
    technical_logs = relationship("TechnicalLog", back_populates="student_rel")
    mental_logs = relationship("MentalLog", back_populates="student_rel")
    mock_heats = relationship("MockHeat", back_populates="student_rel", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student_rel", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False) # YYYY-MM-DD
    present_status = Column(String, default="Present") # Present / Absent / Excused
    guests_present = Column(Integer, default=0)
    day_number = Column(Integer, default=1)
    remaining_days = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    student_rel = relationship("Student", back_populates="attendance_records")


class SurfSession(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String)
    time = Column(String)
    duration_mins = Column(Integer, default=60)
    student_id = Column(Integer, ForeignKey("students.id"))
    instructor_id = Column(Integer, ForeignKey("instructors.id"))
    location = Column(String)
    condition = Column(String)   # Easy / Moderate / Hard
    type = Column(String)        # Beginner / Intermediate / Advanced / Master
    status = Column(String)      # Upcoming / IN PROGRESS / Completed
    notes = Column(Text)
    video_url = Column(String, default="")
    student_rel = relationship("Student", back_populates="sessions")
    instructor_rel = relationship("Instructor", back_populates="sessions")


class ActivityLog(Base):
    __tablename__ = "activity_log"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    type = Column(String)   # badge / session / group
    created_at = Column(DateTime, default=datetime.utcnow)


class Badge(Base):
    __tablename__ = "badges"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    badge_level = Column(String)   # WHITE / YELLOW / GREEN / BLUE / RED
    earned_at = Column(DateTime, default=datetime.utcnow)
    student_rel = relationship("Student", back_populates="badges")


# Float imported at top

class NutritionLog(Base):
    __tablename__ = "nutrition_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    calories = Column(Integer, default=0)
    hydration_liters = Column(Float, default=0.0)
    protein_g = Column(Integer, default=0)
    carbs_g = Column(Integer, default=0)
    fats_g = Column(Integer, default=0)
    meal_timing = Column(String, default="")

    student_rel = relationship("Student", back_populates="nutrition_logs")


class SCLog(Base):
    __tablename__ = "sc_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    workout_details = Column(Text, default="")
    mobility_notes = Column(Text, default="")
    sleep_score = Column(Integer, default=0)
    recovery_score = Column(Integer, default=0)
    injury_notes = Column(Text, default="")

    student_rel = relationship("Student", back_populates="sc_logs")


class TechnicalLog(Base):
    __tablename__ = "technical_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    session_notes = Column(Text, default="")
    wave_count = Column(Integer, default=0)
    board_setup = Column(String, default="")
    wave_type = Column(String, default="")
    video_url = Column(String, default="")

    student_rel = relationship("Student", back_populates="technical_logs")


class MentalLog(Base):
    __tablename__ = "mental_logs"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)
    pre_heat_anxiety = Column(Integer, default=0) # 1-10
    focus_level = Column(Integer, default=0) # 1-10
    reflection_notes = Column(Text, default="")

    student_rel = relationship("Student", back_populates="mental_logs")


class MockHeat(Base):
    __tablename__ = "mock_heats"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    coach_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)
    date = Column(String, nullable=False)
    duration_mins = Column(Integer, default=20)
    status = Column(String, default="Running")  # "Running", "Completed"
    strategy_focus = Column(Text, default="")
    strategy_execution = Column(Text, default="")
    heat_total = Column(Float, default=0.0)
    priority_status = Column(String, default="Athlete")  # "Athlete", "Opponent"
    wave_progression = Column(Text, default="[]")  # JSON log of events
    tactical_strengths = Column(Text, default="[]")  # JSON list of strings
    tactical_weaknesses = Column(Text, default="[]")  # JSON list of strings

    student_rel = relationship("Student", back_populates="mock_heats")
    waves = relationship("MockHeatWave", back_populates="heat_rel", cascade="all, delete-orphan")


class MockHeatWave(Base):
    __tablename__ = "mock_heat_waves"
    id = Column(Integer, primary_key=True, index=True)
    mock_heat_id = Column(Integer, ForeignKey("mock_heats.id"), nullable=False)
    wave_number = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    notes = Column(Text, default="")
    timestamp = Column(String, default="")  # e.g., "12:35 remaining"

    heat_rel = relationship("MockHeat", back_populates="waves")


class Surfer(Base):
    __tablename__ = "surfers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    start_date = Column(String)
    status = Column(String)


class Heat(Base):
    __tablename__ = "heats"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    round = Column(String)
    heat_number = Column(Integer)
    status = Column(String)


class HeatSurfer(Base):
    __tablename__ = "heat_surfers"
    id = Column(Integer, primary_key=True, index=True)
    heat_id = Column(Integer, ForeignKey("heats.id"))
    surfer_id = Column(Integer, ForeignKey("surfers.id"))
    rank = Column(Integer)
    seed = Column(Integer)


class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, index=True)
    heat_id = Column(Integer, ForeignKey("heats.id"))
    surfer_id = Column(Integer, ForeignKey("surfers.id"))
    score = Column(Float)


class MarketplaceItem(Base):
    __tablename__ = "marketplace_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String)  # Board, Fins, Wetsuit, Coaching
    description = Column(Text, default="")
    status = Column(String, default="Active")  # Active, Sold


class UserReport(Base):
    __tablename__ = "user_reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    reason = Column(String)
    status = Column(String, default="Pending")  # Pending, Resolved, Dismissed


class AIUsage(Base):
    __tablename__ = "ai_usage"
    id = Column(Integer, primary_key=True, index=True)
    api_endpoint = Column(String, nullable=False)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    timestamp = Column(String, default="")  # string formatted date


class IntegrationKey(Base):
    __tablename__ = "integration_keys"
    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    api_key = Column(String, nullable=False)
    webhook_url = Column(String, default="")
    status = Column(String, default="Active")  # Active, Inactive


class OtpToken(Base):
    __tablename__ = "otp_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0) # 0 = unused, 1 = used


# ─── Create tables ────────────────────────────────────────────────────────────
from sqlalchemy import inspect
inspector = inspect(engine)
if "nutrition_logs" not in inspector.get_table_names():
    Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Alter table for new coach marketplace columns and backfill seeding
db_migrate = SessionLocal()
try:
    from sqlalchemy import text
    # Postgres ADD COLUMN IF NOT EXISTS / SQLite handle fallback
    try:
        db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS languages TEXT DEFAULT '[\"English\"]'"))
        db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS intro_video VARCHAR(255) DEFAULT ''"))
        db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION DEFAULT 100.00"))
        
        # Student Registration fields migration
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50) DEFAULT ''"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 1"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS course_duration VARCHAR(100) DEFAULT '3 Days Course'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS start_date VARCHAR(50) DEFAULT ''"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS end_date VARCHAR(50) DEFAULT ''"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS session_time VARCHAR(50) DEFAULT 'Morning 6:00 AM'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS staying_at_school VARCHAR(20) DEFAULT 'Yes'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(50) DEFAULT 'WhatsApp Text'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS guests_details TEXT DEFAULT '[]'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR(50) DEFAULT ''"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS invite_token VARCHAR(128) DEFAULT NULL"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS school VARCHAR(150) DEFAULT 'Aquatic Indica Surf School'"))
        db_migrate.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved'"))
        db_migrate.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved'"))
        db_migrate.execute(text("""
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id),
                date VARCHAR(20) NOT NULL,
                present_status VARCHAR(20) DEFAULT 'Present',
                guests_present INTEGER DEFAULT 0,
                day_number INTEGER DEFAULT 1,
                remaining_days INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db_migrate.execute(text("""
            CREATE TABLE IF NOT EXISTS otp_tokens (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER DEFAULT 0
            )
        """))
        try:
            db_migrate.execute(text("ALTER TABLE otp_tokens ALTER COLUMN used TYPE INTEGER USING (used::integer)"))
        except Exception:
            pass
        db_migrate.commit()
    except Exception:
        db_migrate.rollback()
        try:
            db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN languages TEXT DEFAULT '[\"English\"]'"))
            db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN intro_video VARCHAR(255) DEFAULT ''"))
            db_migrate.execute(text("ALTER TABLE instructors ADD COLUMN price DOUBLE PRECISION DEFAULT 100.00"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN whatsapp_number VARCHAR(50) DEFAULT ''"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN guests_count INTEGER DEFAULT 1"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN course_duration VARCHAR(100) DEFAULT '3 Days Course'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN start_date VARCHAR(50) DEFAULT ''"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN end_date VARCHAR(50) DEFAULT ''"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN session_time VARCHAR(50) DEFAULT '08:30 AM'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN staying_at_school VARCHAR(20) DEFAULT 'Yes'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN reminder_preference VARCHAR(50) DEFAULT 'WhatsApp Text'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN guests_details TEXT DEFAULT '[]'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN dob VARCHAR(50) DEFAULT ''"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN invite_token VARCHAR(128) DEFAULT NULL"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN school VARCHAR(150) DEFAULT 'Aquatic Indica Surf School'"))
            db_migrate.execute(text("ALTER TABLE students ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'"))
            db_migrate.execute(text("ALTER TABLE users ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'"))
            db_migrate.execute(text("""
                CREATE TABLE IF NOT EXISTS attendance_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    present_status TEXT DEFAULT 'Present',
                    guests_present INTEGER DEFAULT 0,
                    day_number INTEGER DEFAULT 1,
                    remaining_days INTEGER DEFAULT 0,
                    notes TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students(id)
                )
            """))
            db_migrate.execute(text("""
                CREATE TABLE IF NOT EXISTS otp_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    otp TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT 0
                )
            """))
            db_migrate.commit()
        except Exception:
            db_migrate.rollback()

    # Backfill default values for existing instructors
    db_migrate.execute(text("UPDATE instructors SET languages = '[\"English\"]' WHERE languages IS NULL"))
    db_migrate.execute(text("UPDATE instructors SET intro_video = 'https://www.w3schools.com/html/mov_bbb.mp4' WHERE intro_video IS NULL OR intro_video = ''"))
    db_migrate.execute(text("UPDATE instructors SET price = 150.00 WHERE id = 1 AND (price IS NULL OR price = 100.00)"))
    db_migrate.execute(text("UPDATE instructors SET price = 200.00 WHERE id = 2 AND (price IS NULL OR price = 100.00)"))
    db_migrate.execute(text("UPDATE instructors SET price = 120.00 WHERE id = 3 AND (price IS NULL OR price = 100.00)"))
    db_migrate.execute(text("UPDATE instructors SET price = 180.00 WHERE id = 4 AND (price IS NULL OR price = 100.00)"))
    db_migrate.execute(text("UPDATE instructors SET price = 80.00 WHERE id = 5 AND (price IS NULL OR price = 100.00)"))
    
    # Backfill reviews list with status
    db_migrate.execute(text("""
        UPDATE instructors SET reviews = '[{"id": 1, "student_id": 3, "student_name": "Emma Watson", "rating": 5, "comment": "Kai is an incredible coach! He breaks down paddling technique so clearly.", "status": "Approved", "date": "10 Aug 2026"}]' 
        WHERE id = 1 AND (reviews IS NULL OR reviews = '[]' OR reviews = '')
    """))
    db_migrate.execute(text("""
        UPDATE instructors SET reviews = '[{"id": 1, "student_id": 1, "student_name": "Chloe Kim", "rating": 5, "comment": "Bethany helped me build wave confidence in just one session. Truly inspiring!", "status": "Approved", "date": "11 Aug 2026"}]' 
        WHERE id = 2 AND (reviews IS NULL OR reviews = '[]' OR reviews = '')
    """))
    db_migrate.execute(text("""
        UPDATE instructors SET reviews = '[{"id": 1, "student_id": 4, "student_name": "Rick Grimes", "rating": 5, "comment": "Excellent focus on competitive priority strategy. Master class!", "status": "Approved", "date": "12 Aug 2026"}]' 
        WHERE id = 3 AND (reviews IS NULL OR reviews = '[]' OR reviews = '')
    """))
    db_migrate.commit()
except Exception as err:
    print(f"Migration error: {err}")
    db_migrate.rollback()
finally:
    db_migrate.close()

# Seed database
db = SessionLocal()
try:
    from sqlalchemy import text
    # Clean database initialization
    surfer_count = db.execute(text("SELECT COUNT(*) FROM surfers")).fetchone()[0]
    if surfer_count == 0:
        db.commit()
    db.commit()

    # Seed Marketplace Items
    market_count = db.execute(text("SELECT COUNT(*) FROM marketplace_items")).fetchone()[0]
    if market_count == 0:
        db.execute(text("""
            INSERT INTO marketplace_items (title, price, category, description, status) VALUES 
            ('6''2 Channel Islands Al Merrick Shortboard', 520.00, 'Board', 'High performance surfboard, minor dings repaired.', 'Active'),
            ('FCS II Neo Glass Eco Thruster Fins', 75.00, 'Fins', 'Eco-friendly thruster fin set. Size Medium.', 'Active'),
            ('Rip Curl Flashbomb 3/2 Chest Zip Wetsuit', 199.00, 'Wetsuit', 'Premium warm wetsuit. Size Large.', 'Active'),
            ('Waimea Bay Coaching Wave Session (1-on-1)', 150.00, 'Coaching', 'Private video analysis coaching session at Waimea.', 'Active')
        """))
        db.commit()

    # Seed User Reports
    report_count = db.execute(text("SELECT COUNT(*) FROM user_reports")).fetchone()[0]
    if report_count == 0:
        db.execute(text("""
            INSERT INTO user_reports (reporter, content, reason, status) VALUES 
            ('Marcus Silva', 'Comment on waimea wave feed: "Buy cheap crypto assets at cryptomoon.info"', 'Spam', 'Pending'),
            ('Chloe Kim', 'Profile picture contains inappropriate background elements.', 'Inappropriate Profile Picture', 'Pending'),
            ('John Miller', 'Spamming wave results page with consecutive duplicates.', 'Duplicate Content', 'Resolved')
        """))
        db.commit()

    # Seed AI Usage Metrics
    ai_count = db.execute(text("SELECT COUNT(*) FROM ai_usage")).fetchone()[0]
    if ai_count == 0:
        db.execute(text("""
            INSERT INTO ai_usage (api_endpoint, tokens_used, latency_ms, timestamp) VALUES 
            ('/api/mock-heats/analyze', 1200, 1150, '2026-08-12 10:35'),
            ('/api/analysis/video', 3200, 3100, '2026-08-12 10:48'),
            ('/api/mock-heats/analyze', 840, 890, '2026-08-12 11:15'),
            ('/api/analysis/video', 2900, 2750, '2026-08-12 11:32'),
            ('/api/dashboard/stats', 450, 480, '2026-08-12 12:05')
        """))
        db.commit()

    # Seed Integration Keys
    keys_count = db.execute(text("SELECT COUNT(*) FROM integration_keys")).fetchone()[0]
    if keys_count == 0:
        db.execute(text("""
            INSERT INTO integration_keys (app_name, client_id, api_key, webhook_url, status) VALUES 
            ('LiveHeats Integration Hub', 'client_liveheats_8992', 'sk_liveheats_xyz992181abc', 'http://54.242.160.238:8000/api/mock-heats/webhook', 'Active'),
            ('WSL Scoring Stream Engine', 'client_wsl_stream_7721', 'sk_wsl_scoring_90021_key', '', 'Active'),
            ('Surfline Forecast Widget Plugin', 'client_surfline_0012', 'sk_surfline_widget_88217', 'https://surfline.com/webhooks/forecast', 'Inactive')
        """))
        db.commit()
except Exception as e:
    print(f"Seeding / backfill info: {e}")
    db.rollback()
finally:
    db.close()

# ─── Security Utilities ───────────────────────────────────────────────────────
import hmac
import hashlib
import base64
import json
import time

SECRET_KEY = "supersecretkeyforaisurf"

def calculate_age_from_dob(dob_str: Optional[str]) -> Optional[int]:
    if not dob_str:
        return None
    try:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                born = datetime.strptime(str(dob_str).strip(), fmt).date()
                today = date.today()
                return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
            except ValueError:
                pass
    except Exception:
        pass
    return None

def hash_password(password: str) -> str:
    salt = b"aisurfsalt12345"
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return pwd_hash.hex()

def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)

def generate_token(payload: dict) -> str:
    payload['exp'] = time.time() + 86400 * 7 # 7 days
    payload_json = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip("=")
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{payload_b64}.{sig_b64}"

# ─── Gmail SMTP Mailer (from Aquatic-X) ───────────────────────────────────────
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "clientrequirements.rpn@gmail.com")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "urmpuumqjellqrlq")

def send_smtp_email(to_email: str, subject: str, html_body: str) -> bool:
    if not to_email:
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Aquatic Indica / AiSurf <{SMTP_EMAIL}>"
        msg['To'] = to_email

        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        print(f"SMTP email successfully delivered to {to_email}")
        return True
    except Exception as e:
        print(f"SMTP email delivery error to {to_email}: {e}")
        return False

def verify_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

# ─── Seed Data ────────────────────────────────────────────────────────────────

def seed_database(db: OrmSession, force: bool = False):
    # Seed Admin User
    existing_admin = db.query(User).filter(User.email == "admin@aisurf.com").first()
    if not existing_admin:
        admin_user = User(
            email="admin@aisurf.com",
            password_hash=hash_password("admin123"),
            password_plain="admin123",
            role="admin",
            auth_provider="email"
        )
        db.add(admin_user)
        db.flush()

    # Instructors (Coaches)
    instructor_users_data = [
        ("Kai Lenny", "kai@aisurf.com", "kai123", 30, "Male", "Elite", "12 Years", ["ISA Level 2", "CPR"], "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", "Big wave charger and multi-discipline waterman.", ["S&C", "Video Analysis", "Big Wave"], "$150 / hr", "Maui, Hawaii"),
        ("Bethany Hamilton", "bethany@aisurf.com", "bethany123", 34, "Female", "Elite", "15 Years", ["ISA Level 3", "First Aid"], "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100", "Professional surfer and inspirational speaker.", ["S&C", "Nutrition"], "$200 / hr", "Kauai, Hawaii"),
        ("Kolohe Andino", "kolohe@aisurf.com", "kolohe123", 28, "Male", "Advanced", "8 Years", ["ISA Level 1", "CPR"], "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "CT surfer specializing in heat strategy and performance techniques.", ["Competition Strategy", "Video Analysis"], "$120 / hr", "San Clemente, CA"),
        ("Carissa Moore", "carissa@aisurf.com", "carissa123", 31, "Female", "Elite", "14 Years", ["ISA Level 3", "First Aid", "Water Safety"], "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100", "5x World Champion passionate about youth coaching.", ["S&C", "Competition Strategy"], "$180 / hr", "Honolulu, Hawaii"),
        ("Marcus Silva", "marcus@aisurf.com", "marcus123", 27, "Male", "Advanced", "6 Years", ["ISA Level 2", "Water Safety"], "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "Experienced surf instructor specializing in beginners.", ["Video Analysis", "Water Safety"], "$80 / hr", "Gold Coast, AUS")
    ]

    for id_val, (name, email, password, age, gender, fit, exp, certs, img, bio, specs, rate, loc) in enumerate(instructor_users_data, 1):
        u = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if not u:
            u = User(email=email, password_hash=hash_password(password), password_plain=password, role="coach", auth_provider="email")
            db.add(u)
            db.flush()
        
        inst = db.query(Instructor).filter(Instructor.id == id_val).first()
        if not inst:
            inst = Instructor(
                id=id_val, user_id=u.id, name=name, age=age, gender=gender,
                fitness_level=fit, experience=exp, certifications=json.dumps(certs),
                image=img, bio=bio, specializations=json.dumps(specs),
                rates=rate, location=loc, reviews=json.dumps([])
            )
            db.add(inst)
    db.flush()

    # Students (Athletes with Aquatic Indica fields)
    today_iso = date.today().strftime("%Y-%m-%d")
    student_users_data = [
        ("Eric Sheldon", "ericsheldon@gmail.com", "admin123", "Beginner", 1, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", "Passionate surfer training at Aquatic Indica.", 24, "Men's Open", "regular", {"waves_ridden": 15, "max_speed": "18 mph", "avg_session_mins": 60}, ["Great pop-up balance in morning dawn patrol."], "9876543210", 2, "3 Days Course", today_iso, "", "Morning 6:00 AM", "Yes", "WhatsApp Text", [
            {"name": "tukku", "age": 24, "stance": "regular", "level": "Advanced"}
        ]),
        ("Aarav Sharma", "aarav@aisurf.com", "aarav123", "Beginner", 2, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "First time catching waves at Kovalam beach.", 22, "Men's Amateur", "regular", {"waves_ridden": 8, "max_speed": "12 mph", "avg_session_mins": 60}, ["Learned duck dive fundamentals."], "9840123456", 1, "5 Days Course", today_iso, "", "Morning 8:00 AM", "Yes", "WhatsApp Text", []),
        ("Priya Nair", "priya@aisurf.com", "priya123", "Intermediate", 4, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100", "Working on rail control and bottom turns.", 26, "Women's Open", "goofy", {"waves_ridden": 28, "max_speed": "20 mph", "avg_session_mins": 75}, ["Smooth cutbacks on sunset swells."], "9123456780", 3, "7 Days Course", today_iso, "", "Evening 4:00 PM", "No", "WhatsApp Text", [
            {"name": "Vikram S", "age": 26, "stance": "goofy", "level": "Beginner"},
            {"name": "Kavya M", "age": 24, "stance": "regular", "level": "Intermediate"}
        ]),
        ("Chloe Kim", "chloe@aisurf.com", "chloe123", "Intermediate", 5, "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100", "Olympic snowboarder mastering ocean waves.", 23, "Women's Open", "regular", {"waves_ridden": 42, "max_speed": "24 mph", "avg_session_mins": 75}, ["Pipeline clean swell - pop-up speed fast."], "9884012345", 1, "3 Days Course", today_iso, "", "Morning 6:00 AM", "Yes", "WhatsApp Text", []),
        ("John Miller", "john@aisurf.com", "john123", "Beginner", 2, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "Stoked to learn and charge waves.", 19, "Juniors", "goofy", {"waves_ridden": 18, "max_speed": "16 mph", "avg_session_mins": 60}, [], "9712345678", 1, "1 Day Crash Course", today_iso, "", "Morning 8:00 AM", "No", "Phone Call", []),
        ("Emma Watson", "emma@aisurf.com", "emma123", "Intermediate", 1, "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100", "Surfing is my peace from screen acting.", 25, "Women's Amateur", "regular", {"waves_ridden": 31, "max_speed": "18 mph", "avg_session_mins": 90}, ["Intro to duck diving success."], "9988776655", 1, "3 Days Course", today_iso, "", "Morning 6:00 AM", "Yes", "WhatsApp Text", [])
    ]

    for id_val, (name, email, password, level, inst_id, img, bio, age, div, stance, stats, logs, wa, guests_c, dur, s_date, e_date, s_time, stay, rem_pref, g_details) in enumerate(student_users_data, 1):
        u = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if not u:
            u = User(email=email, password_hash=hash_password(password), password_plain=password, role="athlete", auth_provider="email")
            db.add(u)
            db.flush()
        
        stud = db.query(Student).filter(Student.id == id_val).first()
        if not stud:
            stud = Student(
                id=id_val, user_id=u.id, name=name, email=email, level=level,
                instructor_id=inst_id, image=img, last_active="Today",
                bio=bio, age=age, division=div, stance=stance,
                surf_stats=json.dumps(stats), performance_logs=json.dumps(logs),
                whatsapp_number=wa, guests_count=guests_c, course_duration=dur,
                start_date=s_date, end_date=e_date, session_time=s_time,
                staying_at_school=stay, reminder_preference=rem_pref,
                reminder_sent=False, guests_details=json.dumps(g_details)
            )
            db.add(stud)
    db.flush()

    # Add reviews to Kai Lenny
    kai_lenny = db.query(Instructor).filter(Instructor.id == 1).first()
    if kai_lenny:
        kai_lenny.reviews = json.dumps([
            {"student": "Emma Watson", "rating": 5, "comment": "Kai is an incredible coach! He breaks down paddling technique so clearly."}
        ])

    # Sessions
    today = datetime.now().strftime("%d %b %Y")
    sessions = [
        SurfSession(date=today, time="08:00 AM", duration_mins=90,
                    student_id=2, instructor_id=1, location="Pipeline",
                    condition="Hard", type="Advanced", status="IN PROGRESS",
                    notes="Strong offshore wind, good form"),
        SurfSession(date=today, time="09:30 AM", duration_mins=60,
                    student_id=3, instructor_id=2, location="Waikiki",
                    condition="Easy", type="Beginner", status="Upcoming", notes=""),
        SurfSession(date=today, time="11:00 AM", duration_mins=120,
                    student_id=4, instructor_id=3, location="Sunset Beach",
                    condition="Moderate", type="Intermediate", status="Upcoming", notes=""),
        SurfSession(date=today, time="02:00 PM", duration_mins=90,
                    student_id=5, instructor_id=4, location="Pipeline",
                    condition="Hard", type="Master", status="Upcoming", notes=""),
        SurfSession(date="12 Jun 2025", time="08:00 AM", duration_mins=90,
                    student_id=1, instructor_id=1, location="Pipeline",
                    condition="Hard", type="Advanced", status="Completed",
                    notes="Excellent session"),
        SurfSession(date="12 Jun 2025", time="10:30 AM", duration_mins=60,
                    student_id=3, instructor_id=2, location="Waikiki",
                    condition="Easy", type="Beginner", status="Completed", notes=""),
    ]
    for s in sessions:
        db.add(s)
    db.flush()

    # Badges
    badge_data = [
        Badge(student_id=1, badge_level="WHITE"),
        Badge(student_id=1, badge_level="YELLOW"),
        Badge(student_id=2, badge_level="WHITE"),
        Badge(student_id=3, badge_level="WHITE"),
        Badge(student_id=3, badge_level="YELLOW"),
        Badge(student_id=3, badge_level="GREEN"),
        Badge(student_id=4, badge_level="WHITE"),
        Badge(student_id=4, badge_level="YELLOW"),
        Badge(student_id=4, badge_level="GREEN"),
        Badge(student_id=4, badge_level="BLUE"),
        Badge(student_id=5, badge_level="WHITE"),
        Badge(student_id=6, badge_level="WHITE"),
        Badge(student_id=6, badge_level="YELLOW"),
        Badge(student_id=6, badge_level="GREEN"),
        Badge(student_id=6, badge_level="BLUE"),
        Badge(student_id=6, badge_level="RED"),
    ]
    for b in badge_data:
        db.add(b)
    db.flush()

    # Activity Log
    activities = [
        ActivityLog(text="Emma Watson earned 'First Barrel' badge", type="badge"),
        ActivityLog(text="John Miller completed session with Kai", type="session"),
        ActivityLog(text="Rick Grimes joined 'Intermediate' cohort", type="group"),
        ActivityLog(text="Chloe Kim scored personal best this session", type="session"),
        ActivityLog(text="James Bond earned RED badge — Master level!", type="badge"),
    ]
    for a in activities:
        db.add(a)

    # Demo schools
    db.add(School(name="Aquatic Indica Surf School", owner="Aquatic Admin",
                  email="rpntechworld@gmail.com", phone="+91 9876543210",
                  country="India", city="Kovalam / Chennai",
                  instructor_count="5–15", website="https://aquaticindica.com"))
    db.add(School(name="Pipeline Surf School", owner="John Doe",
                  email="hello@pipeline.com", phone="+1 808 555 0100",
                  country="United States", city="Honolulu",
                  instructor_count="6–15", website="https://pipeline.com"))

    # Seed Chloe Kim Logs (student_id=1)
    chloe_nutrition = [
        NutritionLog(student_id=1, date="01 Aug 2026", calories=2400, hydration_liters=3.0, protein_g=140, carbs_g=300, fats_g=70, meal_timing="Pre-heat smoothie 9AM, Post-surf lunch 1PM"),
        NutritionLog(student_id=1, date="02 Aug 2026", calories=2600, hydration_liters=3.5, protein_g=150, carbs_g=320, fats_g=75, meal_timing="Pre-heat oatmeal 8AM, Competition snack 11AM"),
        NutritionLog(student_id=1, date="03 Aug 2026", calories=2500, hydration_liters=3.2, protein_g=145, carbs_g=310, fats_g=72, meal_timing="Energy bar 9:30AM, Post-heat dinner 6PM")
    ]
    chloe_sc = [
        SCLog(student_id=1, date="01 Aug 2026", workout_details="Strength Session: Deadlifts 3x5, Squats 4x6, Core workout", mobility_notes="Good hip mobility, slight stiffness in thoracic spine", sleep_score=82, recovery_score=85, injury_notes="None"),
        SCLog(student_id=1, date="02 Aug 2026", workout_details="Active Recovery: Swim 30 mins, light stretching", mobility_notes="Thoracic spine mobility drills", sleep_score=90, recovery_score=92, injury_notes="None"),
        SCLog(student_id=1, date="03 Aug 2026", workout_details="Power Session: Box jumps 4x5, Kettlebell swings 4x10", mobility_notes="Full body dynamic warm-up", sleep_score=85, recovery_score=88, injury_notes="Mild left shoulder tightness")
    ]
    chloe_tech = [
        TechnicalLog(student_id=1, date="01 Aug 2026", session_notes="Felt good in 4-6ft barrels. Focus on pop-up speed.", wave_count=12, board_setup="6'1 Channel Islands Shortboard, Thruster fin setup", wave_type="Reef break barrel", video_url="http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4"),
        TechnicalLog(student_id=1, date="02 Aug 2026", session_notes="Clean beach break session. Practice snaps and cutbacks.", wave_count=18, board_setup="6'0 Firewire, Quad fin setup", wave_type="Beach break A-frame", video_url="http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4"),
        TechnicalLog(student_id=1, date="03 Aug 2026", session_notes="Tested thruster fin configuration in heavy surf.", wave_count=14, board_setup="6'2 Pyzel Gun, Thruster setup", wave_type="Point break, fast and hollow", video_url="http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4")
    ]
    chloe_mental = [
        MentalLog(student_id=1, date="01 Aug 2026", pre_heat_anxiety=4, focus_level=8, reflection_notes="Stayed calm before paddling out. Visualization helped."),
        MentalLog(student_id=1, date="02 Aug 2026", pre_heat_anxiety=3, focus_level=9, reflection_notes="Highly focused today. Flow state achieved in early waves."),
        MentalLog(student_id=1, date="03 Aug 2026", pre_heat_anxiety=5, focus_level=7, reflection_notes="Anxiety was a bit high due to heavy swell. Focus improved after first wave.")
    ]
    for n in chloe_nutrition: db.add(n)
    for s in chloe_sc: db.add(s)
    for t in chloe_tech: db.add(t)
    for m in chloe_mental: db.add(m)

    db.commit()
    print("Database seeded with demo data!")


# Run startup database sequence sync
with SessionLocal() as _db:
    # Auto-patch: Reset PostgreSQL primary key sequences to prevent duplicate key violations on new signups
    if _db.bind.dialect.name == "postgresql":
        from sqlalchemy import text
        try:
            _db.execute(text("SELECT setval('students_id_seq', COALESCE((SELECT MAX(id) FROM students), 1));"))
            _db.execute(text("SELECT setval('instructors_id_seq', COALESCE((SELECT MAX(id) FROM instructors), 1));"))
            _db.execute(text("SELECT setval('schools_id_seq', COALESCE((SELECT MAX(id) FROM schools), 1));"))
            _db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));"))
            _db.execute(text("SELECT setval('sessions_id_seq', COALESCE((SELECT MAX(id) FROM sessions), 1));"))
            _db.commit()
            print("PostgreSQL sequences synchronized successfully.")
        except Exception as e:
            _db.rollback()
            print(f"Failed to synchronize PostgreSQL sequences: {e}")

    # Auto-patch: Update legacy links to the user's local uploaded MP4 video file
    youtube_to_mp4 = {
        "https://www.youtube.com/watch?v=demo1": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://www.youtube.com/watch?v=demo2": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://www.youtube.com/watch?v=demo3": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-surfing-under-a-wave-in-slow-motion-41851-large.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-surfer-riding-a-wave-in-the-ocean-34284-large.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://assets.mixkit.co/videos/preview/mixkit-surfer-riding-a-wave-under-a-sunset-34293-large.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4": "http://localhost:8000/uploads/c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4",
    }
    for old_url, new_url in youtube_to_mp4.items():
        logs_to_update = _db.query(TechnicalLog).filter(TechnicalLog.video_url == old_url).all()
        for log in logs_to_update:
            log.video_url = new_url
    _db.commit()


# ─── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="AI Surf API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# AWS S3 Configuration
S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
s3_client = boto3.client("s3", region_name=AWS_REGION)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/api/admin/clean-mock-data")
def clean_mock_data_endpoint(db: OrmSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        mock_emails = [
            "eric_test_surfer@gmail.com", "group_lead@gmail.com", "aquaticsurfer2@gmail.com",
            "test_athlete_1785994540@example.com", "tt@gamil.com", "test@g.com"
        ]
        
        # 1. Delete mock heat participants
        try:
            db.execute(text("""
                DELETE FROM mock_heat_participants 
                WHERE heat_id IN (
                    SELECT id FROM mock_heats WHERE coach_id IN (
                        SELECT id FROM instructors WHERE user_id IN (
                            SELECT id FROM users WHERE email LIKE 'sso_user_%' OR email LIKE 'test_athlete_%' OR email IN :mock_list
                        )
                    )
                )
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        # 2. Delete mock heats
        try:
            db.execute(text("""
                DELETE FROM mock_heats 
                WHERE coach_id IN (
                    SELECT id FROM instructors WHERE user_id IN (
                        SELECT id FROM users WHERE email LIKE 'sso_user_%' OR email LIKE 'test_athlete_%' OR email IN :mock_list
                    )
                )
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        # 3. Delete mock sessions
        try:
            db.execute(text("""
                DELETE FROM sessions 
                WHERE student_id IN (
                    SELECT id FROM students WHERE email LIKE 'sso_user_%' OR email LIKE 'test_athlete_%' OR email IN :mock_list
                )
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        # 4. Delete mock badges
        try:
            db.execute(text("""
                DELETE FROM badges 
                WHERE student_id IN (
                    SELECT id FROM students WHERE email LIKE 'sso_user_%' OR email LIKE 'test_athlete_%' OR email IN :mock_list
                )
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        # 5. Delete mock instructors & students
        try:
            db.execute(text("""
                DELETE FROM instructors 
                WHERE user_id IN (
                    SELECT id FROM users WHERE email LIKE 'sso_user_%' OR email LIKE 'test_athlete_%' OR email IN :mock_list
                )
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        try:
            db.execute(text("""
                DELETE FROM students 
                WHERE email LIKE 'sso_user_%' 
                   OR email LIKE 'test_athlete_%'
                   OR email IN :mock_list
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        # 6. Delete mock users
        try:
            db.execute(text("""
                DELETE FROM users 
                WHERE email LIKE 'sso_user_%' 
                   OR email LIKE 'test_athlete_%'
                   OR email IN :mock_list
            """), {"mock_list": tuple(mock_emails)})
            db.commit()
        except Exception:
            db.rollback()

        return {"status": "success", "message": "All AI test mock data successfully cleaned! All user data preserved."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Clean error: {str(e)}")


def calculate_age_from_dob(dob_str):
    if not dob_str: return None
    try:
        from datetime import datetime
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        today = datetime.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except:
        return None


from fastapi import Depends

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class InstructorCreate(BaseModel):
    name: str
    email: Optional[str] = ""
    password: Optional[str] = ""
    dob: Optional[str] = ""
    age: Optional[int] = 28
    gender: str = "Male"
    fitness_level: str = "Elite"
    experience: str = "2 Years"
    certifications: List[str] = []
    image: Optional[str] = ""
    school: Optional[str] = "Individual / Freelance Coach"


class StudentCreate(BaseModel):
    name: str
    email: str
    level: str
    instructor_id: Optional[int] = None
    image: Optional[str] = ""
    last_active: Optional[str] = "Today"
    dob: Optional[str] = ""
    age: Optional[int] = None
    whatsapp_number: Optional[str] = ""
    guests_count: Optional[int] = 1
    course_duration: Optional[str] = "3 Days Course"
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    session_time: Optional[str] = "Morning 6:00 AM"
    staying_at_school: Optional[str] = "Yes"
    reminder_preference: Optional[str] = "WhatsApp Text"
    reminder_sent: Optional[bool] = False
    guests_details: Optional[List[dict]] = []
    invite_token: Optional[str] = None
    password: Optional[str] = None # Admin can set initial password directly


class SessionCreate(BaseModel):
    date: str
    time: str
    duration_mins: Optional[int] = 60
    student_id: int
    instructor_id: int
    location: str
    condition: str
    type: str
    status: Optional[str] = "Upcoming"
    notes: Optional[str] = ""
    video_url: Optional[str] = ""


class SessionUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    duration_mins: Optional[int] = None
    student_id: Optional[int] = None
    instructor_id: Optional[int] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    video_url: Optional[str] = None


class SessionBulkCreate(BaseModel):
    date: str
    time: str
    duration_mins: Optional[int] = 60
    student_ids: List[int]
    instructor_id: int
    location: str
    condition: str
    type: str
    status: Optional[str] = "Upcoming"
    notes: Optional[str] = ""
    video_url: Optional[str] = ""


class SchoolCreate(BaseModel):
    name: str
    owner: str
    email: str
    phone: Optional[str] = ""
    country: str
    city: str
    instructor_count: Optional[str] = ""
    website: Optional[str] = ""


class UserSignup(BaseModel):
    email: str
    password: str
    role: str # "athlete", "coach", "admin"
    name: str
    image: Optional[str] = ""
    # Athlete fields
    gender: Optional[str] = "Male"
    stance: Optional[str] = "regular"
    dob: Optional[str] = ""
    age: Optional[int] = None
    division: Optional[str] = ""
    whatsapp_number: Optional[str] = ""
    guests_count: Optional[int] = 0
    course_duration: Optional[str] = "3 Days Course"
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    session_time: Optional[str] = "08:30 AM"
    staying_at_school: Optional[str] = "Yes"
    reminder_preference: Optional[str] = "WhatsApp Text"
    guests_details: Optional[List[dict]] = []
    # Coach fields
    specializations: Optional[List[str]] = []
    rates: Optional[str] = ""
    location: Optional[str] = ""
    school: Optional[str] = ""
    # Invite token (pre-links to an existing student record created by admin)
    invite_token: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str
    role: Optional[str] = None


class SSOLogin(BaseModel):
    provider: str # "google" or "apple"
    social_id: str
    email: str
    name: str
    role: Optional[str] = None
    image: Optional[str] = ""
    dob: Optional[str] = ""
    age: Optional[int] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    stance: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    division: Optional[str] = None
    surf_stats: Optional[dict] = None
    performance_logs: Optional[List[str]] = None
    whatsapp_number: Optional[str] = None
    guests_count: Optional[int] = None
    course_duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    session_time: Optional[str] = None
    staying_at_school: Optional[str] = None
    reminder_preference: Optional[str] = None
    reminder_sent: Optional[bool] = None
    guests_details: Optional[List[dict]] = None
    image: Optional[str] = None
    instructor_id: Optional[int] = None


class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    fitness_level: Optional[str] = None
    specializations: Optional[List[str]] = None
    rates: Optional[str] = None
    location: Optional[str] = None
    certifications: Optional[List[str]] = None
    image: Optional[str] = None
    school: Optional[str] = None


class NutritionLogCreate(BaseModel):
    date: str
    calories: int
    hydration_liters: float
    protein_g: int
    carbs_g: int
    fats_g: int
    meal_timing: Optional[str] = ""


class SCLogCreate(BaseModel):
    date: str
    workout_details: str
    mobility_notes: Optional[str] = ""
    sleep_score: int
    recovery_score: int
    injury_notes: Optional[str] = ""


class TechnicalLogCreate(BaseModel):
    date: str
    session_notes: str
    wave_count: int
    board_setup: Optional[str] = ""
    wave_type: Optional[str] = ""
    video_url: Optional[str] = ""


class MentalLogCreate(BaseModel):
    date: str
    pre_heat_anxiety: int
    focus_level: int
    reflection_notes: Optional[str] = ""


class MockHeatCreate(BaseModel):
    student_id: int
    coach_id: int
    duration_mins: Optional[int] = 20
    strategy_focus: Optional[str] = ""


class MockHeatWaveCreate(BaseModel):
    score: float
    notes: Optional[str] = ""
    timestamp: Optional[str] = ""


class MockHeatComplete(BaseModel):
    strategy_execution: Optional[str] = ""


class MarketplaceItemCreate(BaseModel):
    title: str
    price: float
    category: str
    description: Optional[str] = ""


class UserReportUpdate(BaseModel):
    status: str  # "Resolved" or "Dismissed"


class IntegrationKeyCreate(BaseModel):
    app_name: str
    webhook_url: Optional[str] = ""


# ─── Helper ───────────────────────────────────────────────────────────────────

def instructor_to_dict(i: Instructor):
    has_pwd = False
    plain_pwd = ""
    if i.user_rel:
        has_pwd = bool(i.user_rel.password_hash or i.user_rel.password_plain)
        plain_pwd = i.user_rel.password_plain or ""
    safe_img = i.image or ""
    if "unsplash.com" in safe_img or "1500648767791" in safe_img:
        safe_img = ""
    return {
        "id": i.id,
        "name": i.name,
        "email": i.email or (i.user_rel.email if i.user_rel else ""),
        "dob": i.dob or "",
        "age": i.age,
        "gender": i.gender,
        "fitness_level": i.fitness_level,
        "experience": i.experience,
        "certifications": json.loads(i.certifications) if i.certifications else [],
        "image": safe_img,
        "bio": i.bio or "",
        "specializations": json.loads(i.specializations) if i.specializations else [],
        "rates": i.rates or "",
        "location": i.location or "",
        "reviews": json.loads(i.reviews) if i.reviews else [],
        "school": i.school or "Individual / Freelance Coach",
        "user_id": i.user_id,
        "has_password": has_pwd,
        "password_plain": plain_pwd,
    }


def student_to_dict(s: Student):
    # Dynamic calculations for course progress & WhatsApp formatting
    raw_wa = s.whatsapp_number or ""
    clean_digits = "".join(filter(str.isdigit, raw_wa))
    if clean_digits and not (clean_digits.startswith("91") and len(clean_digits) > 10):
        if len(clean_digits) == 10:
            clean_digits = "91" + clean_digits
    
    # Parse duration total days
    dur_str = s.course_duration or "3 Days Course"
    total_days = 3
    for token in dur_str.split():
        if token.isdigit():
            total_days = int(token)
            break
            
    # Calculate which day & remaining days
    which_day = 1
    remaining_days = total_days - 1
    if s.start_date:
        try:
            # support formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.
            s_date = None
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d %b %Y"):
                try:
                    s_date = datetime.strptime(s.start_date.strip(), fmt).date()
                    break
                except Exception:
                    pass
            if s_date:
                today = date.today()
                diff = (today - s_date).days + 1
                if diff < 1:
                    which_day = 1
                    remaining_days = total_days
                elif diff > total_days:
                    which_day = total_days
                    remaining_days = 0
                else:
                    which_day = diff
                    remaining_days = max(0, total_days - which_day)
        except Exception:
            pass

    # Build custom WhatsApp template message and direct link
    student_name = s.name or "Surfer"
    session_time = s.session_time or "Morning 6:00 AM"
    today_disp = date.today().strftime("%d %b %Y")
    wa_msg = (
        f"Hi {student_name}! Your upcoming surf session is at {session_time}. "
        f"Date: {today_disp}. Report at the front desk 15 mins prior. "
        f"The only viable transport to the surf spot is by boat. "
        f"Location: https://maps.google.com"
    )
    import urllib.parse
    wa_link = f"https://wa.me/{clean_digits}?text={urllib.parse.quote(wa_msg)}" if clean_digits else ""

    computed_age = calculate_age_from_dob(s.dob) if s.dob else s.age
    safe_student_img = s.image or ""
    if "unsplash.com" in safe_student_img or "1500648767791" in safe_student_img:
        safe_student_img = ""

    return {
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "level": s.level,
        "instructor_id": s.instructor_id,
        "instructor": s.instructor_rel.name if s.instructor_rel else "",
        "image": safe_student_img,
        "last_active": s.last_active or "",
        "bio": s.bio or "",
        "dob": s.dob or "",
        "age": computed_age,
        "division": s.division or "",
        "stance": s.stance or "regular",
        "surf_stats": json.loads(s.surf_stats) if s.surf_stats else {},
        "performance_logs": json.loads(s.performance_logs) if s.performance_logs else [],
        "user_id": s.user_id,
        # Aquatic Indica Fields
        "whatsapp_number": s.whatsapp_number or "",
        "guests_count": s.guests_count or 1,
        "course_duration": s.course_duration or "3 Days Course",
        "start_date": s.start_date or "",
        "end_date": s.end_date or "",
        "session_time": s.session_time or "Morning 6:00 AM",
        "staying_at_school": s.staying_at_school or "Yes",
        "reminder_preference": s.reminder_preference or "WhatsApp Text",
        "reminder_sent": bool(s.reminder_sent),
        "guests_details": json.loads(s.guests_details) if s.guests_details else [],
        "which_day": which_day,
        "remaining_days": remaining_days,
        "total_days": total_days,
        "wa_link": wa_link,
        "has_password": bool(s.user_rel and s.user_rel.password_hash),
        "school": s.school or "Aquatic Indica Surf School",
        "approval_status": s.approval_status or "approved",
    }


def session_to_dict(s: SurfSession):
    return {
        "id": s.id,
        "date": s.date,
        "time": s.time,
        "duration_mins": s.duration_mins,
        "student_id": s.student_id,
        "student": s.student_rel.name if s.student_rel else "",
        "instructor_id": s.instructor_id,
        "instructor": s.instructor_rel.name if s.instructor_rel else "",
        "location": s.location,
        "condition": s.condition,
        "type": s.type,
        "status": s.status,
        "notes": s.notes or "",
        "video_url": s.video_url or "",
    }


# ─── Root ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AI Surf API — Database Connected ✅"}


from fastapi import Header

def get_current_user(authorization: Optional[str] = Header(None), db: OrmSession = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def make_user_response(user: User, db_session: Optional[OrmSession] = None):
    res = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "auth_provider": user.auth_provider,
        "created_by_school": user.created_by_school,
    }
    if user.student:
        res["student_id"] = user.student.id
        res["name"] = user.student.name
        res["image"] = user.student.image
    elif user.instructor:
        res["instructor_id"] = user.instructor.id
        res["name"] = user.instructor.name
        res["image"] = user.instructor.image
        res["school"] = user.instructor.school or "Individual / Freelance Coach"
    else:
        res["name"] = "School Admin"
        res["image"] = ""

    # Check matching school by email
    try:
        from sqlalchemy import inspect, func
        session = db_session or inspect(user).session
        if session:
            sch = session.query(School).filter(func.lower(School.email) == user.email.lower()).first()
            if sch:
                res["school_name"] = sch.name
                res["school_id"] = sch.id
                res["school"] = {"id": sch.id, "name": sch.name, "owner": sch.owner, "email": sch.email}
                if sch.owner and user.role == "admin":
                    res["name"] = sch.owner
    except Exception as e:
        pass
    # approval status fallback
    user_st = getattr(user, "approval_status", None)
    if not user_st and user.student:
        user_st = getattr(user.student, "approval_status", None)
    res["approval_status"] = user_st or "approved"

    return res


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@app.post("/api/auth/signup")
def auth_signup(data: UserSignup, db: OrmSession = Depends(get_db)):
    role = data.role.lower().strip()
    if role not in ["athlete", "coach", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    email_clean = data.email.lower().strip()
    existing = db.query(User).filter(
        func.lower(User.email) == email_clean,
        User.role == role
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"This email is already registered as {role}. Please log in instead.")

    initial_approval = "approved" if (data.invite_token or role != "athlete") else "pending"

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        password_plain=data.password,
        role=role,
        auth_provider="email",
        approval_status=initial_approval
    )
    db.add(user)
    db.flush()

    if role == "athlete":
        computed_age = calculate_age_from_dob(data.dob) if data.dob else data.age

        # Check if this signup is via an admin invite link
        existing_student = None
        if data.invite_token:
            existing_student = db.query(Student).filter(
                Student.invite_token == data.invite_token,
                Student.user_id == None
            ).first()

        if existing_student:
            # Link user account to the pre-created student record
            existing_student.user_id = user.id
            existing_student.email = data.email.lower()
            existing_student.dob = data.dob or existing_student.dob or ""
            existing_student.age = computed_age or existing_student.age
            existing_student.stance = data.stance or existing_student.stance or "regular"
            existing_student.invite_token = None  # Consume/invalidate token
            existing_student.last_active = "Today"
            existing_student.approval_status = "approved"
            db.add(ActivityLog(text=f"{existing_student.name} activated their student account", type="group"))
        else:
            student = Student(
                user_id=user.id,
                name=data.name,
                email=data.email.lower(),
                level="Beginner",
                bio="",
                dob=data.dob or "",
                age=computed_age,
                division=data.division,
                stance=data.stance,
                surf_stats=json.dumps({"waves_ridden": 0, "max_speed": "0 mph", "avg_session_mins": 0}),
                performance_logs=json.dumps([]),
                image=data.image or "",
                last_active="Today",
                whatsapp_number=data.whatsapp_number or "",
                guests_count=data.guests_count or 1,
                course_duration=data.course_duration or "3 Days Course",
                start_date=data.start_date or "",
                end_date=data.end_date or "",
                session_time=data.session_time or "Morning 6:00 AM",
                staying_at_school=data.staying_at_school or "Yes",
                reminder_preference=data.reminder_preference or "WhatsApp Text",
                reminder_sent=False,
                guests_details=json.dumps(data.guests_details or []),
                school=data.school or "Aquatic Indica Surf School",
                approval_status=initial_approval
            )
            db.add(student)
            db.add(ActivityLog(text=f"{data.name} signed up for {data.course_duration or '3 Days Course'}", type="group"))
    elif role == "coach":
        instructor = Instructor(
            user_id=user.id,
            name=data.name,
            age=30,
            gender="Male",
            fitness_level="Advanced",
            experience="3 Years",
            certifications=json.dumps(["ISA Level 1", "Lifeguard Certified"]),
            image=data.image or "",
            bio="Professional surf instructor dedicated to athletic performance.",
            specializations=json.dumps(data.specializations or ["S&C", "Video Analysis"]),
            rates=data.rates or "$75 / hr",
            location=data.location or "North Shore, Oahu",
            school=data.school or "Individual / Freelance Coach",
            reviews=json.dumps([])
        )
        db.add(instructor)
        db.add(ActivityLog(text=f"New coach {data.name} joined the academy", type="individual"))
    elif role == "admin":
        requested_school = (data.school or "").strip()
        existing_school = db.query(School).filter(func.lower(School.email) == data.email.lower()).first()
        if not existing_school:
            school_name = requested_school if requested_school else f"{data.name}'s Surf School"
            new_sch = School(
                name=school_name,
                owner=data.name,
                email=data.email.lower(),
                country="India",
                city="Kovalam / Chennai",
                instructor_count="5-15",
                website=""
            )
            db.add(new_sch)
        elif requested_school:
            existing_school.name = requested_school
            existing_school.owner = data.name
        db.add(ActivityLog(text=f"School Admin account created for {data.name}", type="individual"))

    db.commit()
    db.refresh(user)

    # Resolve student_id for token response
    if role == "athlete":
        linked_student = db.query(Student).filter(Student.user_id == user.id).first()
        if linked_student:
            user._resolved_student_id = linked_student.id

    # Send Welcome Email via AquaticX SMTP
    try:
        welcome_html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; background: #0F172A; color: #F8FAFC; border-radius: 16px; max-width: 540px; margin: auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #00F2FE; margin: 0; font-size: 24px;">🏄 Aquatic Indica Surf School</h1>
                <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0 0;">AiSurf Athletic & Operations Platform</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="margin-top: 0; color: #F1F5F9;">Aloha {data.name}! 🤙</h3>
                <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                    Your account has been successfully registered for the <strong>{data.course_duration or 'Surf Training'}</strong> program.
                </p>
                <ul style="font-size: 13px; color: #94A3B8; padding-left: 20px; line-height: 1.8;">
                    <li><strong>Role:</strong> {role.capitalize()}</li>
                    <li><strong>Session Slot:</strong> {data.session_time or 'Morning 6:00 AM'}</li>
                    <li><strong>Lodge Stay:</strong> {data.staying_at_school or 'Yes'}</li>
                    <li><strong>Group Size:</strong> {data.guests_count or 1} Surfer(s)</li>
                </ul>
            </div>
            <p style="font-size: 11px; color: #64748B; text-align: center; margin-top: 20px;">
                Sent via Aquatic-X Cloud SMTP • Client Requirements Hub
            </p>
        </div>
        """
        send_smtp_email(data.email, "🏄 Welcome to Aquatic Indica Surf School & AiSurf!", welcome_html)
    except Exception as e:
        print(f"Welcome email error: {e}")

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "token": token,
        "user": make_user_response(user)
    }


class EmailTestRequest(BaseModel):
    to_email: str
    subject: Optional[str] = "🏄 Aquatic Indica / AiSurf SMTP Test"
    message: Optional[str] = "Hello from Aquatic Indica Surf School SMTP!"

@app.post("/api/email/test")
def test_email_endpoint(data: EmailTestRequest):
    html_body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 12px;">
        <h2 style="color: #00F2FE;">Aquatic Indica & AiSurf SMTP Connection Live 🚀</h2>
        <p>{data.message}</p>
        <p style="color: #94a3b8; font-size: 12px;">Connected using Aquatic-X Gmail SMTP credentials (clientrequirements.rpn@gmail.com).</p>
    </div>
    """
    success = send_smtp_email(data.to_email, data.subject, html_body)
    if success:
        return {"status": "success", "message": f"Email successfully delivered to {data.to_email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to deliver email. Check SMTP credentials.")


class SendOtpRequest(BaseModel):
    email: str
    purpose: Optional[str] = "login"
    role: Optional[str] = "athlete"

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    role: Optional[str] = "athlete"
    name: Optional[str] = ""

@app.post("/api/auth/send-otp")
def send_otp_endpoint(data: SendOtpRequest, db: OrmSession = Depends(get_db)):
    email = data.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # If purpose is signup, check if email is already registered FOR THIS ROLE BEFORE sending OTP
    if data.purpose == "signup":
        target_role = (data.role or "athlete").lower().strip()
        existing = db.query(User).filter(
            func.lower(User.email) == email,
            User.role == target_role
        ).first()
        if existing:
            role_display = "Student (Athlete)" if target_role == "athlete" else ("Coach (Instructor)" if target_role == "coach" else "School Admin")
            raise HTTPException(
                status_code=400,
                detail=f"This email address is already registered as {role_display}. Please log in instead, or change 'Register As' to another role."
            )
    
    # Invalidate previous unused OTPs
    try:
        db.query(OtpToken).filter(OtpToken.email == email, OtpToken.used == 0).update({"used": 1})
        db.commit()
    except Exception:
        db.rollback()

    import random
    from datetime import timedelta
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.add(OtpToken(email=email, otp=otp, expires_at=expires_at, used=0))
    db.commit()

    html = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; background: #0F172A; color: #F8FAFC; border-radius: 16px; max-width: 480px; margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #00F2FE; margin: 0; font-size: 24px;">🏄 Aquatic Indica / AiSurf</h1>
            <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0 0;">Authentication Code</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="font-size: 14px; color: #CBD5E1; margin: 0 0 12px 0;">Use the following verification code to log in to your account:</p>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #00F2FE; margin: 16px 0; padding: 14px; background: rgba(0, 242, 254, 0.08); border-radius: 8px; display: inline-block;">
                {otp}
            </div>
            <p style="font-size: 12px; color: #94A3B8; margin: 12px 0 0 0;">Valid for 10 minutes. Please do not share this code.</p>
        </div>
        <p style="font-size: 11px; color: #64748B; text-align: center; margin-top: 20px;">
            Sent via Aquatic-X Cloud SMTP
        </p>
    </div>
    """
    sent = send_smtp_email(email, f"🔑 {otp} is your AiSurf Login Verification Code", html)
    if not sent:
        print(f"\n[DEV MODE] SMTP Failed. OTP Generated for {email}: {otp}\n")
        return {"status": "success", "message": f"Verification code generated (Dev Mode Fallback: {otp})"}

    return {"status": "success", "message": f"Verification code sent to {email}"}


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    purpose: Optional[str] = "login"
    role: Optional[str] = "athlete"
    name: Optional[str] = ""

@app.post("/api/auth/verify-otp")
def verify_otp_endpoint(data: VerifyOtpRequest, db: OrmSession = Depends(get_db)):
    email = data.email.lower().strip()
    otp = data.otp.strip()

    token_record = db.query(OtpToken).filter(
        OtpToken.email == email,
        OtpToken.otp == otp,
        OtpToken.used == 0,
        OtpToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    token_record.used = 1
    db.commit()

    # If purpose is signup/verification, simply confirm verified without signing in
    if data.purpose == "signup":
        return {"status": "verified", "message": "Email verified successfully!"}

    # If purpose is login, find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(f"otp_{otp}_{time.time()}"),
            password_plain="",
            role=data.role or "athlete",
            auth_provider="email_otp"
        )
        db.add(user)
        db.flush()

        student = Student(
            user_id=user.id,
            name=data.name or email.split("@")[0].replace(".", " ").title(),
            email=email,
            level="Beginner",
            bio="",
            dob="",
            age=24,
            division="Men's Open",
            stance="regular",
            surf_stats=json.dumps({"waves_ridden": 0, "max_speed": "0 mph", "avg_session_mins": 0}),
            performance_logs=json.dumps([]),
            image="",
            last_active="Today",
            whatsapp_number="",
            guests_count=1,
            course_duration="3 Days Course",
            start_date=datetime.now().strftime("%Y-%m-%d"),
            end_date="",
            session_time="Morning 6:00 AM",
            staying_at_school="Yes",
            reminder_preference="WhatsApp Text",
            reminder_sent=False,
            guests_details=json.dumps([])
        )
        db.add(student)
        db.commit()
        db.refresh(user)

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "token": token,
        "user": make_user_response(user)
    }


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/api/auth/reset-password")
def reset_password_endpoint(data: ResetPasswordRequest, db: OrmSession = Depends(get_db)):
    email = data.email.lower().strip()
    otp = data.otp.strip()

    token_record = db.query(OtpToken).filter(
        OtpToken.email == email,
        OtpToken.otp == otp,
        OtpToken.used == 0,
        OtpToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    token_record.used = 1
    user.password_hash = hash_password(data.new_password)
    user.password_plain = data.new_password
    db.commit()

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "status": "success",
        "message": "Password updated successfully!",
        "token": token,
        "user": make_user_response(user)
    }


@app.post("/api/auth/login")
def auth_login(data: UserLogin, db: OrmSession = Depends(get_db)):
    email_clean = data.email.lower().strip()
    query = db.query(User).filter(func.lower(User.email) == email_clean)
    if data.role:
        query = query.filter(User.role == data.role.lower().strip())
    candidates = query.all()
    if not candidates:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    # Check password against candidate role accounts for this email
    matched_user = None
    for u in candidates:
        valid = False
        if u.password_hash and verify_password(data.password, u.password_hash):
            valid = True
        elif u.password_plain and u.password_plain == data.password:
            valid = True
        if valid:
            matched_user = u
            break

    if not matched_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = generate_token({"user_id": matched_user.id, "email": matched_user.email, "role": matched_user.role})
    return {
        "token": token,
        "user": make_user_response(matched_user)
    }


@app.post("/api/auth/sso")
def auth_sso(data: SSOLogin, db: OrmSession = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == data.email.lower()) | 
        ((User.auth_provider == data.provider) & (User.social_id == data.social_id))
    ).first()

    if not user:
        role = (data.role or "athlete").lower()
        if role not in ["athlete", "coach", "admin"]:
            role = "athlete"

        user = User(
            email=data.email.lower(),
            role=role,
            auth_provider=data.provider,
            social_id=data.social_id
        )
        db.add(user)
        db.flush()

        user_img = data.image or ""

        if role == "athlete":
            student = Student(
                user_id=user.id,
                name=data.name,
                email=data.email.lower(),
                level="Beginner",
                bio="Google Verified Surfer",
                age=24,
                division="Men's Open",
                stance="regular",
                surf_stats=json.dumps({"waves_ridden": 0, "max_speed": "0 mph", "avg_session_mins": 0}),
                performance_logs=json.dumps([]),
                image=data.image or "",
                last_active="Today"
            )
            db.add(student)
        elif role == "coach":
            instructor = Instructor(
                user_id=user.id,
                name=data.name,
                age=28,
                gender="Male",
                fitness_level="Advanced",
                experience="2 Years",
                certifications=json.dumps([]),
                image=data.image or "",
                bio="SSO Coach profile",
                specializations=json.dumps([]),
                rates="$60 / hr",
                location="Gold Coast, AUS",
                reviews=json.dumps([])
            )
            db.add(instructor)

        db.commit()
        db.refresh(user)

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "token": token,
        "user": make_user_response(user)
    }


@app.get("/api/auth/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return make_user_response(current_user)


@app.put("/api/students/{student_id}")
def update_student(student_id: int, data: StudentUpdate, db: OrmSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.name is not None:
        student.name = data.name
    if data.level is not None:
        student.level = data.level
    if data.bio is not None:
        student.bio = data.bio
    if data.stance is not None:
        student.stance = data.stance
    if data.dob is not None:
        student.dob = data.dob
        student.age = calculate_age_from_dob(data.dob) or data.age
    elif data.age is not None:
        student.age = data.age
    if data.division is not None:
        student.division = data.division
    if data.surf_stats is not None:
        student.surf_stats = json.dumps(data.surf_stats)
    if data.performance_logs is not None:
        student.performance_logs = json.dumps(data.performance_logs)
    if data.whatsapp_number is not None:
        student.whatsapp_number = data.whatsapp_number
    if data.guests_count is not None:
        student.guests_count = data.guests_count
    if data.course_duration is not None:
        student.course_duration = data.course_duration
    if data.start_date is not None:
        student.start_date = data.start_date
    if data.end_date is not None:
        student.end_date = data.end_date
    if data.session_time is not None:
        student.session_time = data.session_time
    if data.staying_at_school is not None:
        student.staying_at_school = data.staying_at_school
    if data.reminder_preference is not None:
        student.reminder_preference = data.reminder_preference
    if data.reminder_sent is not None:
        student.reminder_sent = data.reminder_sent
    if data.guests_details is not None:
        student.guests_details = json.dumps(data.guests_details)
    if data.image is not None:
        student.image = data.image
    if data.instructor_id is not None:
        if data.instructor_id <= 0:
            student.instructor_id = None
        else:
            student.instructor_id = data.instructor_id

    db.commit()
    db.refresh(student)
    return student_to_dict(student)


@app.put("/api/instructors/{instructor_id}")
def update_instructor(instructor_id: int, data: InstructorUpdate, db: OrmSession = Depends(get_db)):
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    if data.name is not None:
        instructor.name = data.name
    if data.email is not None:
        instructor.email = data.email
    if data.dob is not None:
        instructor.dob = data.dob
    if data.age is not None:
        instructor.age = data.age
    if data.gender is not None:
        instructor.gender = data.gender
    if data.bio is not None:
        instructor.bio = data.bio
    if data.experience is not None:
        instructor.experience = data.experience
    if data.fitness_level is not None:
        instructor.fitness_level = data.fitness_level
    if data.specializations is not None:
        instructor.specializations = json.dumps(data.specializations)
    if data.rates is not None:
        instructor.rates = data.rates
    if data.location is not None:
        instructor.location = data.location
    if data.certifications is not None:
        instructor.certifications = json.dumps(data.certifications)
    if data.image is not None:
        instructor.image = data.image
    if data.school is not None:
        instructor.school = data.school

    db.commit()
    db.refresh(instructor)
    return instructor_to_dict(instructor)


# ─── Logs Routes ──────────────────────────────────────────────────────────────

@app.get("/api/students/{student_id}/logs/nutrition")
def get_nutrition_logs(student_id: int, db: OrmSession = Depends(get_db)):
    logs = db.query(NutritionLog).filter(NutritionLog.student_id == student_id).order_by(NutritionLog.id.desc()).all()
    return [{
        "id": l.id,
        "date": l.date,
        "calories": l.calories,
        "hydration_liters": l.hydration_liters,
        "protein_g": l.protein_g,
        "carbs_g": l.carbs_g,
        "fats_g": l.fats_g,
        "meal_timing": l.meal_timing
    } for l in logs]


@app.post("/api/students/{student_id}/logs/nutrition")
def create_nutrition_log(student_id: int, data: NutritionLogCreate, db: OrmSession = Depends(get_db)):
    log = NutritionLog(
        student_id=student_id,
        date=data.date,
        calories=data.calories,
        hydration_liters=data.hydration_liters,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fats_g=data.fats_g,
        meal_timing=data.meal_timing or ""
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Success", "id": log.id}


@app.get("/api/students/{student_id}/logs/sc")
def get_sc_logs(student_id: int, db: OrmSession = Depends(get_db)):
    logs = db.query(SCLog).filter(SCLog.student_id == student_id).order_by(SCLog.id.desc()).all()
    return [{
        "id": l.id,
        "date": l.date,
        "workout_details": l.workout_details,
        "mobility_notes": l.mobility_notes,
        "sleep_score": l.sleep_score,
        "recovery_score": l.recovery_score,
        "injury_notes": l.injury_notes
    } for l in logs]


@app.post("/api/students/{student_id}/logs/sc")
def create_sc_log(student_id: int, data: SCLogCreate, db: OrmSession = Depends(get_db)):
    log = SCLog(
        student_id=student_id,
        date=data.date,
        workout_details=data.workout_details,
        mobility_notes=data.mobility_notes or "",
        sleep_score=data.sleep_score,
        recovery_score=data.recovery_score,
        injury_notes=data.injury_notes or ""
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Success", "id": log.id}


@app.get("/api/students/{student_id}/logs/technical")
def get_technical_logs(student_id: int, db: OrmSession = Depends(get_db)):
    logs = db.query(TechnicalLog).filter(TechnicalLog.student_id == student_id).order_by(TechnicalLog.id.desc()).all()
    return [{
        "id": l.id,
        "date": l.date,
        "session_notes": l.session_notes,
        "wave_count": l.wave_count,
        "board_setup": l.board_setup,
        "wave_type": l.wave_type,
        "video_url": l.video_url
    } for l in logs]


@app.post("/api/students/{student_id}/logs/technical")
def create_technical_log(student_id: int, data: TechnicalLogCreate, db: OrmSession = Depends(get_db)):
    log = TechnicalLog(
        student_id=student_id,
        date=data.date,
        session_notes=data.session_notes,
        wave_count=data.wave_count,
        board_setup=data.board_setup or "",
        wave_type=data.wave_type or "",
        video_url=data.video_url or ""
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Success", "id": log.id}


@app.get("/api/students/{student_id}/logs/mental")
def get_mental_logs(student_id: int, db: OrmSession = Depends(get_db)):
    logs = db.query(MentalLog).filter(MentalLog.student_id == student_id).order_by(MentalLog.id.desc()).all()
    return [{
        "id": l.id,
        "date": l.date,
        "pre_heat_anxiety": l.pre_heat_anxiety,
        "focus_level": l.focus_level,
        "reflection_notes": l.reflection_notes
    } for l in logs]


@app.post("/api/students/{student_id}/logs/mental")
def create_mental_log(student_id: int, data: MentalLogCreate, db: OrmSession = Depends(get_db)):
    log = MentalLog(
        student_id=student_id,
        date=data.date,
        pre_heat_anxiety=data.pre_heat_anxiety,
        focus_level=data.focus_level,
        reflection_notes=data.reflection_notes or ""
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"message": "Success", "id": log.id}


@app.get("/api/students/{student_id}/logs/summary")
def get_logs_summary(student_id: int, db: OrmSession = Depends(get_db)):
    # Nutrition averages
    nut_logs = db.query(NutritionLog).filter(NutritionLog.student_id == student_id).all()
    avg_calories = sum(n.calories for n in nut_logs) / len(nut_logs) if nut_logs else 0
    avg_hydration = sum(n.hydration_liters for n in nut_logs) / len(nut_logs) if nut_logs else 0.0

    # S&C averages
    sc_logs = db.query(SCLog).filter(SCLog.student_id == student_id).all()
    avg_sleep = sum(s.sleep_score for s in sc_logs) / len(sc_logs) if sc_logs else 0
    avg_recovery = sum(s.recovery_score for s in sc_logs) / len(sc_logs) if sc_logs else 0

    # Technical sums
    tech_logs = db.query(TechnicalLog).filter(TechnicalLog.student_id == student_id).all()
    total_waves = sum(t.wave_count for t in tech_logs) if tech_logs else 0

    # Mental averages
    mental_logs = db.query(MentalLog).filter(MentalLog.student_id == student_id).all()
    avg_anxiety = sum(m.pre_heat_anxiety for m in mental_logs) / len(mental_logs) if mental_logs else 0.0
    avg_focus = sum(m.focus_level for m in mental_logs) / len(mental_logs) if mental_logs else 0.0

    return {
        "nutrition": {
            "avg_calories": round(avg_calories),
            "avg_hydration": round(avg_hydration, 1),
            "log_count": len(nut_logs)
        },
        "sc": {
            "avg_sleep": round(avg_sleep),
            "avg_recovery": round(avg_recovery),
            "log_count": len(sc_logs)
        },
        "technical": {
            "total_waves": total_waves,
            "log_count": len(tech_logs)
        },
        "mental": {
            "avg_anxiety": round(avg_anxiety, 1),
            "avg_focus": round(avg_focus, 1),
            "log_count": len(mental_logs)
        }
    }


# ─── Mock Heats Routes ────────────────────────────────────────────────────────

@app.post("/api/mock-heats")
def create_mock_heat(data: MockHeatCreate, db: OrmSession = Depends(get_db)):
    # Verify student and coach exist
    student = db.query(Student).filter(Student.id == data.student_id).first()
    coach = db.query(Instructor).filter(Instructor.id == data.coach_id).first()
    if not student or not coach:
        raise HTTPException(status_code=404, detail="Student or coach not found")
    
    # Complete any active running heats for this student first to be clean
    active_heats = db.query(MockHeat).filter(
        MockHeat.student_id == data.student_id,
        MockHeat.status == "Running"
    ).all()
    for ah in active_heats:
        ah.status = "Completed"
    
    today_str = datetime.now().strftime("%d %b %Y")
    
    # Initialize mock heat
    heat = MockHeat(
        student_id=data.student_id,
        coach_id=data.coach_id,
        date=today_str,
        duration_mins=data.duration_mins or 20,
        status="Running",
        strategy_focus=data.strategy_focus or "",
        heat_total=0.0,
        priority_status="Athlete",
        wave_progression=json.dumps([{"time": "Start", "action": "Mock Heat Initiated"}])
    )
    db.add(heat)
    db.commit()
    db.refresh(heat)
    
    # Log activity
    db.add(ActivityLog(text=f"Coach {coach.name} initiated mock heat with {student.name}", type="session"))
    db.commit()
    
    return {"heat_id": heat.id, "message": "Mock heat started"}


@app.get("/api/mock-heats/active/{student_id}")
def get_active_mock_heat(student_id: int, db: OrmSession = Depends(get_db)):
    heat = db.query(MockHeat).filter(
        MockHeat.student_id == student_id,
        MockHeat.status == "Running"
    ).order_by(MockHeat.id.desc()).first()
    if not heat:
        return {"active": False}
    
    # Build details
    waves = db.query(MockHeatWave).filter(MockHeatWave.mock_heat_id == heat.id).order_by(MockHeatWave.wave_number.asc()).all()
    
    return {
        "active": True,
        "id": heat.id,
        "duration_mins": heat.duration_mins,
        "strategy_focus": heat.strategy_focus,
        "priority_status": heat.priority_status,
        "heat_total": heat.heat_total,
        "wave_progression": json.loads(heat.wave_progression) if heat.wave_progression else [],
        "waves": [{
            "wave_number": w.wave_number,
            "score": w.score,
            "notes": w.notes,
            "timestamp": w.timestamp
        } for w in waves]
    }


@app.post("/api/mock-heats/{heat_id}/waves")
def log_mock_heat_wave(heat_id: int, data: MockHeatWaveCreate, db: OrmSession = Depends(get_db)):
    heat = db.query(MockHeat).filter(MockHeat.id == heat_id).first()
    if not heat:
        raise HTTPException(status_code=404, detail="Mock heat not found")
    
    # Count current waves to get wave number
    wave_count = db.query(MockHeatWave).filter(MockHeatWave.mock_heat_id == heat_id).count()
    new_wave_num = wave_count + 1
    
    wave = MockHeatWave(
        mock_heat_id=heat_id,
        wave_number=new_wave_num,
        score=data.score,
        notes=data.notes or "",
        timestamp=data.timestamp or ""
    )
    db.add(wave)
    db.flush()
    
    # Recalculate heat total (sum of top 2 wave scores)
    all_waves = db.query(MockHeatWave).filter(MockHeatWave.mock_heat_id == heat_id).all()
    scores = sorted([w.score for w in all_waves], reverse=True)
    top_2_sum = sum(scores[:2]) if scores else 0.0
    heat.heat_total = round(top_2_sum, 2)
    
    # Append to progression list
    prog = json.loads(heat.wave_progression) if heat.wave_progression else []
    prog.append({
        "time": data.timestamp or f"Wave {new_wave_num}",
        "action": f"Wave {new_wave_num} Ridden — Score: {data.score}",
        "score": data.score,
        "notes": data.notes or ""
    })
    heat.wave_progression = json.dumps(prog)
    db.commit()
    
    return {
        "message": "Wave logged successfully",
        "wave_number": new_wave_num,
        "heat_total": heat.heat_total,
        "wave_progression": prog
    }


@app.post("/api/mock-heats/{heat_id}/priority")
def toggle_mock_heat_priority(heat_id: int, db: OrmSession = Depends(get_db)):
    heat = db.query(MockHeat).filter(MockHeat.id == heat_id).first()
    if not heat:
        raise HTTPException(status_code=404, detail="Mock heat not found")
    
    new_priority = "Opponent" if heat.priority_status == "Athlete" else "Athlete"
    heat.priority_status = new_priority
    
    # Log to progression
    prog = json.loads(heat.wave_progression) if heat.wave_progression else []
    prog.append({
        "time": "Priority Switch",
        "action": f"Priority switched to {new_priority}"
    })
    heat.wave_progression = json.dumps(prog)
    db.commit()
    
    return {"priority_status": new_priority, "wave_progression": prog}


@app.post("/api/mock-heats/{heat_id}/complete")
def complete_mock_heat(heat_id: int, data: MockHeatComplete, db: OrmSession = Depends(get_db)):
    heat = db.query(MockHeat).filter(MockHeat.id == heat_id).first()
    if not heat:
        raise HTTPException(status_code=404, detail="Mock heat not found")
    
    heat.status = "Completed"
    heat.strategy_execution = data.strategy_execution or ""
    
    # Log end of heat
    prog = json.loads(heat.wave_progression) if heat.wave_progression else []
    prog.append({
        "time": "00:00",
        "action": "Mock Heat Completed"
    })
    heat.wave_progression = json.dumps(prog)
    
    # Automated Data Sync: Add a summary message to Student performance logs
    student = db.query(Student).filter(Student.id == heat.student_id).first()
    if student:
        perf_logs = json.loads(student.performance_logs) if student.performance_logs else []
        summary_log = f"Mock Heat on {heat.date} — Final Score: {heat.heat_total} (Strategy: {heat.strategy_focus or 'Open'})."
        if summary_log not in perf_logs:
            perf_logs.append(summary_log)
            student.performance_logs = json.dumps(perf_logs)
            
    db.commit()
    
    return {"message": "Mock heat completed and synced to student profile"}


@app.post("/api/mock-heats/{heat_id}/analyze")
def analyze_mock_heat(heat_id: int, db: OrmSession = Depends(get_db)):
    heat = db.query(MockHeat).filter(MockHeat.id == heat_id).first()
    if not heat:
        raise HTTPException(status_code=404, detail="Mock heat not found")
    
    # Simple rule-based AI generator to evaluate strengths and weaknesses
    waves = db.query(MockHeatWave).filter(MockHeatWave.mock_heat_id == heat_id).all()
    scores = [w.score for w in waves]
    avg_score = sum(scores) / len(scores) if scores else 0.0
    
    strengths = []
    weaknesses = []
    
    # Analyze scores
    if not scores:
        strengths.append("Attempted strategy drills.")
        weaknesses.append("Did not catch any scoring waves. Improve positioning.")
    else:
        if len(scores) >= 4:
            strengths.append("High wave activity and selection frequency.")
        else:
            weaknesses.append("Low wave count. Missed opportunities in the heat window.")
            
        if any(s >= 7.5 for s in scores):
            strengths.append("Capable of generating excellent-range scores (7.5+) on select waves.")
        
        if avg_score > 6.0:
            strengths.append("High baseline scoring floor. Consistently finishing rides.")
        else:
            weaknesses.append("Average wave score is low. Work on finishing turns on the inside section.")
            
    # Analyze strategy execution
    exec_text = (heat.strategy_execution or "").lower()
    focus_text = (heat.strategy_focus or "").lower()
    
    if "priority" in focus_text:
        if "lost" in exec_text or "poor" in exec_text:
            weaknesses.append("Tactical priority errors. Gave up position too easily.")
        else:
            strengths.append("Controlled priority effectively to shut down opponent's wave selection.")
            
    if "set" in focus_text or "outside" in focus_text:
        if "waited" in exec_text or "good selection" in exec_text:
            strengths.append("Patient heat management. Waited for the best set waves.")
        else:
            weaknesses.append("Poor wave selection. Caught average backup waves instead of high-scoring sets.")
            
    # Default fallbacks if empty
    if not strengths:
        strengths = ["Solid baseline paddling speed", "Good stance adjustment under pressure"]
    if not weaknesses:
        weaknesses = ["Pop-up reaction timing on steeper drops", "Priority management in the middle of the heat"]
        
    heat.tactical_strengths = json.dumps(strengths)
    heat.tactical_weaknesses = json.dumps(weaknesses)
    db.commit()
    
    return {
        "tactical_strengths": strengths,
        "tactical_weaknesses": weaknesses,
        "coaching_advice": "Focus on S&C explosive drills to improve pop-up timing. During heats, hold priority on the peak and wait for set-wave backing rather than settling for backup waves."
    }


@app.get("/api/students/{student_id}/mock-heats")
def get_student_mock_heats(student_id: int, db: OrmSession = Depends(get_db)):
    heats = db.query(MockHeat).filter(MockHeat.student_id == student_id).order_by(MockHeat.id.desc()).all()
    
    result = []
    for h in heats:
        waves = db.query(MockHeatWave).filter(MockHeatWave.mock_heat_id == h.id).order_by(MockHeatWave.wave_number.asc()).all()
        result.append({
            "id": h.id,
            "date": h.date,
            "duration_mins": h.duration_mins,
            "status": h.status,
            "strategy_focus": h.strategy_focus,
            "strategy_execution": h.strategy_execution,
            "heat_total": h.heat_total,
            "priority_status": h.priority_status,
            "wave_progression": json.loads(h.wave_progression) if h.wave_progression else [],
            "tactical_strengths": json.loads(h.tactical_strengths) if h.tactical_strengths else [],
            "tactical_weaknesses": json.loads(h.tactical_weaknesses) if h.tactical_weaknesses else [],
            "waves": [{
                "wave_number": w.wave_number,
                "score": w.score,
                "notes": w.notes,
                "timestamp": w.timestamp
            } for w in waves]
        })
    return result


@app.post("/api/upload-video")
def upload_video(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1] or ".mp4"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    content_type = file.content_type or "video/mp4"
    contents = file.file.read()
    
    if S3_BUCKET_NAME:
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=unique_filename,
                Body=contents,
                ContentType=content_type
            )
            video_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
            return {"video_url": video_url, "url": video_url}
        except Exception as e:
            print(f"S3 video upload error: {e}")
            
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    video_url = f"/uploads/{unique_filename}"
    return {"video_url": video_url, "url": video_url}


@app.post("/api/upload-image")
def upload_image(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    content_type = file.content_type or "image/jpeg"
    contents = file.file.read()
    
    if S3_BUCKET_NAME:
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=unique_filename,
                Body=contents,
                ContentType=content_type
            )
            image_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
            return {"image_url": image_url, "url": image_url}
        except Exception as e:
            print(f"S3 image upload error: {e}")
            
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    image_url = f"/uploads/{unique_filename}"
    return {"image_url": image_url, "url": image_url}



# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/api/dashboard/stats")
def dashboard_stats(db: OrmSession = Depends(get_db)):
    today_str = datetime.now().strftime("%d %b %Y")
    return {
        "active_instructors": db.query(Instructor).count(),
        "active_students": db.query(Student).count(),
        "sessions_this_month": db.query(SurfSession).filter(
            SurfSession.status == "Completed"
        ).count(),
        "upcoming_sessions": db.query(SurfSession).filter(
            SurfSession.status == "Upcoming"
        ).count(),
    }


@app.get("/api/dashboard/sessions")
def dashboard_sessions(db: OrmSession = Depends(get_db)):
    today_str = datetime.now().strftime("%d %b %Y")
    sessions = db.query(SurfSession).filter(
        SurfSession.date == today_str
    ).all()
    return [
        {
            "time": s.time,
            "instructor": s.instructor_rel.name if s.instructor_rel else "",
            "student": s.student_rel.name if s.student_rel else "",
            "status": s.status,
        }
        for s in sessions
    ]


@app.get("/api/dashboard/activity")
def dashboard_activity(db: OrmSession = Depends(get_db)):
    activities = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(5).all()
    result = []
    for i, a in enumerate(activities):
        delta = datetime.utcnow() - a.created_at
        mins = int(delta.total_seconds() / 60)
        if mins < 60:
            time_str = f"{mins}m ago"
        elif mins < 1440:
            time_str = f"{mins // 60}h ago"
        else:
            time_str = f"{mins // 1440}d ago"
        result.append({"id": a.id, "text": a.text, "type": a.type, "time": time_str})
    return result


# ─── Instructors ──────────────────────────────────────────────────────────────

@app.get("/api/instructors")
def get_instructors(db: OrmSession = Depends(get_db)):
    return [instructor_to_dict(i) for i in db.query(Instructor).all()]


@app.get("/api/instructors/{instructor_id}")
def get_instructor(instructor_id: int, db: OrmSession = Depends(get_db)):
    i = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Instructor not found")
    d = instructor_to_dict(i)
    # Include sessions
    d["sessions"] = [
        {
            "date": s.date,
            "time": s.time,
            "student": s.student_rel.name if s.student_rel else "",
            "location": s.location,
            "status": s.status,
        }
        for s in i.sessions
    ]
    d["student_count"] = len(set(s.student_id for s in i.sessions))
    return d


@app.post("/api/instructors")
def create_instructor(data: InstructorCreate, db: OrmSession = Depends(get_db)):
    user_id = None
    email_clean = (data.email or "").strip().lower()
    
    if email_clean:
        existing_user = db.query(User).filter(func.lower(User.email) == email_clean).first()
        if existing_user:
            user_id = existing_user.id
            if data.password and len(data.password.strip()) >= 6:
                existing_user.password_hash = hash_password(data.password.strip())
                existing_user.password_plain = data.password.strip()
                existing_user.role = "coach"
                existing_user.approval_status = "approved"
        elif data.password and len(data.password.strip()) >= 6:
            new_user = User(
                email=email_clean,
                password_hash=hash_password(data.password.strip()),
                password_plain=data.password.strip(),
                role="coach",
                auth_provider="email",
                approval_status="approved",
                created_by_school=True
            )
            db.add(new_user)
            db.flush()
            user_id = new_user.id

    instructor = Instructor(
        user_id=user_id,
        name=data.name,
        email=email_clean or "",
        dob=data.dob or "",
        age=data.age or 28,
        gender=data.gender or "Male",
        fitness_level=data.fitness_level or "Elite",
        experience=data.experience or "2 Years",
        certifications=json.dumps(data.certifications),
        image=data.image or "",
        school=data.school or "Individual / Freelance Coach",
    )
    db.add(instructor)
    db.commit()
    db.refresh(instructor)
    db.add(ActivityLog(text=f"New instructor {data.name} joined the team", type="group"))
    db.commit()
    return instructor_to_dict(instructor)


@app.delete("/api/instructors/{instructor_id}")
def delete_instructor(instructor_id: int, db: OrmSession = Depends(get_db)):
    i = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Instructor not found")
    try:
        db.query(Student).filter(Student.instructor_id == instructor_id).update({"instructor_id": None})
        db.query(SurfSession).filter(SurfSession.instructor_id == instructor_id).delete()
        db.query(MockHeat).filter(MockHeat.coach_id == instructor_id).delete()
        if i.user_id:
            db.query(User).filter(User.id == i.user_id).delete()
        db.delete(i)
        db.commit()
    except Exception:
        db.rollback()
        db.delete(i)
        db.commit()
    return {"message": "Instructor deleted successfully"}


# ─── Students ─────────────────────────────────────────────────────────────────

@app.get("/api/students")
def get_students(db: OrmSession = Depends(get_db)):
    return [student_to_dict(s) for s in db.query(Student).all()]


@app.get("/api/students/{student_id}")
def get_student(student_id: int, db: OrmSession = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    d = student_to_dict(s)
    d["badges"] = [b.badge_level for b in s.badges]
    d["session_count"] = len(s.sessions)
    d["sessions"] = [session_to_dict(sess) for sess in s.sessions]
    return d


@app.post("/api/students")
def create_student(data: StudentCreate, db: OrmSession = Depends(get_db)):
    # Auto-calculate end_date if start_date is provided
    end_date = data.end_date
    if data.start_date and not end_date:
        try:
            total_days = 3
            for token in (data.course_duration or "3 Days Course").split():
                if token.isdigit():
                    total_days = int(token)
                    break
            s_date = datetime.strptime(data.start_date.strip(), "%Y-%m-%d").date()
            e_date = s_date + timedelta(days=total_days - 1)
            end_date = e_date.strftime("%Y-%m-%d")
        except Exception:
            pass

    # If admin sets an initial password, create the User account directly
    user_id = None
    if data.password and data.email:
        existing_user = db.query(User).filter(User.email == data.email.lower().trim()).first()
        if not existing_user:
            new_user = User(
                email=data.email.lower().trim(),
                password_hash=hash_password(data.password),
                password_plain=data.password,
                role="athlete",
                auth_provider="email",
                created_by_school=True
            )
            db.add(new_user)
            db.flush()
            user_id = new_user.id
        else:
            user_id = existing_user.id

    student = Student(
        user_id=user_id,
        name=data.name, email=data.email, level=data.level,
        instructor_id=data.instructor_id,
        image=data.image or "",
        last_active="Today",
        whatsapp_number=data.whatsapp_number or "",
        guests_count=data.guests_count or 1,
        course_duration=data.course_duration or "3 Days Course",
        start_date=data.start_date or datetime.now().strftime("%Y-%m-%d"),
        end_date=end_date or "",
        session_time=data.session_time or "Morning 6:00 AM",
        staying_at_school=data.staying_at_school or "Yes",
        reminder_preference=data.reminder_preference or "WhatsApp Text",
        reminder_sent=bool(data.reminder_sent),
        guests_details=json.dumps(data.guests_details or [])
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    db.add(ActivityLog(text=f"{data.name} joined as a new student", type="group"))
    db.commit()
    db.refresh(student)
    return student_to_dict(student)


@app.post("/api/students/bulk")
def create_students_bulk(students_data: List[StudentCreate], db: OrmSession = Depends(get_db)):
    created = []
    for data in students_data:
        if not data.name or not data.email:
            continue
        user_id = None
        if data.password and data.email:
            existing_user = db.query(User).filter(User.email == data.email.lower().strip()).first()
            if not existing_user:
                new_user = User(
                    email=data.email.lower().strip(),
                    password_hash=hash_password(data.password),
                    password_plain=data.password,
                    role="athlete",
                    auth_provider="email",
                    created_by_school=True
                )
                db.add(new_user)
                db.flush()
                user_id = new_user.id
            else:
                user_id = existing_user.id

        student = Student(
            user_id=user_id,
            name=data.name, email=data.email, level=data.level or "Beginner",
            instructor_id=data.instructor_id,
            image=data.image or "",
            last_active="Today",
            whatsapp_number=data.whatsapp_number or "",
            guests_count=data.guests_count or 1,
            course_duration=data.course_duration or "3 Days Course",
            start_date=data.start_date or datetime.now().strftime("%Y-%m-%d"),
            end_date=data.end_date or "",
            session_time=data.session_time or "Morning 6:00 AM",
            staying_at_school=data.staying_at_school or "Yes",
            reminder_preference=data.reminder_preference or "WhatsApp Text",
            reminder_sent=bool(data.reminder_sent),
            guests_details=json.dumps(data.guests_details or [])
        )
        db.add(student)
        db.flush()
        created.append(student_to_dict(student))
    
    db.commit()
    db.add(ActivityLog(text=f"Bulk imported {len(created)} new students", type="group"))
    db.commit()
    return {"message": f"Successfully created {len(created)} students", "students": created}


class AttendanceCreate(BaseModel):
    student_id: int
    date: Optional[str] = None # YYYY-MM-DD (defaults to today)
    present_status: Optional[str] = "Present"
    guests_present: Optional[int] = 0
    notes: Optional[str] = ""


@app.get("/api/attendance")
def get_all_attendance(db: OrmSession = Depends(get_db)):
    records = db.query(AttendanceRecord).order_by(AttendanceRecord.id.desc()).all()
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student_rel.name if r.student_rel else "Unknown",
            "date": r.date,
            "present_status": r.present_status,
            "guests_present": r.guests_present,
            "day_number": r.day_number,
            "remaining_days": r.remaining_days,
            "notes": r.notes,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
        }
        for r in records
    ]


@app.get("/api/students/{student_id}/attendance")
def get_student_attendance(student_id: int, db: OrmSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).order_by(AttendanceRecord.date.desc()).all()
    return [
        {
            "id": r.id,
            "date": r.date,
            "present_status": r.present_status,
            "guests_present": r.guests_present,
            "day_number": r.day_number,
            "remaining_days": r.remaining_days,
            "notes": r.notes,
        }
        for r in records
    ]


@app.post("/api/attendance")
def record_attendance(data: AttendanceCreate, db: OrmSession = Depends(get_db)):
    """Tamper-proof daily attendance marking endpoint."""
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    today_str = data.date or datetime.now().strftime("%Y-%m-%d")

    # Prevent backdating and duplicate entries for the same student on the same date
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == data.student_id,
        AttendanceRecord.date == today_str
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for {student.name} on {today_str} (Status: {existing.present_status})"
        )

    # Calculate day number from previous attendance count
    attended_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == data.student_id,
        AttendanceRecord.present_status == "Present"
    ).count()

    # Parse course total days
    dur_str = student.course_duration or "3 Days Course"
    total_days = 3
    for token in dur_str.split():
        if token.isdigit():
            total_days = int(token)
            break

    next_day_num = attended_count + 1 if data.present_status == "Present" else attended_count
    remaining = max(0, total_days - next_day_num)

    rec = AttendanceRecord(
        student_id=data.student_id,
        date=today_str,
        present_status=data.present_status or "Present",
        guests_present=data.guests_present or 0,
        day_number=next_day_num,
        remaining_days=remaining,
        notes=data.notes or ""
    )
    db.add(rec)
    
    # Update student last_active and reminder status if needed
    student.last_active = "Today"
    db.commit()
    db.refresh(rec)

    return {
        "message": f"Attendance marked for {student.name}",
        "attendance_id": rec.id,
        "day_number": rec.day_number,
        "remaining_days": rec.remaining_days,
        "date": rec.date,
        "status": rec.present_status
    }


@app.post("/api/admin/whatsapp-dispatch")
def whatsapp_dispatch_all(db: OrmSession = Depends(get_db)):
    """Module 3: WhatsApp batch dispatch & reminder log generator."""
    students = db.query(Student).all()
    dispatch_list = []
    
    for s in students:
        s_dict = student_to_dict(s)
        # Filter active students with valid whatsapp numbers
        if s_dict["whatsapp_number"] and s_dict["remaining_days"] > 0:
            s.reminder_sent = True
            dispatch_list.append({
                "student_id": s.id,
                "name": s.name,
                "whatsapp_number": s_dict["whatsapp_number"],
                "which_day": s_dict["which_day"],
                "total_days": s_dict["total_days"],
                "session_time": s.session_time or "Morning 6:00 AM",
                "wa_link": s_dict["wa_link"],
                "reminder_sent": True
            })
            
    db.commit()
    return {
        "status": "success",
        "count": len(dispatch_list),
        "dispatches": dispatch_list,
        "message": f"Successfully generated & flagged {len(dispatch_list)} daily WhatsApp reminders!"
    }


@app.post("/api/admin/whatsapp-reset")
def whatsapp_reset_daily(db: OrmSession = Depends(get_db)):
    """Module 2 & 3: Daily midnight reset for reminder flags."""
    db.query(Student).update({"reminder_sent": False})
    db.commit()
    return {"status": "success", "message": "Daily reminder flags reset for all active students."}


@app.post("/api/students/{student_id}/generate-invite")
def generate_invite(student_id: int, db: OrmSession = Depends(get_db)):
    """Generate a unique shareable invite token for a student record created by admin."""
    import secrets as _secrets
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # Generate a secure 32-byte URL-safe token
    token = _secrets.token_urlsafe(32)
    student.invite_token = token
    db.commit()
    return {"token": token, "student_id": student.id, "name": student.name, "email": student.email}



@app.get("/api/invite/{token}")
def get_invite_info(token: str, db: OrmSession = Depends(get_db)):
    """Return full student profile data for the direct student portal (no login needed)."""
    student = db.query(Student).filter(Student.invite_token == token).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link")
    sch = db.query(School).first()
    sch_name = sch.name if sch else "Aquatic Indica Surf School"
    password_set = student.user_id is not None
    instructor_name = None
    if student.instructor_id:
        instr = db.query(Instructor).filter(Instructor.id == student.instructor_id).first()
        if instr:
            instructor_name = instr.name
    return {
        "valid": True,
        "student_id": student.id,
        "name": student.name,
        "email": student.email or "",
        "level": student.level or "Beginner",
        "whatsapp_number": student.whatsapp_number or "",
        "instructor_id": student.instructor_id,
        "instructor_name": instructor_name,
        "session_time": student.session_time or "Morning 6:00 AM",
        "course_duration": student.course_duration or "3 Days Course",
        "start_date": student.start_date or "",
        "staying_at_school": student.staying_at_school or "",
        "approval_status": student.approval_status or "approved",
        "school_name": sch_name,
        "image": student.image or "",
        "password_set": password_set,
    }


@app.post("/api/invite/{token}/set-password")
def set_invite_password(token: str, data: dict, db: OrmSession = Depends(get_db)):
    """Student sets their password via the invite link. Creates User account and links to student."""
    student = db.query(Student).filter(Student.invite_token == token).first()
    if not student:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link")

    password = data.get("password", "").strip()
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if student.user_id:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            user.password_hash = hash_password(password)
            user.password_plain = password
            db.commit()
            return {"success": True, "message": "Password updated successfully"}
        raise HTTPException(status_code=400, detail="Account already set up")

    email = student.email or ""
    if not email:
        raise HTTPException(status_code=400, detail="Student has no email address")

    existing_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if existing_user:
        student.user_id = existing_user.id
        existing_user.password_hash = hash_password(password)
        existing_user.password_plain = password
        student.invite_token = None
        db.commit()
        return {"success": True, "message": "Password set successfully. You can now log in."}

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        password_plain=password,
        role="athlete",
        auth_provider="email",
        approval_status="approved",
        created_by_school=True
    )
    db.add(user)
    db.flush()
    student.user_id = user.id
    student.invite_token = None
    student.approval_status = "approved"
    db.add(ActivityLog(text=f"{student.name} set their password and activated their account", type="group"))
    db.commit()
    return {"success": True, "message": "Password set! You can now log in with your email."}


@app.post("/api/students/{student_id}/set-password")
def set_student_password(student_id: int, data: dict, db: OrmSession = Depends(get_db)):
    """Direct password setting from student profile page."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    password = data.get("password", "").strip()
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    email = student.email or ""
    if not email:
        raise HTTPException(status_code=400, detail="Student has no email address")
    
    if student.user_id:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            user.password_hash = hash_password(password)
            user.password_plain = password
            student.invite_token = None
            db.commit()
            return {"success": True, "message": "Password updated successfully"}
    
    existing_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if existing_user:
        student.user_id = existing_user.id
        existing_user.password_hash = hash_password(password)
        existing_user.password_plain = password
        student.invite_token = None
        db.commit()
        return {"success": True, "message": "Password updated successfully"}
    
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        password_plain=password,
        role="athlete",
        auth_provider="email",
        approval_status="approved",
        created_by_school=True
    )
    db.add(user)
    db.flush()
    student.user_id = user.id
    student.invite_token = None
    student.approval_status = "approved"
    db.commit()
    return {"success": True, "message": "Password set! You can now log in anytime."}


@app.post("/api/instructors/{instructor_id}/set-password")
def set_instructor_password(instructor_id: int, data: dict, db: OrmSession = Depends(get_db)):
    """Direct password setting / updating for coach from instructor profile page."""
    instructor = db.query(Instructor).filter(Instructor.id == instructor_id).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")
    password = data.get("password", "").strip()
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    email = (data.get("email") or instructor.email or "").strip().lower()
    if not email:
        safe_name = "".join(c for c in instructor.name.lower() if c.isalnum()) or f"coach{instructor.id}"
        email = f"{safe_name}@aisurf.io"
        instructor.email = email
    else:
        instructor.email = email
    
    if instructor.user_id:
        user = db.query(User).filter(User.id == instructor.user_id).first()
        if user:
            user.email = email
            user.password_hash = hash_password(password)
            user.password_plain = password
            db.commit()
            return {"success": True, "message": "Password updated successfully! You can now log in with your email.", "email": email, "password_plain": password}
    
    existing_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if existing_user:
        instructor.user_id = existing_user.id
        existing_user.role = "coach"
        existing_user.password_hash = hash_password(password)
        existing_user.password_plain = password
        db.commit()
        return {"success": True, "message": "Password updated successfully! You can now log in with your email.", "email": email, "password_plain": password}
    
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        password_plain=password,
        role="coach",
        auth_provider="email",
        approval_status="approved",
        created_by_school=True
    )
    db.add(user)
    db.flush()
    instructor.user_id = user.id
    db.commit()
    return {"success": True, "message": "Password set! You can now log in anytime with your email.", "email": email, "password_plain": password}


@app.post("/api/students/{student_id}/approve")
def approve_student(student_id: int, db: OrmSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.approval_status = "approved"
    if student.user_rel:
        student.user_rel.approval_status = "approved"
    if student.email:
        u = db.query(User).filter(func.lower(User.email) == student.email.lower()).first()
        if u:
            u.approval_status = "approved"
    db.commit()
    return {"status": "success", "message": f"Student {student.name} approved"}


class ApproveEmailData(BaseModel):
    email: str


@app.post("/api/students/approve-by-email")
def approve_student_by_email(data: ApproveEmailData, db: OrmSession = Depends(get_db)):
    email_clean = (data.email or "").strip().lower()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email is required")
    
    st_count = 0
    students = db.query(Student).filter(func.lower(Student.email) == email_clean).all()
    for s in students:
        s.approval_status = "approved"
        st_count += 1
    
    users = db.query(User).filter(func.lower(User.email) == email_clean).all()
    for u in users:
        u.approval_status = "approved"
        # If user is athlete and has no student record, auto-create student record
        if u.role == "athlete" and not u.student and st_count == 0:
            new_st = Student(
                user_id=u.id,
                name=u.email.split("@")[0].capitalize(),
                email=u.email,
                level="Beginner",
                approval_status="approved",
                school="Aquatic Indica Surf School",
                start_date=datetime.now().strftime("%Y-%m-%d"),
                course_duration="3 Days Course",
                session_time="08:30 AM",
                staying_at_school="Yes"
            )
            db.add(new_st)
            st_count += 1

    db.commit()
    return {"status": "success", "message": f"Approved {email_clean}", "updated_students": st_count}


@app.get("/api/auth/check-approval")
def check_approval(email: str, db: OrmSession = Depends(get_db)):
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return {"email": email, "status": "approved", "is_approved": True}
        
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    student = db.query(Student).filter(func.lower(Student.email) == email_clean).first()

    u_stat = getattr(user, "approval_status", None) if user else None
    s_stat = getattr(student, "approval_status", None) if student else None

    # If explicitly pending in user or student table
    if u_stat == "pending" or s_stat == "pending":
        is_approved = False
    elif u_stat == "approved" or s_stat == "approved":
        is_approved = True
    else:
        # Default fallback for users created earlier or via direct student list
        is_approved = True

    return {
        "email": email_clean,
        "status": "approved" if is_approved else "pending",
        "is_approved": is_approved,
        "student_id": student.id if student else (user.student.id if user and user.student else None)
    }


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: OrmSession = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if s:
        db.query(SurfSession).filter(SurfSession.student_id == s.id).delete()
        if s.email:
            u = db.query(User).filter(func.lower(User.email) == s.email.lower()).first()
            if u:
                db.delete(u)
        db.delete(s)
        db.commit()
        return {"message": "Deleted"}
    
    u = db.query(User).filter(User.id == student_id).first()
    if u:
        if u.email:
            st = db.query(Student).filter(func.lower(Student.email) == u.email.lower()).first()
            if st:
                db.query(SurfSession).filter(SurfSession.student_id == st.id).delete()
                db.delete(st)
        db.delete(u)
        db.commit()
        return {"message": "Deleted"}
        
    return {"message": "Deleted"}


# ─── Sessions ─────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions(db: OrmSession = Depends(get_db)):
    sessions = db.query(SurfSession).order_by(SurfSession.id.desc()).all()
    return [session_to_dict(s) for s in sessions]


@app.get("/api/sessions/{session_id}")
def get_session(session_id: int, db: OrmSession = Depends(get_db)):
    s = db.query(SurfSession).filter(SurfSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_to_dict(s)


@app.post("/api/sessions")
def create_session(data: SessionCreate, db: OrmSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == data.student_id).first()
    instructor = db.query(Instructor).filter(Instructor.id == data.instructor_id).first()
    session = SurfSession(
        date=data.date, time=data.time, duration_mins=data.duration_mins,
        student_id=data.student_id, instructor_id=data.instructor_id,
        location=data.location, condition=data.condition,
        type=data.type, status=data.status or "Upcoming",
        notes=data.notes or "",
        video_url=data.video_url or "",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    student_name = student.name if student else "Unknown"
    instructor_name = instructor.name if instructor else "Unknown"
    db.add(ActivityLog(
        text=f"{student_name} session with {instructor_name} scheduled at {data.location}",
        type="session"
    ))
    db.commit()
    return session_to_dict(session)


@app.post("/api/sessions/bulk")
def create_sessions_bulk(data: SessionBulkCreate, db: OrmSession = Depends(get_db)):
    instructor = db.query(Instructor).filter(Instructor.id == data.instructor_id).first()
    instructor_name = instructor.name if instructor else "Coach"
    created = []
    student_names = []
    for sid in data.student_ids:
        st = db.query(Student).filter(Student.id == sid).first()
        if st:
            student_names.append(st.name)
        session = SurfSession(
            date=data.date, time=data.time, duration_mins=data.duration_mins,
            student_id=sid, instructor_id=data.instructor_id,
            location=data.location, condition=data.condition,
            type=data.type, status=data.status or "Upcoming",
            notes=data.notes or "",
            video_url=data.video_url or "",
        )
        db.add(session)
        created.append(session)
    db.commit()
    for s in created:
        db.refresh(s)
    
    count = len(created)
    names_summary = ", ".join(student_names[:3]) + (f" and {count - 3} more" if count > 3 else "")
    db.add(ActivityLog(
        text=f"Group Session for {count} student(s) ({names_summary}) with {instructor_name} scheduled at {data.location} ({data.time})",
        type="session"
    ))
    db.commit()
    return [session_to_dict(s) for s in created]


@app.put("/api/sessions/{session_id}")
def update_session(session_id: int, data: SessionUpdate, db: OrmSession = Depends(get_db)):
    s = db.query(SurfSession).filter(SurfSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if data.date is not None:
        s.date = data.date
    if data.time is not None:
        s.time = data.time
    if data.duration_mins is not None:
        s.duration_mins = data.duration_mins
    if data.student_id is not None:
        s.student_id = data.student_id
    if data.instructor_id is not None:
        s.instructor_id = data.instructor_id
    if data.location is not None:
        s.location = data.location
    if data.condition is not None:
        s.condition = data.condition
    if data.type is not None:
        s.type = data.type
    if data.status is not None:
        s.status = data.status
    if data.notes is not None:
        s.notes = data.notes
    if data.video_url is not None:
        s.video_url = data.video_url

    db.commit()
    db.refresh(s)
    return session_to_dict(s)


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int, db: OrmSession = Depends(get_db)):
    s = db.query(SurfSession).filter(SurfSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}


# ─── Analytics ────────────────────────────────────────────────────────────────

BADGE_ORDER = ["WHITE", "YELLOW", "GREEN", "BLUE", "RED"]

@app.get("/api/analytics/badges")
def analytics_badges(db: OrmSession = Depends(get_db)):
    result = []
    for level in BADGE_ORDER:
        count = db.query(Badge).filter(Badge.badge_level == level).count()
        result.append({"label": level, "count": count})
    return result


@app.get("/api/analytics/students")
def analytics_students(db: OrmSession = Depends(get_db)):
    students = db.query(Student).all()
    result = []
    for s in students:
        badges_earned = [b.badge_level for b in s.badges]
        badge_count = len(badges_earned)
        # estimate next badge time
        if badge_count >= 5:
            next_time, next_color = "Max Level", "#0D9488"
        elif badge_count == 4:
            next_time, next_color = "3 months", "#64748B"
        elif badge_count == 3:
            next_time, next_color = "Ready Now", "#0D9488"
        elif badge_count == 2:
            next_time, next_color = "1 month", "#64748B"
        elif badge_count == 1:
            next_time, next_color = "3 weeks", "#64748B"
        else:
            next_time, next_color = "2 months", "#64748B"
        result.append({
            "name": s.name,
            "badges": badge_count,
            "badge_levels": badges_earned,
            "nextTime": next_time,
            "nextColor": next_color,
            "instructor": s.instructor_rel.name if s.instructor_rel else "",
        })
    return result


# ─── Schools ──────────────────────────────────────────────────────────────────

@app.get("/api/schools")
def get_schools(db: OrmSession = Depends(get_db)):
    schools = db.query(School).all()
    if not schools:
        # Auto-populate main surf school if empty
        s1 = School(name="Aquatic Indica Surf School", owner="Aquatic Admin",
                    email="rpntechworld@gmail.com", phone="+91 9876543210",
                    country="India", city="Kovalam / Chennai",
                    instructor_count="0", website="https://aquaticindica.com")
        db.add(s1)
        db.commit()
        schools = db.query(School).all()
    return [
        {
            "id": s.id, "name": s.name, "owner": s.owner,
            "email": s.email, "phone": s.phone,
            "country": s.country, "city": s.city,
            "instructor_count": s.instructor_count, "website": s.website,
        }
        for s in schools
    ]


@app.post("/api/schools")
def create_school(data: SchoolCreate, db: OrmSession = Depends(get_db)):
    school = School(
        name=data.name, owner=data.owner, email=data.email,
        phone=data.phone, country=data.country, city=data.city,
        instructor_count=data.instructor_count, website=data.website,
    )
    db.add(school)
    db.commit()
    db.refresh(school)
    return {"id": school.id, "message": f"School '{data.name}' registered successfully!"}


@app.delete("/api/schools/{school_id}")
def delete_school(school_id: int, db: OrmSession = Depends(get_db)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    name = school.name
    db.delete(school)
    db.commit()
    return {"message": f"School '{name}' deleted successfully"}


# ─── Landing Stats / Features ─────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(db: OrmSession = Depends(get_db)):
    school_count = db.query(School).count()
    student_count = db.query(Student).count()
    return [
        {"value": f"{max(500, school_count)}+", "label": "SURF SCHOOLS"},
        {"value": f"{max(12000, student_count * 100):,}+", "label": "ATHLETES"},
        {"value": "98%", "label": "SATISFACTION RATE"},
        {"value": "45", "label": "COUNTRIES"},
    ]


@app.get("/api/features")
def get_features():
    return [
        {"icon": "camera", "title": "AI Video Analysis",
         "description": "Break down every turn with frame-by-frame posture and wave positioning analysis."},
        {"icon": "activity", "title": "Session Tracking",
         "description": "Log every wave. Track speed, duration, and performance metrics in real-time."},
        {"icon": "award", "title": "Badge System",
         "description": "Gamify progress. Award students with dynamic badges as they level up skills."},
        {"icon": "users", "title": "Competition Hub",
         "description": "Organize, judge, and live-stream local competitions with pro-grade tools."},
    ]


@app.get("/api/competitions/data")
def get_competitions_data(db: OrmSession = Depends(get_db)):
    from sqlalchemy import text
    
    # 1. Fetch all competition events from database
    upcoming_events = []
    try:
        events = db.execute(text("""
            SELECT id, name, location, start_date, status 
            FROM events 
            ORDER BY id DESC 
            LIMIT 10
        """)).fetchall()

        for ev in events:
            ev_status = ev[4] or "Scheduled"
            upcoming_events.append({
                "id": ev[0],
                "name": ev[1],
                "locationDate": f"{ev[2] or 'Covelong Beach'} • {ev[3] or '2026'}",
                "status": ev_status,
                "badges": [
                    {"text": ev_status, "color": "#F59E0B" if ev_status != "Finished" else "#64748B"},
                    {"text": "Surfing", "color": "#3B82F6"}
                ]
            })
    except Exception as e:
        print(f"Error fetching upcoming events: {e}")

    # 2. Fetch live or latest event and heat competitors
    live_event_name = ""
    live_event_location = ""
    live_heat_name = ""
    heat_competitors = []
    has_live_event = False
    try:
        # Get event that is currently Ongoing or Live, or fallback to the latest active/created event
        live_ev = db.execute(text("""
            SELECT id, name, location 
            FROM events 
            WHERE status IN ('Ongoing', 'Live', 'ongoing', 'live', 'Active', 'Active - Live', 'Heat Drawn', 'Register Form Opening') 
            ORDER BY id DESC
            LIMIT 1
        """)).fetchone()
        
        if not live_ev:
            live_ev = db.execute(text("""
                SELECT id, name, location 
                FROM events 
                ORDER BY id DESC 
                LIMIT 1
            """)).fetchone()
        
        if live_ev:
            has_live_event = True
            live_event_name = live_ev[1]
            live_event_location = live_ev[2] or "Unknown Location"
            
            # Find active heat
            heat = db.execute(text("""
                SELECT id, round, heat_number 
                FROM heats 
                WHERE event_id = :event_id AND status IN ('Ongoing', 'Live', 'ongoing', 'live', 'running', 'in-progress', 'Heat Drawn') 
                LIMIT 1
            """), {"event_id": live_ev[0]}).fetchone()
            
            # Fallback to first heat
            if not heat:
                heat = db.execute(text("""
                    SELECT id, round, heat_number 
                    FROM heats 
                    WHERE event_id = :event_id 
                    ORDER BY heat_number ASC 
                    LIMIT 1
                """), {"event_id": live_ev[0]}).fetchone()
                
            if heat:
                live_heat_name = f"Round: {heat[1] or 'Round 1'}, Heat: {heat[2] or '1'}"
                heat_id = heat[0]
                
                surfer_rows = db.execute(text("""
                    SELECT s.name, hs.rank, hs.seed 
                    FROM heat_surfers hs 
                    JOIN surfers s ON hs.surfer_id = s.id 
                    WHERE hs.heat_id = :heat_id
                    ORDER BY hs.rank ASC
                """), {"heat_id": heat_id}).fetchall()
                
                for idx, row in enumerate(surfer_rows):
                    rank_num = row[1]
                    rank_suffix = (
                        f"{rank_num}st" if rank_num == 1 else 
                        f"{rank_num}nd" if rank_num == 2 else 
                        f"{rank_num}rd" if rank_num == 3 else 
                        f"{rank_num}th" if rank_num else "—"
                    )
                    heat_competitors.append({
                        "name": row[0],
                        "rank": rank_suffix,
                        "seed": str(row[2] or ""),
                        "highlight": idx == 0
                    })
    except Exception as e:
        print(f"Error fetching live event/heat: {e}")

    # 3. Past results (completed events)
    past_results = []
    try:
        completed_events = db.execute(text("""
            SELECT id, name, location FROM events 
            WHERE status IN ('Finished', 'Finished - Result Published', 'completed') 
            ORDER BY start_date DESC 
            LIMIT 5
        """)).fetchall()

        for ev in completed_events:
            # Query top score from this event
            top_score_row = db.execute(text("""
                SELECT s.score 
                FROM scores s 
                JOIN heats h ON s.heat_id = h.id 
                WHERE h.event_id = :event_id 
                ORDER BY s.score DESC 
                LIMIT 1
            """), {"event_id": ev[0]}).fetchone()
            score_val = f"{top_score_row[0]:.2f}" if top_score_row and top_score_row[0] else "—"
            
            # Query winner name
            winner_row = db.execute(text("""
                SELECT surf.name 
                FROM scores s 
                JOIN heats h ON s.heat_id = h.id 
                JOIN surfers surf ON s.surfer_id = surf.id 
                WHERE h.event_id = :event_id 
                ORDER BY s.score DESC 
                LIMIT 1
            """), {"event_id": ev[0]}).fetchone()
            placement = f"Winner: {winner_row[0]}" if winner_row else "Completed"
            
            past_results.append({
                "event": ev[1],
                "placement": placement,
                "score": score_val,
                "highlightPlace": True
            })
    except Exception as e:
        print(f"Error fetching completed events: {e}")

    if not past_results:
        past_results = [
            {"event": "Quiksilver Young Guns", "placement": "1st", "score": "16.42", "highlightPlace": True},
            {"event": "Trestles Junior Open", "placement": "3rd", "score": "14.10", "highlightPlace": False},
            {"event": "Rip Curl GromSearch", "placement": "SF", "score": "12.50", "highlightPlace": False}
        ]

    return {
        "hasLiveEvent": has_live_event,
        "liveEventName": live_event_name,
        "liveEventLocation": live_event_location,
        "liveHeatName": live_heat_name,
        "upcomingEvents": upcoming_events,
        "heatCompetitors": heat_competitors,
        "pastResults": past_results
    }


# ─── Super Admin Endpoints ───────────────────────────────────────────────────

class PasswordResetRequest(BaseModel):
    user_id: int
    new_password: str

@app.get("/api/superadmin/instructors")
def get_superadmin_instructors(db: OrmSession = Depends(get_db)):
    result = []
    coaches = db.query(User).filter(User.role == "coach").all()
    for u in coaches:
        inst = u.instructor
        name = inst.name if inst else "Unnamed Coach"
        result.append({
            "user_id": u.id,
            "instructor_id": inst.id if inst else None,
            "name": name,
            "email": u.email,
            "password_hash": u.password_hash or "—",
            "password_plain": u.password_plain or "—"
        })
    return result

@app.post("/api/superadmin/reset-password")
def superadmin_reset_password(data: PasswordResetRequest, db: OrmSession = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(data.new_password)
    user.password_plain = data.new_password
    db.commit()
    return {"message": "Password updated successfully"}


# ─── New Admin Panel Endpoints ────────────────────────────────────────────────

@app.get("/api/superadmin/marketplace")
def get_marketplace(db: OrmSession = Depends(get_db)):
    return db.query(MarketplaceItem).order_by(MarketplaceItem.id.desc()).all()


@app.post("/api/superadmin/marketplace")
def create_marketplace_item(data: MarketplaceItemCreate, db: OrmSession = Depends(get_db)):
    item = MarketplaceItem(
        title=data.title,
        price=data.price,
        category=data.category,
        description=data.description,
        status="Active"
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/superadmin/marketplace/{id}")
def delete_marketplace_item(id: int, db: OrmSession = Depends(get_db)):
    item = db.query(MarketplaceItem).filter(MarketplaceItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@app.get("/api/superadmin/reports")
def get_reports(db: OrmSession = Depends(get_db)):
    return db.query(UserReport).order_by(UserReport.id.desc()).all()


@app.post("/api/superadmin/reports/{id}")
def update_report_status(id: int, data: UserReportUpdate, db: OrmSession = Depends(get_db)):
    report = db.query(UserReport).filter(UserReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = data.status
    db.commit()
    db.refresh(report)
    return report


@app.delete("/api/superadmin/reports/{id}")
def delete_report(id: int, db: OrmSession = Depends(get_db)):
    report = db.query(UserReport).filter(UserReport.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}


@app.get("/api/superadmin/ai-monitoring")
def get_ai_monitoring(db: OrmSession = Depends(get_db)):
    logs = db.query(AIUsage).order_by(AIUsage.id.desc()).all()
    # Summarize stats
    total_calls = len(logs)
    total_tokens = sum(l.tokens_used for l in logs)
    avg_latency = sum(l.latency_ms for l in logs) / total_calls if total_calls > 0 else 0
    return {
        "logs": logs,
        "summary": {
            "total_calls": total_calls,
            "total_tokens": total_tokens,
            "avg_latency_ms": round(avg_latency, 1)
        }
    }


@app.get("/api/superadmin/keys")
def get_keys(db: OrmSession = Depends(get_db)):
    return db.query(IntegrationKey).order_by(IntegrationKey.id.desc()).all()


@app.post("/api/superadmin/keys")
def create_key(data: IntegrationKeyCreate, db: OrmSession = Depends(get_db)):
    # Generate client id & key
    import random, string
    suffix = "".join(random.choices(string.digits, k=4))
    client_id = f"client_{data.app_name.lower().replace(' ', '_')[:10]}_{suffix}"
    secret_part = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
    api_key = f"sk_{data.app_name.lower().replace(' ', '_')[:4]}_{secret_part}"
    
    new_key = IntegrationKey(
        app_name=data.app_name,
        client_id=client_id,
        api_key=api_key,
        webhook_url=data.webhook_url,
        status="Active"
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    return new_key


@app.post("/api/superadmin/keys/{id}/toggle")
def toggle_key(id: int, db: OrmSession = Depends(get_db)):
    k = db.query(IntegrationKey).filter(IntegrationKey.id == id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")
    k.status = "Inactive" if k.status == "Active" else "Active"
    db.commit()
    db.refresh(k)
    return k


@app.delete("/api/superadmin/keys/{id}")
def delete_key(id: int, db: OrmSession = Depends(get_db)):
    k = db.query(IntegrationKey).filter(IntegrationKey.id == id).first()
    if not k:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(k)
    db.commit()
    return {"message": "Key deleted successfully"}


@app.delete("/api/superadmin/users/{user_id}")
def delete_user_by_id(user_id: int, db: OrmSession = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if u:
        if u.email:
            inst = db.query(Instructor).filter(func.lower(Instructor.email) == u.email.lower()).first()
            if inst:
                db.query(SurfSession).filter(SurfSession.instructor_id == inst.id).delete()
                db.delete(inst)
            stud = db.query(Student).filter(func.lower(Student.email) == u.email.lower()).first()
            if stud:
                db.query(SurfSession).filter(SurfSession.student_id == stud.id).delete()
                db.delete(stud)
        db.delete(u)
        db.commit()
        return {"message": "User deleted successfully"}
    
    inst = db.query(Instructor).filter(Instructor.id == user_id).first()
    if inst:
        db.query(SurfSession).filter(SurfSession.instructor_id == inst.id).delete()
        db.delete(inst)
        db.commit()
        return {"message": "Instructor deleted successfully"}
        
    return {"message": "User deleted successfully"}


