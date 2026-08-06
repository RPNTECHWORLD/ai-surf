from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.db.models import CoachProfile, User, CoachReview, ChatMessage, VideoFeedback, Video

router = APIRouter(prefix="/api/marketplace", tags=["Coach Discovery & Marketplace Platform"])

# ── Schemas ──────────────────────────────────────────────────────────────────

class ReviewSubmitSchema(BaseModel):
    coach_user_id: str
    athlete_user_id: str
    rating: int # 1 to 5
    review_text: Optional[str] = None

class ChatMessageSchema(BaseModel):
    sender_user_id: str
    receiver_user_id: str
    message_text: Optional[str] = None
    media_url: Optional[str] = None

class VideoFeedbackSchema(BaseModel):
    video_id: str
    coach_user_id: str
    timestamp_frame: int
    feedback_text: str

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/coaches")
def search_coaches(
    region: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_rate: Optional[float] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CoachProfile, User).join(User, CoachProfile.user_id == User.id)

    if region:
        query = query.filter(CoachProfile.location_region.ilike(f"%{region}%"))
    if min_rating:
        query = query.filter(CoachProfile.rating_avg >= min_rating)
    if max_rate:
        query = query.filter(CoachProfile.hourly_rate <= max_rate)

    results = query.all()
    out = []
    for coach, user in results:
        out.append({
            "coach_id": coach.id,
            "user_id": user.id,
            "name": user.full_name,
            "bio": coach.bio,
            "experience_years": coach.experience_years,
            "certifications": coach.certifications,
            "specializations": coach.specializations,
            "hourly_rate": float(coach.hourly_rate or 0),
            "location_region": coach.location_region,
            "languages": coach.languages,
            "rating_avg": float(coach.rating_avg or 5.0),
            "review_count": coach.review_count
        })
    return out

@router.post("/reviews")
def submit_coach_review(req: ReviewSubmitSchema, db: Session = Depends(get_db)):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars.")

    review = CoachReview(**req.dict())
    db.add(review)

    # Recalculate coach average rating
    coach = db.query(CoachProfile).filter(CoachProfile.user_id == req.coach_user_id).first()
    if coach:
        reviews = db.query(CoachReview).filter(CoachReview.coach_user_id == req.coach_user_id, CoachReview.is_approved == True).all()
        total_rating = sum(r.rating for r in reviews) + req.rating
        coach.review_count = len(reviews) + 1
        coach.rating_avg = round(total_rating / coach.review_count, 2)

    db.commit()
    db.refresh(review)
    return {"message": "Review submitted successfully", "review": review}

@router.get("/coaches/{coach_user_id}/reviews")
def get_coach_reviews(coach_user_id: str, db: Session = Depends(get_db)):
    reviews = db.query(CoachReview).filter(
        CoachReview.coach_user_id == coach_user_id,
        CoachReview.is_approved == True
    ).all()
    return reviews

@router.post("/chat/messages")
def send_chat_message(req: ChatMessageSchema, db: Session = Depends(get_db)):
    msg = ChatMessage(**req.dict())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"message": "Message sent", "chat_message": msg}

@router.get("/chat/conversation/{user1_id}/{user2_id}")
def get_conversation(user1_id: str, user2_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(
        ((ChatMessage.sender_user_id == user1_id) & (ChatMessage.receiver_user_id == user2_id)) |
        ((ChatMessage.sender_user_id == user2_id) & (ChatMessage.receiver_user_id == user1_id))
    ).order_by(ChatMessage.created_at.asc()).all()
    return messages

@router.post("/video-feedback")
def add_video_feedback(req: VideoFeedbackSchema, db: Session = Depends(get_db)):
    feedback = VideoFeedback(**req.dict())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"message": "Timestamped video feedback added", "feedback": feedback}

@router.get("/video-feedback/{video_id}")
def get_video_feedback(video_id: str, db: Session = Depends(get_db)):
    feedback_list = db.query(VideoFeedback).filter(VideoFeedback.video_id == video_id).order_by(VideoFeedback.timestamp_frame.asc()).all()
    return feedback_list
