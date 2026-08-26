import jwt
import secrets
import string
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from app.config.settings import settings

LEGACY_ACCESS_SECRET = "attendly-super-secret-access-key-minimum-32-chars"
LEGACY_REFRESH_SECRET = "attendly-super-secret-refresh-key-minimum-32-chars"


def hash_password(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_invite_code(length: int = 8) -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(length))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str, token_type: str = "access") -> Optional[dict]:
    primary_secret = settings.JWT_SECRET if token_type == "access" else settings.JWT_REFRESH_SECRET
    
    # 1. Try decoding with the primary active secret
    try:
        payload = jwt.decode(token, primary_secret, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") == token_type:
            return payload
    except jwt.PyJWTError:
        pass

    # 2. Seamless fallback: Try decoding with legacy secret to ensure zero session disruption
    legacy_secret = LEGACY_ACCESS_SECRET if token_type == "access" else LEGACY_REFRESH_SECRET
    try:
        payload = jwt.decode(token, legacy_secret, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") == token_type:
            return payload
    except jwt.PyJWTError:
        pass

    return None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
