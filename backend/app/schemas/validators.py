from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict
from datetime import datetime

# --- Auth Schemas ---
class StudentRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    matric_number: str = Field(..., min_length=3)
    phone_number: str = Field(..., min_length=7)
    device_fingerprint: Optional[Dict] = None

class StudentLogin(BaseModel):
    matric_number: str
    password: str
    device_fingerprint: Dict

class VerifyEmail(BaseModel):
    email: EmailStr
    otp: str

class VerifyDevice(BaseModel):
    email: EmailStr
    otp: str
    device_fingerprint: Dict

class ForgotPassword(BaseModel):
    matric_number: str
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(..., min_length=8)

# --- Course Schemas ---
class CourseCreate(BaseModel):
    course_code: str = Field(..., min_length=3, max_length=20)
    course_title: str = Field(..., min_length=3, max_length=150)

# --- Session Schemas ---
class SessionCreate(BaseModel):
    course_id: str
    latitude: float
    longitude: float
    geofence_radius_m: Optional[int] = 100
    duration_minutes: int = Field(120, ge=15, le=720) # Default 2 hours

# --- Attendance Schemas ---
class AttendanceMark(BaseModel):
    session_id: str
    latitude: float
    longitude: float

# --- Override Schemas ---
class OverrideCreate(BaseModel):
    session_id: str
    student_id: str
    reason: str = Field(..., min_length=10, max_length=300)

# --- Invite Code Schemas ---
class RedeemInvite(BaseModel):
    code: str
