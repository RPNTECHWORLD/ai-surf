import os
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt

from app.db.database import get_db
from app.db.models import User, AthleteProfile, CoachProfile, Surfer

router = APIRouter(prefix="/api/auth", tags=["User Management & Authentication"])

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "aquaticxsports_shared_jwt_secret_2026")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    user_type: str = "athlete" # athlete, coach, admin
    school_name: Optional[str] = None
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SSORequest(BaseModel):
    provider: str # google, apple
    id_token: str
    email: EmailStr
    full_name: str
    user_type: str = "athlete"

class AthleteProfileSchema(BaseModel):
    bio: Optional[str] = None
    age: Optional[int] = None
    division: Optional[str] = None
    stance: Optional[str] = "regular"
    board_specs: Optional[str] = None
    home_break: Optional[str] = None

class CoachProfileSchema(BaseModel):
    bio: Optional[str] = None
    experience_years: Optional[int] = 0
    certifications: Optional[list] = []
    specializations: Optional[list] = []
    hourly_rate: Optional[float] = 0.0
    location_region: Optional[str] = None
    languages: Optional[list] = []

# ── Helpers ──────────────────────────────────────────────────────────────────

import bcrypt

def hash_password(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == req.email.lower()).first()
        if existing:
            raise HTTPException(status_code=400, detail="User with this email already exists.")

        hashed_pw = hash_password(req.password)
        user = User(
            email=req.email.lower(),
            password_hash=hashed_pw,
            full_name=req.full_name,
            user_type=req.user_type.lower(),
            school_name=req.school_name,
            phone=req.phone
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Automatically create role-specific profiles
        if user.user_type == "athlete":
            athlete_profile = AthleteProfile(user_id=user.id)
            db.add(athlete_profile)
            # Create linked Surfer entry for competition sync
            surfer = Surfer(user_id=user.id, name=user.full_name, email=user.email, school_name=user.school_name)
            db.add(surfer)
        elif user.user_type == "coach":
            coach_profile = CoachProfile(user_id=user.id)
            db.add(coach_profile)

        db.commit()

        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.user_type})
        return {
            "message": "User registered successfully",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "user_type": user.user_type
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy import text
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    # Fallback check across shared database tables (school_admins & super_admins)
    if not user:
        school_admin = db.execute(
            text("SELECT id, email, password_hash, school_name FROM school_admins WHERE lower(email) = :email"),
            {"email": email_clean}
        ).fetchone()
        if school_admin and verify_password(req.password, school_admin.password_hash):
            user = User(
                email=email_clean,
                password_hash=school_admin.password_hash,
                full_name=school_admin.school_name,
                user_type="school_admin",
                school_name=school_admin.school_name
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if not user:
            super_admin = db.execute(
                text("SELECT id, email, password_hash FROM super_admins WHERE lower(email) = :email"),
                {"email": email_clean}
            ).fetchone()
            if super_admin and verify_password(req.password, super_admin.password_hash):
                user = User(
                    email=email_clean,
                    password_hash=super_admin.password_hash,
                    full_name="Super Admin",
                    user_type="admin"
                )
                db.add(user)
                db.commit()
                db.refresh(user)

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.user_type})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.user_type
        }
    }

@router.post("/sso")
def sso_login(req: SSORequest, db: Session = Depends(get_db)):
    # Verify SSO provider token (Simulated verification for Google/Apple)
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        user = User(
            email=req.email.lower(),
            password_hash=hash_password(f"sso_{req.provider}_{req.email}"),
            full_name=req.full_name,
            user_type=req.user_type.lower()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if user.user_type == "athlete":
            db.add(AthleteProfile(user_id=user.id))
            db.add(Surfer(user_id=user.id, name=user.full_name, email=user.email))
        elif user.user_type == "coach":
            db.add(CoachProfile(user_id=user.id))
        db.commit()

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.user_type})
    return {
        "message": f"Single Sign-On successful via {req.provider}",
        "access_token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.user_type
        }
    }

# ── Profile Endpoints ────────────────────────────────────────────────────────

@router.get("/profile/athlete/{user_id}")
def get_athlete_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return profile

@router.put("/profile/athlete/{user_id}")
def update_athlete_profile(user_id: str, req: AthleteProfileSchema, db: Session = Depends(get_db)):
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user_id).first()
    if not profile:
        profile = AthleteProfile(user_id=user_id)
        db.add(profile)

    for field, val in req.dict(exclude_unset=True).items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/profile/coach/{user_id}")
def get_coach_profile(user_id: str, db: Session = Depends(get_db)):
    profile = db.query(CoachProfile).filter(CoachProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Coach profile not found")
    return profile

@router.put("/profile/coach/{user_id}")
def update_coach_profile(user_id: str, req: CoachProfileSchema, db: Session = Depends(get_db)):
    profile = db.query(CoachProfile).filter(CoachProfile.user_id == user_id).first()
    if not profile:
        profile = CoachProfile(user_id=user_id)
        db.add(profile)

    for field, val in req.dict(exclude_unset=True).items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile
