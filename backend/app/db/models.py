from sqlalchemy import Column, String, Integer, Float, Numeric, Boolean, DateTime, Date, ForeignKey, JSON, BigInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db.database import Base

def generate_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_id)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    school_name = Column(String, nullable=True)
    admin_id = Column(String, unique=True, nullable=True)
    user_type = Column(String, nullable=False, default="athlete") # athlete, coach, admin, school_admin
    conduct_events = Column(Boolean, default=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    surfers = relationship("Surfer", back_populates="user")
    videos = relationship("Video", back_populates="uploaded_by_user")
    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False)
    coach_profile = relationship("CoachProfile", back_populates="user", uselist=False)


class Surfer(Base):
    __tablename__ = "surfers"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    school_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    state = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    manual_seed_points = Column(Numeric(10, 2), default=0.00)
    is_active = Column(Boolean, default=True)
    admin_id = Column(String, default="admin")
    sup_categories = Column(String, nullable=True)
    divisions = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="surfers")
    videos = relationship("Video", back_populates="surfer")
    analysis_results = relationship("AIAnalysisResult", back_populates="surfer")


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    bio = Column(Text, nullable=True)
    age = Column(Integer, nullable=True)
    division = Column(String, nullable=True)
    stance = Column(String, default="regular") # regular, goofy
    board_specs = Column(String, nullable=True)
    home_break = Column(String, nullable=True)
    stats_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="athlete_profile")


class CoachProfile(Base):
    __tablename__ = "coach_profiles"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    bio = Column(Text, nullable=True)
    experience_years = Column(Integer, default=0)
    certifications = Column(JSON, default=list) # ISA Level 2, CPR, etc.
    specializations = Column(JSON, default=list) # S&C, Nutrition, Video Analysis
    hourly_rate = Column(Numeric(10, 2), default=0.00)
    location_region = Column(String, nullable=True)
    languages = Column(JSON, default=list)
    rating_avg = Column(Numeric(3, 2), default=5.00)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="coach_profile")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=generate_id)
    surfer_id = Column(String, ForeignKey("surfers.id", ondelete="CASCADE"), nullable=True)
    uploaded_by_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    s3_bucket = Column(String, nullable=False)
    s3_key = Column(String, nullable=False)
    file_name = Column(String, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    video_url = Column(String, nullable=True)
    status = Column(String, default="UPLOADED")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    surfer = relationship("Surfer", back_populates="videos")
    uploaded_by_user = relationship("User", back_populates="videos")
    analysis_results = relationship("AIAnalysisResult", back_populates="video")
    processing_jobs = relationship("AIProcessingJob", back_populates="video")


class AIProcessingJob(Base):
    __tablename__ = "ai_processing_jobs"

    id = Column(String, primary_key=True, default=generate_id)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING")
    error_message = Column(String, nullable=True)
    progress_percent = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    video = relationship("Video", back_populates="processing_jobs")


class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"

    id = Column(String, primary_key=True, default=generate_id)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    surfer_id = Column(String, ForeignKey("surfers.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Numeric(5, 2), nullable=False)
    posture_score = Column(Numeric(5, 2), nullable=True)
    wave_positioning_score = Column(Numeric(5, 2), nullable=True)
    speed_kmh = Column(Numeric(5, 2), nullable=True)
    keyframes_json = Column(JSON, default=dict)
    recommendations_json = Column(JSON, default=list)
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="analysis_results")
    surfer = relationship("Surfer", back_populates="analysis_results")


# ── ATHLETE INTELLIGENCE LOGGING MODELS ─────────────────────────────────────

class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    calories = Column(Integer, nullable=True)
    hydration_liters = Column(Numeric(4, 2), nullable=True)
    protein_g = Column(Integer, nullable=True)
    carbs_g = Column(Integer, nullable=True)
    fats_g = Column(Integer, nullable=True)
    competition_meal_timing = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SCWorkoutLog(Base):
    __tablename__ = "sc_workout_logs"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    workout_type = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    sleep_score = Column(Integer, nullable=True)
    mobility_score = Column(Integer, nullable=True)
    injury_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TechnicalTrainingLog(Base):
    __tablename__ = "technical_training_logs"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    wave_count = Column(Integer, default=0)
    board_setup = Column(String, nullable=True)
    fin_setup = Column(String, nullable=True)
    wave_type = Column(String, nullable=True)
    video_id = Column(String, ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    session_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MentalPerformanceLog(Base):
    __tablename__ = "mental_performance_logs"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    anxiety_score = Column(Integer, nullable=True)
    focus_level = Column(Integer, nullable=True)
    post_heat_reflection = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── COACH MARKETPLACE & REVIEWS MODELS ─────────────────────────────────────

class CoachReview(Base):
    __tablename__ = "coach_reviews"

    id = Column(String, primary_key=True, default=generate_id)
    coach_id = Column(String, ForeignKey("coach_profiles.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    review_text = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_id)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_text = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VideoFeedback(Base):
    __tablename__ = "video_feedbacks"

    id = Column(String, primary_key=True, default=generate_id)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    coach_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    timestamp_seconds = Column(Float, nullable=False)
    comment_text = Column(Text, nullable=False)
    voice_note_url = Column(String, nullable=True)
    drawing_annotations_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── MOCK HEATS ENGINE MODELS ────────────────────────────────────────────────

class MockHeat(Base):
    __tablename__ = "mock_heats"

    id = Column(String, primary_key=True, default=generate_id)
    coach_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    location = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=20)
    status = Column(String, default="SCHEDULED") # SCHEDULED, IN_PROGRESS, COMPLETED
    priority_user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MockWave(Base):
    __tablename__ = "mock_waves"

    id = Column(String, primary_key=True, default=generate_id)
    heat_id = Column(String, ForeignKey("mock_heats.id", ondelete="CASCADE"), nullable=False)
    athlete_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wave_number = Column(Integer, nullable=False)
    score = Column(Numeric(4, 2), nullable=False) # 0.00 to 10.00
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
