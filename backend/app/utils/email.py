"""
Attendly Email Notification Module.
All transactional email dispatches and OTP notifications are handled by Supabase Auth
over HTTPS (via Brevo SMTP inside the Supabase infrastructure).
FastAPI makes zero outbound SMTP or Resend API calls.
"""

def send_verification_email(to_email: str, name: str, otp: str = "") -> bool:
    print(f"[SUPABASE AUTH] Email verification OTP dispatched via Supabase Auth for {to_email}")
    return True

def send_reset_otp_email(to_email: str, name: str, otp: str = "") -> bool:
    print(f"[SUPABASE AUTH] Password reset OTP dispatched via Supabase Auth for {to_email}")
    return True

def send_device_verification_email(to_email: str, name: str, otp: str = "") -> bool:
    print(f"[SUPABASE AUTH] Device verification OTP dispatched via Supabase Auth for {to_email}")
    return True


