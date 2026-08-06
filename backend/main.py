from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine, Base
from app.api.ai import router as ai_router
from app.api.auth import router as auth_router
from app.api.intelligence import router as intelligence_router
from app.api.marketplace import router as marketplace_router
from app.api.mock_heats import router as mock_heats_router
from app.api.admin_notifications import router as admin_notifications_router

# Initialize all SQLAlchemy database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Surf Coach Platform API",
    description="Comprehensive AI-powered surfing intelligence, coach discovery, mock heats, and analytics platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all 5 Feature API Routers
app.include_router(auth_router)
app.include_router(intelligence_router)
app.include_router(marketplace_router)
app.include_router(mock_heats_router)
app.include_router(admin_notifications_router)
app.include_router(ai_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AI Surf Coach Platform API",
        "database": "AWS RDS Aurora PostgreSQL",
        "version": "2.0.0",
        "status": "OPERATIONAL"
    }
