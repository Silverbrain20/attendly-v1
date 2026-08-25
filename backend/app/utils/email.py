import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import resend
from app.config.settings import settings

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


def send_verification_email(to_email: str, name: str, otp: str) -> bool:
    subject = "Attendly — Confirm Your Email"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">Welcome to Attendly</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart Geo-Verified Attendance</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hi {name},</p>
        <p style="color: #334155; font-size: 15px;">Please use the following verification code to confirm your email address:</p>
        <div style="font-size: 28px; font-weight: bold; color: #4f46e5; padding: 18px; background: #eef2ff; text-align: center; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center;">This code will expire in 15 minutes. If you did not sign up for Attendly, please ignore this email.</p>
    </div>
    """
    return _send(to_email, subject, html_content)


def send_reset_otp_email(to_email: str, name: str, otp: str) -> bool:
    subject = "Attendly — Password Reset Request"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">Reset Your Password</h2>
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
    subject = "Attendly — New Device Verification"
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">New Device Detected</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Security Check</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hi {name},</p>
        <p style="color: #334155; font-size: 15px;">You are signing in from a new device or browser. Verify your sign-in with this code:</p>
        <div style="font-size: 28px; font-weight: bold; color: #2563eb; padding: 18px; background: #eff6ff; text-align: center; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; text-align: center;">This code expires in 15 minutes.</p>
    </div>
    """
    return _send(to_email, subject, html_content)


def _send(to_email: str, subject: str, html: str) -> bool:
    # 1. SMTP (Gmail / Custom SMTP) if credentials are provided
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
            msg["To"] = to_email
            
            part = MIMEText(html, "html")
            msg.attach(part)
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            print(f"[SMTP SUCCESS] Email sent to {to_email} via {settings.SMTP_HOST}")
            return True
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send email via SMTP: {e}")

    # 2. Resend API Fallback if API key exists
    if settings.RESEND_API_KEY:
        try:
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": to_email,
                "subject": subject,
                "html": html
            })
            print(f"[RESEND SUCCESS] Email sent to {to_email} via Resend")
            return True
        except Exception as e:
            print(f"[RESEND ERROR] Failed to send email via Resend: {e}")

    # 3. Development / Mock Mode fallback if no services configured
    print("\n=== [DEVELOPMENT MODE: EMAIL LOG] ===")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body snippet: {html[:120]}...")
    print("=====================================\n")
    return True
