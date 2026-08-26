from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from app.config.database import db
from app.schemas.validators import (
    StudentRegister, StudentLogin, VerifyEmail, VerifyDevice, ResendOtp,
    ForgotPassword, ResetPassword, UpdateProfile
)
from app.utils.crypto import (
    hash_password, verify_password, generate_otp, create_access_token,
    create_refresh_token, hash_token
)
from app.utils.email import (
    send_verification_email, send_reset_otp_email, send_device_verification_email
)
from app.utils.fingerprint import check_fingerprint_match
from app.utils.limiter import limiter
from app.middleware.auth import get_current_user
import json

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register")
@limiter.limit("5/15minutes")
def register(request: Request, data: StudentRegister):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT id FROM users WHERE email = %s OR matric_number = %s OR phone_number = %s",
            (data.email, data.matric_number, data.phone_number)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email, matric number, or phone number already registered")

        pwd_hash = hash_password(data.password)
        email_otp = generate_otp()
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)

        cursor.execute(
            """
            INSERT INTO users (email, password_hash, full_name, matric_number, phone_number,
                               device_fingerprint, email_verification_otp, email_verification_expires)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, role, is_email_verified
            """,
            (data.email, pwd_hash, data.full_name, data.matric_number, data.phone_number,
             json.dumps(data.device_fingerprint) if data.device_fingerprint else None,
             email_otp, otp_expiry)
        )
        new_user = cursor.fetchone()

    send_verification_email(data.email, data.full_name, email_otp)

    user_payload = {"user_id": new_user["id"], "role": new_user["role"], "token_version": 1}
    access_token = create_access_token(user_payload)
    refresh_token = create_refresh_token(user_payload)

    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "UPDATE users SET refresh_token_hash = %s WHERE id = %s",
            (hash_token(refresh_token), new_user["id"])
        )

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": new_user["id"],
            "email": data.email,
            "full_name": data.full_name,
            "matric_number": data.matric_number,
            "phone_number": data.phone_number,
            "role": new_user["role"],
            "is_email_verified": new_user["is_email_verified"]
        }
    }


@router.post("/login")
@limiter.limit("5/15minutes")
def login(request: Request, data: StudentLogin):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE matric_number = %s", (data.matric_number,))
        user = cursor.fetchone()

        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid matric number or password")

        stored_fp = user["device_fingerprint"]
        if isinstance(stored_fp, str):
            stored_fp = json.loads(stored_fp)

        if not check_fingerprint_match(stored_fp, data.device_fingerprint):
            device_otp = generate_otp()
            otp_expiry = datetime.utcnow() + timedelta(minutes=15)
            cursor.execute(
                "UPDATE users SET device_verification_otp = %s, device_verification_expires = %s WHERE id = %s",
                (device_otp, otp_expiry, user["id"])
            )
            send_device_verification_email(user["email"], user["full_name"], device_otp)
            return {"status": "needs_device_verification", "email": user["email"]}

        user_payload = {"user_id": user["id"], "role": user["role"], "token_version": user["token_version"]}
        access_token = create_access_token(user_payload)
        refresh_token = create_refresh_token(user_payload)

        cursor.execute(
            "UPDATE users SET refresh_token_hash = %s WHERE id = %s",
            (hash_token(refresh_token), user["id"])
        )

        return {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "matric_number": user["matric_number"],
                "phone_number": user["phone_number"],
                "role": user["role"],
                "is_email_verified": user["is_email_verified"]
            }
        }


@router.post("/verify-email")
@limiter.limit("5/15minutes")
def verify_email(request: Request, data: VerifyEmail):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["is_email_verified"]:
            return {"status": "success", "message": "Email already verified"}

        if not user["email_verification_otp"] or user["email_verification_expires"] < datetime.utcnow().replace(tzinfo=user["email_verification_expires"].tzinfo):
            raise HTTPException(status_code=400, detail="Verification code expired or invalid")

        if user["email_verification_otp"] != data.otp:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        cursor.execute(
            "UPDATE users SET is_email_verified = TRUE, email_verification_otp = NULL, email_verification_expires = NULL WHERE id = %s",
            (user["id"],)
        )

    return {"status": "success", "message": "Email verified successfully"}


@router.post("/resend-otp")
@limiter.limit("5/15minutes")
def resend_otp(request: Request, data: ResendOtp):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_otp = generate_otp()
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)

        if data.type == "device":
            cursor.execute(
                "UPDATE users SET device_verification_otp = %s, device_verification_expires = %s WHERE id = %s",
                (new_otp, otp_expiry, user["id"])
            )
            send_device_verification_email(user["email"], user["full_name"], new_otp)
        else:
            cursor.execute(
                "UPDATE users SET email_verification_otp = %s, email_verification_expires = %s WHERE id = %s",
                (new_otp, otp_expiry, user["id"])
            )
            send_verification_email(user["email"], user["full_name"], new_otp)

    return {"status": "success", "message": "Verification code resent successfully"}


