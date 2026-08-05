# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, UploadFile, File
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
    DateTime, Date, ForeignKey, func
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session as OrmSession

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aisurf.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

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
        
        # Create connection URI without static password
        connection_uri = f"postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}"
        engine = create_engine(connection_uri, connect_args={"sslmode": "require"})
        
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
    else:
        engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    role = Column(String, nullable=False)  # "athlete", "coach", "admin"
    auth_provider = Column(String, default="email")  # "email", "google", "apple"
    social_id = Column(String, nullable=True)
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
    age = Column(Integer, nullable=True)
    division = Column(String, nullable=True)
    stance = Column(String, nullable=True) # "regular" / "goofy"
    surf_stats = Column(Text, nullable=True) # JSON
    performance_logs = Column(Text, nullable=True) # JSON

    user_rel = relationship("User", back_populates="student")
    instructor_rel = relationship("Instructor", back_populates="students")
    sessions = relationship("SurfSession", back_populates="student_rel")
    badges = relationship("Badge", back_populates="student_rel")

    nutrition_logs = relationship("NutritionLog", back_populates="student_rel")
    sc_logs = relationship("SCLog", back_populates="student_rel")
    technical_logs = relationship("TechnicalLog", back_populates="student_rel")
    mental_logs = relationship("MentalLog", back_populates="student_rel")


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


from sqlalchemy import Float

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


# ─── Create tables ────────────────────────────────────────────────────────────
from sqlalchemy import inspect
inspector = inspect(engine)
if "nutrition_logs" not in inspector.get_table_names():
    Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# ─── Security Utilities ───────────────────────────────────────────────────────
import hmac
import hashlib
import base64
import json
import time

SECRET_KEY = "supersecretkeyforaisurf"

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

