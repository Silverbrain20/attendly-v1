import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import resend
from app.config.settings import settings

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


def send_verification_email(to_email: str, name: str, otp: str) -> bool:
    print(f"\n==========================================")
    print(f"[ATTENDLY VERIFICATION OTP] Email: {to_email} | OTP: {otp}")
    print(f"==========================================\n")
    subject = "Attendly — Confirm Your Email"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6C0022; margin: 0; font-size: 22px;">Welcome to Attendly</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart Geo-Verified Attendance</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hi {name},</p>
        <p style="color: #334155; font-size: 15px;">Please use the following verification code to confirm your email address:</p>
        <div style="font-size: 28px; font-weight: bold; color: #6C0022; padding: 18px; background: #fff1f2; text-align: center; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center;">This code will expire in 15 minutes. If you did not sign up for Attendly, please ignore this email.</p>
    </div>
    """
    return _send(to_email, subject, html_content)


def send_reset_otp_email(to_email: str, name: str, otp: str) -> bool:
    print(f"\n==========================================")
    print(f"[ATTENDLY RESET OTP] Email: {to_email} | OTP: {otp}")
    print(f"==========================================\n")
    subject = "Attendly — Password Reset Request"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6C0022; margin: 0; font-size: 22px;">Reset Your Password</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Attendly Account Security</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hi {name},</p>
        <p style="color: #334155; font-size: 15px;">We received a request to reset your password. Enter the code below to proceed:</p>
        <div style="font-size: 28px; font-weight: bold; color: #d97706; padding: 18px; background: #fffbeb; text-align: center; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center;">This code will expire in 10 minutes. If you did not request this, your account remains secure.</p>
    </div>
    """
    return _send(to_email, subject, html_content)


def send_device_verification_email(to_email: str, name: str, otp: str) -> bool:
    print(f"\n==========================================")
    print(f"[ATTENDLY DEVICE OTP] Email: {to_email} | OTP: {otp}")
    print(f"==========================================\n")
    subject = "Attendly — New Device Verification"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #6C0022; margin: 0; font-size: 22px;">New Device Detected</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Security Check</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hi {name},</p>
        <p style="color: #334155; font-size: 15px;">You are signing in from a new device or browser. Verify your sign-in with this code:</p>
        <div style="font-size: 28px; font-weight: bold; color: #6C0022; padding: 18px; background: #fff1f2; text-align: center; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center;">This code expires in 15 minutes.</p>
    </div>
    """
    return _send(to_email, subject, html_content)


def _send_worker(to_email: str, subject: str, html: str):
    """Executes email transmission in background thread so HTTP requests respond instantly."""
    # 1. Try Resend HTTP API over Port 443 (Sends full custom HTML with 6-digit OTP code)
    if settings.RESEND_API_KEY:
        try:
            # Resend uses onboarding@resend.dev unless custom domain is verified
            from_sender = "onboarding@resend.dev"
            resend.Emails.send({
                "from": f"Attendly <{from_sender}>",
                "to": to_email,
                "subject": subject,
                "html": html
            })
            print(f"[RESEND SUCCESS] Custom 6-digit OTP email sent to {to_email} via Resend HTTP API")
            return
        except Exception as e:
            print(f"[RESEND WARNING] Resend delivery failed: {e}. Trying SMTP...")

    # 2. Try SMTP with 5-second socket timeout
    if settings.SMTP_USER and settings.SMTP_PASSWORD and settings.SMTP_HOST:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
            msg["To"] = to_email
            
            part = MIMEText(html, "html")
            msg.attach(part)
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            print(f"[SMTP SUCCESS] Email sent to {to_email} via {settings.SMTP_HOST}")
            return
        except Exception as e:
            print(f"[SMTP WARNING] Failed to send email via SMTP: {e}")

    print(f"[EMAIL COMPLETED] OTP logged above for {to_email}")


def _send(to_email: str, subject: str, html: str) -> bool:
    """Dispatches email sending asynchronously in a background thread."""
    thread = threading.Thread(target=_send_worker, args=(to_email, subject, html), daemon=True)
    thread.start()
    return True