@router.post("/verify-device")
@limiter.limit("5/15minutes")
def verify_device(request: Request, data: VerifyDevice):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user["device_verification_otp"] or user["device_verification_expires"] < datetime.utcnow().replace(tzinfo=user["device_verification_expires"].tzinfo):
            raise HTTPException(status_code=400, detail="Verification code expired or invalid")

        if user["device_verification_otp"] != data.otp:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        cursor.execute(
            """
            UPDATE users
            SET device_fingerprint = %s, device_verification_otp = NULL, device_verification_expires = NULL
            WHERE id = %s
            """,
            (json.dumps(data.device_fingerprint), user["id"])
        )

        user_payload = {"user_id": user["id"], "role": user["role"], "token_version": user["token_version"]}
        access_token = create_access_token(user_payload)
        refresh_token = create_refresh_token(user_payload)

        cursor.execute(
            "UPDATE users SET refresh_token_hash = %s WHERE id = %s",
            (hash_token(refresh_token), user["id"])
        )

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "matric_number": user["matric_number"],
            "phone_number": user["phone_number"],
            "role": user["role"],
            "is_email_verified": user["is_email_verified"]
        }
    }


@router.post("/forgot-password")
@limiter.limit("5/15minutes")
def forgot_password(request: Request, data: ForgotPassword):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT * FROM users WHERE matric_number = %s AND email = %s",
            (data.matric_number, data.email)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Matric number and email do not match any user")

        if not user["is_email_verified"]:
            raise HTTPException(status_code=400, detail="Email address must be verified before password reset is available")

        reset_otp = generate_otp()
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        cursor.execute(
            "UPDATE users SET password_reset_otp = %s, password_reset_expires = %s WHERE id = %s",
            (reset_otp, otp_expiry, user["id"])
        )

    send_reset_otp_email(data.email, user["full_name"], reset_otp)
    return {"status": "success", "message": "Password reset code sent to your email"}


@router.post("/reset-password")
@limiter.limit("5/15minutes")
def reset_password(request: Request, data: ResetPassword):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user["password_reset_otp"] or user["password_reset_expires"] < datetime.utcnow().replace(tzinfo=user["password_reset_expires"].tzinfo):
            raise HTTPException(status_code=400, detail="Reset code expired or invalid")

        if user["password_reset_otp"] != data.otp:
            raise HTTPException(status_code=400, detail="Invalid reset code")

        cursor.execute(
            """
            UPDATE users
            SET password_hash = %s, token_version = token_version + 1, refresh_token_hash = NULL,
                password_reset_otp = NULL, password_reset_expires = NULL
            WHERE id = %s
            """,
            (hash_password(data.new_password), user["id"])
        )

    return {"status": "success", "message": "Password updated successfully"}


@router.post("/refresh")
@limiter.limit("5/15minutes")
def refresh(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Refresh token required")

    refresh_token = auth_header.split(" ")[1]
    from app.utils.crypto import decode_token
    payload = decode_token(refresh_token, "refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload.get("user_id")
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user["refresh_token_hash"] != hash_token(refresh_token):
            raise HTTPException(status_code=401, detail="Refresh token revoked or reused")

        user_payload = {"user_id": user["id"], "role": user["role"], "token_version": user["token_version"]}
        access_token = create_access_token(user_payload)
        new_refresh_token = create_refresh_token(user_payload)

        cursor.execute(
            "UPDATE users SET refresh_token_hash = %s WHERE id = %s",
            (hash_token(new_refresh_token), user["id"])
        )

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": new_refresh_token
    }


@router.get("/me")
@limiter.limit("30/minute")
def get_me(request: Request, user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            "SELECT id, email, full_name, matric_number, phone_number, role, is_email_verified, device_fingerprint, token_version FROM users WHERE id = %s",
            (user["user_id"],)
        )
        db_user = cursor.fetchone()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if db_user["token_version"] != user.get("token_version"):
            raise HTTPException(status_code=401, detail="Token version mismatch. Please re-authenticate.")

        return {"status": "success", "user": db_user}


@router.put("/profile")
@limiter.limit("10/minute")
def update_profile(request: Request, data: UpdateProfile, user: dict = Depends(get_current_user)):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user["user_id"],))
        db_user = cursor.fetchone()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if data.new_password:
            if not data.current_password:
                raise HTTPException(status_code=400, detail="Current password is required to set a new password")
            if not verify_password(data.current_password, db_user["password_hash"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect")

        if data.phone_number and data.phone_number != db_user["phone_number"]:
            cursor.execute("SELECT id FROM users WHERE phone_number = %s AND id != %s", (data.phone_number, user["user_id"]))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Phone number already in use")

        if data.email and data.email != db_user["email"]:
            cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (data.email, user["user_id"]))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already in use")

        fields = []
        values = []

        if data.full_name:
            fields.append("full_name = %s")
            values.append(data.full_name)
        if data.phone_number:
            fields.append("phone_number = %s")
            values.append(data.phone_number)
        if data.email and data.email != db_user["email"]:
            fields.append("email = %s")
            fields.append("is_email_verified = FALSE")
            values.append(data.email)
        if data.new_password:
            fields.append("password_hash = %s")
            values.append(hash_password(data.new_password))

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(user["user_id"])
        cursor.execute(
            f"UPDATE users SET {', '.join(fields)} WHERE id = %s RETURNING id, email, full_name, matric_number, phone_number, role, is_email_verified",
            tuple(values)
        )
        updated = cursor.fetchone()

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "user": dict(updated)
    }
