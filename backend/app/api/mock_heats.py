from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.db.models import MockHeat, MockWave, AthleteProfile, Surfer

router = APIRouter(prefix="/api/heats/mock", tags=["Live Heats & Mock Heats Engine"])

# ── Schemas ──────────────────────────────────────────────────────────────────

class StartMockHeatSchema(BaseModel):
    coach_user_id: str
    athlete_user_id: str
    division: Optional[str] = "Open Men"
    duration_minutes: Optional[int] = 20

class LogMockWaveSchema(BaseModel):
    mock_heat_id: str
    wave_number: int
    score: float # 1.0 to 10.0 scale
    priority_level: Optional[int] = 1
    notes: Optional[str] = None

# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/start")
def start_mock_heat(req: StartMockHeatSchema, db: Session = Depends(get_db)):
    mock_heat = MockHeat(
        coach_user_id=req.coach_user_id,
        athlete_user_id=req.athlete_user_id,
        division=req.division,
        duration_minutes=req.duration_minutes,
        status="IN_PROGRESS"
    )
    db.add(mock_heat)
    db.commit()
    db.refresh(mock_heat)
    return {"message": "Mock heat started", "mock_heat": mock_heat}

@router.post("/log-wave")
def log_mock_wave(req: LogMockWaveSchema, db: Session = Depends(get_db)):
    if req.score < 0.0 or req.score > 10.0:
        raise HTTPException(status_code=400, detail="Wave score must be between 0.0 and 10.0.")

    wave = MockWave(**req.dict())
    db.add(wave)
    db.commit()

    # Recalculate top 2 wave total for heat score
    mock_heat = db.query(MockHeat).filter(MockHeat.id == req.mock_heat_id).first()
    if mock_heat:
        waves = db.query(MockWave).filter(MockWave.mock_heat_id == req.mock_heat_id).all()
        scores = sorted([float(w.score) for w in waves], reverse=True)
        top_2_total = sum(scores[:2])
        mock_heat.total_score = top_2_total

    db.commit()
    db.refresh(wave)
    return {"message": "Wave logged successfully", "wave": wave, "heat_total_score": mock_heat.total_score if mock_heat else req.score}

@router.post("/{mock_heat_id}/complete")
def complete_mock_heat(mock_heat_id: str, db: Session = Depends(get_db)):
    mock_heat = db.query(MockHeat).filter(MockHeat.id == mock_heat_id).first()
    if not mock_heat:
        raise HTTPException(status_code=404, detail="Mock heat not found.")

    mock_heat.status = "COMPLETED"

    # Automated Sync to Athlete Profile stats history
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == mock_heat.athlete_user_id).first()
    if profile:
        stats = profile.stats_json or {}
        mock_heats_history = stats.get("mock_heats_history", [])
        mock_heats_history.append({
            "mock_heat_id": mock_heat.id,
            "total_score": float(mock_heat.total_score),
            "completed_at": datetime.utcnow().isoformat()
        })
        stats["mock_heats_history"] = mock_heats_history
        stats["last_heat_score"] = float(mock_heat.total_score)
        profile.stats_json = stats

    db.commit()
    db.refresh(mock_heat)
    return {"message": "Mock heat completed and synced to Athlete Profile history", "mock_heat": mock_heat}

@router.get("/{mock_heat_id}/summary")
def get_mock_heat_summary(mock_heat_id: str, db: Session = Depends(get_db)):
    mock_heat = db.query(MockHeat).filter(MockHeat.id == mock_heat_id).first()
    if not mock_heat:
        raise HTTPException(status_code=404, detail="Mock heat not found.")

    waves = db.query(MockWave).filter(MockWave.mock_heat_id == mock_heat_id).order_by(MockWave.wave_number.asc()).all()
    return {
        "mock_heat": mock_heat,
        "waves": waves,
        "wave_count": len(waves),
        "total_score": float(mock_heat.total_score)
    }
