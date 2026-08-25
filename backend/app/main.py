from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.config.settings import settings
from app.utils.limiter import limiter
from app.routers import auth, courses, sessions, attendance, overrides, export

app = FastAPI(
    title="Attendly API",
    description="Backend API for Attendly - Geo-verified Attendance System",
    version="1.0.0"
)

# Rate Limiting configuration
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(overrides.router)
app.include_router(export.router)

@app.get("/")
def read_root():
    return {"name": "Attendly API", "status": "online"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
