from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.crypto import decode_token

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token, "access")
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return payload

def get_class_rep_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "class_rep":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden. Class representative role required."
        )
    return user
