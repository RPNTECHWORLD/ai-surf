from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Surf Backend"}

@app.get("/api/stats")
def get_stats():
    return [
        {"value": "500+", "label": "SURF SCHOOLS"},
        {"value": "12,000+", "label": "ATHLETES"},
        {"value": "98%", "label": "SATISFACTION RATE"},
        {"value": "45", "label": "COUNTRIES"}
    ]

@app.get("/api/features")
def get_features():
    return [
        {
            "icon": "camera",
            "title": "AI Video Analysis",
            "description": "Break down every turn with frame-by-frame posture and wave positioning analysis."
        },
        {
            "icon": "activity",
            "title": "Session Tracking",
            "description": "Log every wave. Track speed, duration, and performance metrics in real-time."
        },
        {
            "icon": "award",
            "title": "Badge System",
            "description": "Gamify progress. Award students with dynamic badges as they level up skills."
        },
        {
            "icon": "users",
            "title": "Competition Hub",
            "description": "Organize, judge, and live-stream local competitions with pro-grade tools."
        }
    ]

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    return {
        "active_instructors": 12,
        "active_students": 87,
        "sessions_this_month": 34,
        "upcoming_sessions": 6
    }

@app.get("/api/dashboard/sessions")
def get_dashboard_sessions():
    return [
        {"time": "08:00 AM", "instructor": "Kai Lenny", "student": "John Miller", "status": "IN PROGRESS"},
        {"time": "09:30 AM", "instructor": "Bethany Hamilton", "student": "Emma Watson", "status": "UPCOMING"},
        {"time": "11:00 AM", "instructor": "Kolohe Andino", "student": "Rick Grimes", "status": "UPCOMING"},
        {"time": "02:00 PM", "instructor": "Carissa Moore", "student": "Sarah Connor", "status": "UPCOMING"}
    ]

@app.get("/api/dashboard/activity")
def get_dashboard_activity():
    return [
        {"id": 1, "text": "Emma Watson earned 'First Barrel' badge", "time": "2m ago", "type": "badge"},
        {"id": 2, "text": "John Miller completed session with Kai", "time": "15m ago", "type": "session"},
        {"id": 3, "text": "Rick Grimes joined 'Intermediate' cohort", "time": "1h ago", "type": "group"}
    ]

@app.get("/api/instructors")
def get_instructors():
    return [
        {
            "id": 1,
            "name": "Kai Lenny",
            "age": 30,
            "gender": "Male",
            "fitness_level": "Elite",
            "experience": "12 Years",
            "certifications": ["ISA Level 2", "CPR"],
            "image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100"
        },
        {
            "id": 2,
            "name": "Bethany Hamilton",
            "age": 34,
            "gender": "Female",
            "fitness_level": "Elite",
            "experience": "15 Years",
            "certifications": ["ISA Level 3", "First Aid"],
            "image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100"
        }
    ]
