from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict


class StudentRegister(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    matric_number: str = Field(..., min_length=3, max_length=30)
    phone_number: str = Field(..., min_length=7, max_length=20)
    device_fingerprint: Optional[Dict] = None


class StudentLogin(BaseModel):
    matric_number: str = Field(..., max_length=30)
    password: str = Field(..., max_length=128)
    device_fingerprint: Dict


class VerifyEmail(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    otp: str = Field(..., min_length=6, max_length=8)


class ResendOtp(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    type: str = Field("email", max_length=20)


class VerifyDevice(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    otp: str = Field(..., min_length=6, max_length=8)
    device_fingerprint: Dict


class ForgotPassword(BaseModel):
    matric_number: str = Field(..., max_length=30)
    email: EmailStr = Field(..., max_length=254)


class ResetPassword(BaseModel):
    email: EmailStr = Field(..., max_length=254)
    otp: str = Field(..., min_length=6, max_length=8)
    new_password: str = Field(..., min_length=8, max_length=128)


class CourseCreate(BaseModel):
    course_code: str = Field(..., min_length=3, max_length=20)
    course_title: str = Field(..., min_length=3, max_length=150)


class SessionCreate(BaseModel):
    course_id: str = Field(..., max_length=50)
    latitude: float
    longitude: float
    geofence_radius_m: Optional[int] = Field(100, ge=10, le=5000)
    duration_minutes: int = Field(120, ge=15, le=720)


class AttendanceMark(BaseModel):
    session_id: str = Field(..., max_length=50)
    latitude: float
    longitude: float


class OverrideCreate(BaseModel):
    session_id: str = Field(..., max_length=50)
    student_id: str = Field(..., max_length=50)
    reason: str = Field(..., min_length=10, max_length=300)


class RedeemInvite(BaseModel):
    code: str = Field(..., min_length=4, max_length=20)


class UpdateProfile(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, min_length=7, max_length=20)
    email: Optional[EmailStr] = Field(None, max_length=254)
    current_password: Optional[str] = Field(None, max_length=128)
    new_password: Optional[str] = Field(None, min_length=8, max_length=128)
