from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.config.settings import settings
from app.utils.limiter import limiter
from app.routers import auth, courses, sessions, attendance, overrides, export


class RequestBodyLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_body_bytes: int = 1_048_576):  # 1MB
        super().__init__(app)
        self.max_body_bytes = max_body_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_body_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Payload too large. Maximum allowed request size is 1MB.",
            )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app = FastAPI(
    title="Attendly API",
    description="Backend API for Attendly - Geo-verified Attendance System",
    version="1.0.0",
    docs_url=None,   # disable Swagger UI in production
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Order matters: GZip outermost, then security, then body limit, then CORS
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestBodyLimitMiddleware, max_body_bytes=1_048_576)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(overrides.router)
app.include_router(export.router)


@app.get("/")
async def read_root():
    return {"name": "Attendly API", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "ok"}