def seed_database(db: OrmSession):
    if db.query(User).count() > 0:
        return  # already seeded

    # Seed Admin User
    admin_user = User(
        email="admin@aisurf.com",
        password_hash=hash_password("admin123"),
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
        u = User(email=email, password_hash=hash_password(password), role="coach", auth_provider="email")
        db.add(u)
        db.flush()
        inst = Instructor(
            id=id_val, user_id=u.id, name=name, age=age, gender=gender,
            fitness_level=fit, experience=exp, certifications=json.dumps(certs),
            image=img, bio=bio, specializations=json.dumps(specs),
            rates=rate, location=loc, reviews=json.dumps([])
        )
        db.add(inst)
    db.flush()

    # Students (Athletes)
    student_users_data = [
        ("Chloe Kim", "chloe@aisurf.com", "chloe123", "Intermediate", 5, "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100", "Olympic gold medalist snowboarder finding my wave rhythm.", 23, "Women's Open", "regular", {"waves_ridden": 42, "max_speed": "24 mph", "avg_session_mins": 75}, ["Pipeline clean swell - pop-up speed fast.", "Waikiki session - balanced weight distribution."]),
        ("John Miller", "john@aisurf.com", "john123", "Beginner", 2, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "Stoked to learn and charge big waves.", 19, "Juniors", "goofy", {"waves_ridden": 18, "max_speed": "16 mph", "avg_session_mins": 60}, []),
        ("Emma Watson", "emma@aisurf.com", "emma123", "Intermediate", 1, "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100", "Surfing is my peace from screen acting.", 25, "Women's Amateur", "regular", {"waves_ridden": 31, "max_speed": "18 mph", "avg_session_mins": 90}, ["Intro to duck diving success."]),
        ("Rick Grimes", "rick@aisurf.com", "rick123", "Advanced", 4, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100", "Looking to refine my rail-to-rail transitions.", 35, "Men's Open", "regular", {"waves_ridden": 55, "max_speed": "22 mph", "avg_session_mins": 80}, []),
        ("Sarah Connor", "sarah@aisurf.com", "sarah123", "Beginner", 3, "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100", "Getting surf-fit and mastering the basics.", 29, "Women's Amateur", "regular", {"waves_ridden": 12, "max_speed": "12 mph", "avg_session_mins": 60}, []),
        ("James Bond", "james@aisurf.com", "james123", "Master", 5, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100", "Secret mission on the high seas.", 38, "Men's Open", "regular", {"waves_ridden": 112, "max_speed": "31 mph", "avg_session_mins": 100}, [])
    ]

    for id_val, (name, email, password, level, inst_id, img, bio, age, div, stance, stats, logs) in enumerate(student_users_data, 1):
        u = User(email=email, password_hash=hash_password(password), role="athlete", auth_provider="email")
        db.add(u)
        db.flush()
        stud = Student(
            id=id_val, user_id=u.id, name=name, email=email, level=level,
            instructor_id=inst_id, image=img, last_active="Today",
            bio=bio, age=age, division=div, stance=stance,
            surf_stats=json.dumps(stats), performance_logs=json.dumps(logs)
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

    # One demo school
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


# Run seed and database patches at startup
with SessionLocal() as _db:
    seed_database(_db)
    
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


from fastapi import Depends

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class InstructorCreate(BaseModel):
    name: str
    age: int
    gender: str
    fitness_level: str
    experience: str
    certifications: List[str] = []
    image: Optional[str] = ""


class StudentCreate(BaseModel):
    name: str
    email: str
    level: str
    instructor_id: Optional[int] = None
    image: Optional[str] = ""
    last_active: Optional[str] = "Today"


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
    # Athlete fields
    stance: Optional[str] = "regular"
    age: Optional[int] = None
    division: Optional[str] = ""
    # Coach fields
    specializations: Optional[List[str]] = []
    rates: Optional[str] = ""
    location: Optional[str] = ""


class UserLogin(BaseModel):
    email: str
    password: str


class SSOLogin(BaseModel):
    provider: str # "google" or "apple"
    social_id: str
    email: str
    name: str
    role: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    bio: Optional[str] = None
    stance: Optional[str] = None
    age: Optional[int] = None
    division: Optional[str] = None
    surf_stats: Optional[dict] = None
    performance_logs: Optional[List[str]] = None


class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    fitness_level: Optional[str] = None
    specializations: Optional[List[str]] = None
    rates: Optional[str] = None
    location: Optional[str] = None
    certifications: Optional[List[str]] = None


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


# ─── Helper ───────────────────────────────────────────────────────────────────

def instructor_to_dict(i: Instructor):
    return {
        "id": i.id,
        "name": i.name,
        "age": i.age,
        "gender": i.gender,
        "fitness_level": i.fitness_level,
        "experience": i.experience,
        "certifications": json.loads(i.certifications) if i.certifications else [],
        "image": i.image or "",
        "bio": i.bio or "",
        "specializations": json.loads(i.specializations) if i.specializations else [],
        "rates": i.rates or "",
        "location": i.location or "",
        "reviews": json.loads(i.reviews) if i.reviews else [],
        "user_id": i.user_id,
    }


def student_to_dict(s: Student):
    return {
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "level": s.level,
        "instructor_id": s.instructor_id,
        "instructor": s.instructor_rel.name if s.instructor_rel else "",
        "image": s.image or "",
        "last_active": s.last_active or "",
        "bio": s.bio or "",
        "age": s.age,
        "division": s.division or "",
        "stance": s.stance or "regular",
        "surf_stats": json.loads(s.surf_stats) if s.surf_stats else {},
        "performance_logs": json.loads(s.performance_logs) if s.performance_logs else [],
        "user_id": s.user_id,
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


def make_user_response(user: User):
    res = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "auth_provider": user.auth_provider,
    }
    if user.student:
        res["student_id"] = user.student.id
        res["name"] = user.student.name
        res["image"] = user.student.image
    elif user.instructor:
        res["instructor_id"] = user.instructor.id
        res["name"] = user.instructor.name
        res["image"] = user.instructor.image
    else:
        res["name"] = "System Admin"
        res["image"] = ""
    return res


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@app.post("/api/auth/signup")
def auth_signup(data: UserSignup, db: OrmSession = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    role = data.role.lower()
    if role not in ["athlete", "coach", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=role,
        auth_provider="email"
    )
    db.add(user)
    db.flush()

    if role == "athlete":
        student = Student(
            user_id=user.id,
            name=data.name,
            email=data.email.lower(),
            level="Beginner",
            bio="",
            age=data.age,
            division=data.division,
            stance=data.stance,
            surf_stats=json.dumps({"waves_ridden": 0, "max_speed": "0 mph", "avg_session_mins": 0}),
            performance_logs=json.dumps([]),
            image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
            last_active="Today"
        )
        db.add(student)
        db.add(ActivityLog(text=f"{data.name} signed up as a new Athlete", type="group"))
    elif role == "coach":
        instructor = Instructor(
            user_id=user.id,
            name=data.name,
            age=30,
            gender="Male",
            fitness_level="Advanced",
            experience="1 Year",
            certifications=json.dumps([]),
            image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
            bio="",
            specializations=json.dumps(data.specializations or []),
            rates=data.rates or "$50 / hr",
            location=data.location or "",
            reviews=json.dumps([])
        )
        db.add(instructor)
        db.add(ActivityLog(text=f"New Coach {data.name} registered on the platform", type="group"))

    db.commit()
    db.refresh(user)

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "token": token,
        "user": make_user_response(user)
    }


@app.post("/api/auth/login")
def auth_login(data: UserLogin, db: OrmSession = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = generate_token({"user_id": user.id, "email": user.email, "role": user.role})
    return {
        "token": token,
        "user": make_user_response(user)
    }


@app.post("/api/auth/sso")
def auth_sso(data: SSOLogin, db: OrmSession = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == data.email.lower()) | 
        ((User.auth_provider == data.provider) & (User.social_id == data.social_id))
    ).first()

    if not user:
        if not data.role:
            return {
                "needs_role": True,
                "email": data.email,
                "name": data.name,
                "social_id": data.social_id,
                "provider": data.provider
            }
        
        role = data.role.lower()
        if role not in ["athlete", "coach", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role specified")

        user = User(
            email=data.email.lower(),
            role=role,
            auth_provider=data.provider,
            social_id=data.social_id
        )
        db.add(user)
        db.flush()

        if role == "athlete":
            student = Student(
                user_id=user.id,
                name=data.name,
                email=data.email.lower(),
                level="Beginner",
                bio="SSO Athlete profile",
                age=21,
                division="Men's Open",
                stance="regular",
                surf_stats=json.dumps({"waves_ridden": 0, "max_speed": "0 mph", "avg_session_mins": 0}),
                performance_logs=json.dumps([]),
                image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
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
                image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
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
    if data.age is not None:
        student.age = data.age
    if data.division is not None:
        student.division = data.division
    if data.surf_stats is not None:
        student.surf_stats = json.dumps(data.surf_stats)
    if data.performance_logs is not None:
        student.performance_logs = json.dumps(data.performance_logs)

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


@app.post("/api/upload-video")
def upload_video(file: UploadFile = File(...)):
    # Ensure we save it with a safe filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    if S3_BUCKET_NAME:
        try:
            file.file.seek(0)
            s3_client.upload_fileobj(
                file.file,
                S3_BUCKET_NAME,
                unique_filename,
                ExtraArgs={
                    "ContentType": file.content_type or "video/mp4"
                }
            )
            video_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
            return {"video_url": video_url}
        except Exception as e:
            # Log the error and fail securely
            print(f"S3 upload error: {e}")
            raise HTTPException(status_code=500, detail=f"AWS S3 upload failed: {str(e)}")
            
    # Fallback to local storage if S3 is not configured
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
        
    return {"video_url": f"http://localhost:8000/uploads/{unique_filename}"}


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
    instructor = Instructor(
        name=data.name, age=data.age, gender=data.gender,
        fitness_level=data.fitness_level, experience=data.experience,
        certifications=json.dumps(data.certifications),
        image=data.image or "",
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
    db.delete(i)
    db.commit()
    return {"message": "Deleted"}


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
    student = Student(
        name=data.name, email=data.email, level=data.level,
        instructor_id=data.instructor_id,
        image=data.image or "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
        last_active="Today",
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    db.add(ActivityLog(text=f"{data.name} joined as a new student", type="group"))
    db.commit()
    return student_to_dict(student)


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: OrmSession = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(s)
    db.commit()
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
