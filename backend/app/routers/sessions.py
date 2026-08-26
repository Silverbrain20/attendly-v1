from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from app.config.database import db
from app.schemas.validators import SessionCreate
from app.middleware.auth import get_current_user, get_class_rep_user
import qrcode
import io
import base64
from app.config.settings import settings

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

def generate_qr_code_data_url(session_id: str) -> str:
    session_link = f"{settings.FRONTEND_URL}/attend/{session_id}"
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(session_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{qr_base64}"

@router.post("")
def create_session(data: SessionCreate, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor(commit=True) as cursor:
        # Check if there is already an active session for the course code of this course
        cursor.execute("SELECT course_code FROM courses WHERE id = %s", (data.course_id,))
        course = cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        course_code = course["course_code"]

        # Check for active session in DB for this course_code
        cursor.execute(
            """
            SELECT s.id FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE c.course_code = %s AND s.ended_at IS NULL AND s.end_time > NOW()
            """,
            (course_code,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400, 
                detail=f"An active attendance session for course code {course_code} is already running. Please end it first."
            )

        start_time = datetime.utcnow()
        end_time = start_time + timedelta(minutes=data.duration_minutes)

        cursor.execute(
            """
            INSERT INTO attendance_sessions (course_id, created_by, latitude, longitude, geofence_radius_m, start_time, end_time)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, course_id, geofence_radius_m, start_time, end_time
            """,
            (data.course_id, user["user_id"], data.latitude, data.longitude, data.geofence_radius_m, start_time, end_time)
        )
        session = cursor.fetchone()

    session_link = f"{settings.FRONTEND_URL}/attend/{session['id']}"
    qr_data_url = generate_qr_code_data_url(session["id"])

    return {
        "status": "success",
        "data": {
            "id": session["id"],
            "course_id": session["course_id"],
            "course_code": course_code,
            "geofence_radius_m": session["geofence_radius_m"],
            "start_time": session["start_time"],
            "end_time": session["end_time"],
            "attendance_link": session_link,
            "qr_code_image": qr_data_url
        }
    }

@router.get("/my-active")
def get_my_active_sessions(user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.latitude, s.longitude, s.geofence_radius_m, s.start_time, s.end_time,
                   c.course_code, c.course_title,
                   EXISTS(
                       SELECT 1 FROM attendance_records ar 
                       WHERE ar.session_id = s.id AND ar.student_id = %s
                   ) as already_marked
            FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            JOIN course_enrollments ce ON c.id = ce.course_id
            WHERE ce.user_id = %s AND s.ended_at IS NULL AND s.end_time > NOW()
            ORDER BY s.start_time DESC
            """,
            (user["user_id"], user["user_id"])
        )
        sessions = cursor.fetchall()
        
    return {"status": "success", "data": sessions}

@router.get("/active/{course_id}")
def get_active_session(course_id: str, user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.latitude, s.longitude, s.geofence_radius_m, s.start_time, s.end_time, c.course_code
            FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE s.course_id = %s AND s.ended_at IS NULL AND s.end_time > NOW()
            """,
            (course_id,)
        )
        session = cursor.fetchone()
    
    if not session:
        return {"status": "success", "data": None}
        
    session_link = f"{settings.FRONTEND_URL}/attend/{session['id']}"
    qr_data_url = generate_qr_code_data_url(session["id"])
    return {
        "status": "success",
        "data": {
            **session,
            "attendance_link": session_link,
            "qr_code_image": qr_data_url
        }
    }

@router.get("/{session_id}")
def get_session_details(session_id: str, user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.latitude, s.longitude, s.geofence_radius_m, s.start_time, s.end_time, s.is_flagged, s.ended_at,
                   c.course_code, c.course_title
            FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE s.id = %s
            """,
            (session_id,)
        )
        session = cursor.fetchone()
        
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"status": "success", "data": session}

@router.post("/{session_id}/end")
def end_session(session_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT id, created_by FROM attendance_sessions WHERE id = %s AND ended_at IS NULL",
            (session_id,)
        )
        session = cursor.fetchone()
        
        if not session:
            raise HTTPException(status_code=400, detail="Session not found or already ended")

        if session["created_by"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Only the session creator can end it")

        cursor.execute(
            "UPDATE attendance_sessions SET ended_at = NOW() WHERE id = %s",
            (session_id,)
        )
        
    return {"status": "success", "message": "Session ended successfully"}

@router.get("/{session_id}/qr")
def get_session_qr(session_id: str, user: dict = Depends(get_current_user)):
    qr_data_url = generate_qr_code_data_url(session_id)
    return {"status": "success", "qr_code_image": qr_data_url}


@router.get("/history/all")
def get_all_session_history(user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.start_time, s.end_time, s.ended_at, s.geofence_radius_m, s.is_flagged,
                   c.course_code, c.course_title,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as present_count,
                   (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = s.course_id) as total_enrolled,
                   (SELECT COUNT(*) FROM manual_overrides mo WHERE mo.session_id = s.id) as override_count
            FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE c.created_by = %s OR s.created_by = %s
            ORDER BY s.start_time DESC
            """,
            (user["user_id"], user["user_id"])
        )
        sessions = cursor.fetchall()
    return {"status": "success", "data": sessions}

