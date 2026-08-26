import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file in local development (checks project root and cwd)
load_dotenv(override=True)
_root_env = Path(__file__).resolve().parents[3] / ".env"
if _root_env.exists():
    load_dotenv(_root_env, override=True)
_backend_env = Path(__file__).resolve().parents[2] / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=True)

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET: str = os.getenv("JWT_ACCESS_SECRET", "")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 24 * 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@attendly.com")
    
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("SUPABASE_KEY", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    @property
    def EFFECTIVE_SUPABASE_URL(self) -> str:
        if self.SUPABASE_URL:
            return self.SUPABASE_URL
        if "supabase" in self.DATABASE_URL:
            import re
            match = re.search(r"@db\.([a-z0-9]+)\.supabase\.co", self.DATABASE_URL)
            if match:
                return f"https://{match.group(1)}.supabase.co"
            match_pooler = re.search(r"postgres\.([a-z0-9]+):", self.DATABASE_URL)
            if match_pooler:
                return f"https://{match_pooler.group(1)}.supabase.co"
        return ""

    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT") else 587
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
