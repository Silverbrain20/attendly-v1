import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
    JWT_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "attendly-super-secret-access-key")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "attendly-super-secret-refresh-key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 24 * 60 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7 # 7 days
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@attendly.com")
    
    # SMTP Config (Gmail / Custom SMTP)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # CORS Allowed Origins
    @property
    def ALLOWED_ORIGINS(self) -> list:
        raw = os.getenv("ALLOWED_ORIGINS", f"{self.FRONTEND_URL},http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000")
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

settings = Settings()


