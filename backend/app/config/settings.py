import os
from pathlib import Path
from dotenv import load_dotenv

# Only load .env file in local development — on Render, env vars are set via dashboard
_env_path = Path(__file__).resolve().parents[2] / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 24 * 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@attendly.com")
    
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    @property
    def ALLOWED_ORIGINS(self) -> list:
        raw = os.getenv("ALLOWED_ORIGINS", f"{self.FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000")
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    def validate(self):
        missing = []
        if not self.DATABASE_URL:
            missing.append("DATABASE_URL")
        if not self.JWT_SECRET:
            missing.append("JWT_ACCESS_SECRET")
        if not self.JWT_REFRESH_SECRET:
            missing.append("JWT_REFRESH_SECRET")
            
        if missing:
            raise RuntimeError(f"CRITICAL SECURITY CONFIGURATION ERROR: Missing required environment variables: {', '.join(missing)}")

settings = Settings()
settings.validate()
