from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from app.config.database import db, supabase
from app.schemas.validators import (
    StudentRegister, StudentLogin, VerifyEmail, VerifyDevice, ResendOtp,
    ForgotPassword, ResetPassword, UpdateProfile
)
from app.utils.crypto import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, hash_token
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

        # Flow 1 Trigger: Call Supabase Auth API sign_up over HTTPS
        try:
            auth_response = supabase.auth.sign_up({
                "email": data.email,
                "password": data.password
            })
            # Always issue signup resend to guarantee 6-digit OTP delivery via SMTP
            try:
                supabase.auth.resend({"type": "signup", "email": data.email})
            except Exception:
                pass
        except Exception as e:
            err = str(e)
            if "already registered" in err.lower() or "already exists" in err.lower():
                # Email existed in Supabase Auth (e.g. from deleted DB account), explicitly trigger signup OTP
                try:
                    supabase.auth.resend({"type": "signup", "email": data.email})
                except Exception as resend_err:
                    raise HTTPException(status_code=400, detail="Email already registered in system")
            else:
                raise HTTPException(status_code=400, detail=f"Registration failed: {err}")

        # Store profile into PostgreSQL DB
        cursor.execute(
            """
            INSERT INTO users (email, password_hash, full_name, matric_number, phone_number,
                               device_fingerprint, is_email_verified)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE)
            RETURNING id, role, is_email_verified
            """,
            (data.email, pwd_hash, data.full_name, data.matric_number, data.phone_number,
             json.dumps(data.device_fingerprint) if data.device_fingerprint else None)
        )
        new_user = cursor.fetchone()

    return {
        "status": "success",
        "message": "Registration successful. Please check your email for the 6-digit verification code.",
        "user": {
            "id": new_user["id"],
            "email": data.email,
            "full_name": data.full_name,
            "matric_number": data.matric_number,
            "phone_number": data.phone_number,
            "role": new_user["role"],
            "is_email_verified": False
        }
    }


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: StudentLogin):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE matric_number = %s", (data.matric_number,))
        user = cursor.fetchone()

        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid matric number or password")

        if not user["is_email_verified"]:
            try:
                supabase.auth.resend({"type": "signup", "email": user["email"]})
            except Exception:
                pass
            raise HTTPException(status_code=403, detail="Please verify your email address first.")

        # PRD v3 Layer 3 Security Check: Active Class Session Lock
        cursor.execute(
            """
            SELECT id FROM attendance_sessions
            WHERE ended_at IS NULL AND NOW() BETWEEN start_time AND end_time
            """
        )
        active_session = cursor.fetchone()

        stored_fp = user["device_fingerprint"]
        if isinstance(stored_fp, str):
            stored_fp = json.loads(stored_fp)

        if active_session:
            if not stored_fp:
                raise HTTPException(
                    status_code=403,
                    detail="Login is not allowed during an active class session. Try again after class ends."
                )
            if not check_fingerprint_match(stored_fp, data.device_fingerprint):
                raise HTTPException(
                    status_code=403,
                    detail="You cannot log in from a different device during an active class session."
                )
            # Same device during session — allow re-login for crash recovery
        else:
            # Outside active session — first login registers device, different device triggers OTP re-verification
            if not stored_fp:
                cursor.execute(
                    "UPDATE users SET device_fingerprint = %s WHERE id = %s",
                    (json.dumps(data.device_fingerprint), user["id"])
                )
            elif not check_fingerprint_match(stored_fp, data.device_fingerprint):
                try:
                    supabase.auth.sign_in_with_otp({"email": user["email"]})
                except Exception as e:
                    print(f"[SUPABASE SIGN_IN_WITH_OTP WARNING] {e}")
                return {
                    "status": "needs_device_verification",
                    "email": user["email"],
                    "message": "New device detected. A verification code has been sent to your email."
                }

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
    # Flow 1 Verify: Verify registration OTP with type 'signup'
    try:
        sb_res = supabase.auth.verify_otp({
            "email": data.email,
            "token": data.otp,
            "type": "signup"
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    if not sb_res.user and not sb_res.session:
        raise HTTPException(status_code=400, detail="Verification failed. Code is invalid or expired.")

    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User profile not found")

        cursor.execute(
            "UPDATE users SET is_email_verified = TRUE WHERE id = %s",
            (user["id"],)
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
        "message": "Email verified successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "matric_number": user["matric_number"],
            "phone_number": user["phone_number"],
            "role": user["role"],
            "is_email_verified": True
        }
    }


@router.post("/verify-device")
@limiter.limit("5/15minutes")
def verify_device(request: Request, data: VerifyDevice):
    # Flow 3 Verify: Verify device re-verification OTP with type 'email'
    try:
        sb_res = supabase.auth.verify_otp({
            "email": data.email,
            "token": data.otp,
            "type": "email"
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    if not sb_res.user and not sb_res.session:
        raise HTTPException(status_code=400, detail="Verification failed. Code is invalid or expired.")

    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT * FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User profile not found")

        cursor.execute(
            "UPDATE users SET device_fingerprint = %s WHERE id = %s",
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
    # Flow 2 Business Rule: Verify matric_number matches email in DB
    with db.get_cursor() as cursor:
        cursor.execute(
            "SELECT * FROM users WHERE matric_number = %s AND email = %s",
            (data.matric_number, data.email)
        )
        user = cursor.fetchone()

        if not user:
            # Return same message without revealing which field is wrong
            raise HTTPException(status_code=400, detail="No account matches those details")

        if not user["is_email_verified"]:
            raise HTTPException(status_code=400, detail="Email address must be verified before password reset is available")

    # Flow 2 Trigger: Trigger password reset via Supabase Auth
    try:
        supabase.auth.reset_password_email(data.email)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to send password reset email")

    return {"status": "success", "message": "Password reset code sent to your email"}


@router.post("/reset-password")
@limiter.limit("5/15minutes")
def reset_password(request: Request, data: ResetPassword):
    # Flow 2 Verify: Verify password reset OTP with type 'recovery'
    try:
        sb_res = supabase.auth.verify_otp({
            "email": data.email,
            "token": data.otp,
            "type": "recovery"
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    if not sb_res.session and not sb_res.user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            """
            UPDATE users
            SET password_hash = %s, token_version = token_version + 1, refresh_token_hash = NULL
            WHERE email = %s
            """,
            (hash_password(data.new_password), data.email)
        )

    return {"status": "success", "message": "Password updated successfully"}


@router.post("/resend-otp")
@limiter.limit("5/15minutes")
def resend_otp(request: Request, data: ResendOtp):
    try:
        if data.type == "device":
            supabase.auth.sign_in_with_otp({"email": data.email})
        elif data.type == "recovery":
            supabase.auth.reset_password_email(data.email)
        else:
            supabase.auth.resend({"type": "signup", "email": data.email})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to resend code: {e}")

    return {"status": "success", "message": "Verification code resent successfully"}


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


@router.delete("/account")
@limiter.limit("5/minute")
def delete_account(request: Request, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User account not found")

        cursor.execute("UPDATE invite_codes SET used_by = NULL WHERE used_by = %s", (user_id,))
        cursor.execute("DELETE FROM manual_overrides WHERE student_id = %s OR overridden_by = %s", (user_id, user_id))
        cursor.execute("DELETE FROM attendance_records WHERE student_id = %s", (user_id,))
        cursor.execute("DELETE FROM attendance_sessions WHERE created_by = %s", (user_id,))
        cursor.execute("DELETE FROM course_enrollments WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM courses WHERE created_by = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))

    return {"status": "success", "message": "Account permanently deleted"}
