from fastapi import APIRouter, HTTPException, Depends
from app.config.database import db
from app.schemas.validators import OverrideCreate
from app.middleware.auth import get_class_rep_user
import psycopg2

router = APIRouter(prefix="/api/overrides", tags=["Manual Overrides"])

@router.post("")
def create_override(data: OverrideCreate, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor(commit=True) as cursor:
        # Verify session exists and belongs to a course the class rep is enrolled in
        cursor.execute(
            """
            SELECT s.id, s.course_id FROM attendance_sessions s
            JOIN course_enrollments ce ON s.course_id = ce.course_id
            WHERE s.id = %s AND ce.user_id = %s
            """,
            (data.session_id, user["user_id"])
        )
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=400, detail="Session not found or unauthorized")

        # Verify student exists and is enrolled in the course
        cursor.execute(
            "SELECT id FROM course_enrollments WHERE course_id = %s AND user_id = %s",
            (session["course_id"], data.student_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Student is not enrolled in this course")

        # Double check override cap programmatically (in addition to the DB trigger)
        cursor.execute(
            "SELECT COUNT(*) as count FROM manual_overrides WHERE session_id = %s",
            (data.session_id,)
        )
        count = cursor.fetchone()["count"]
        if count >= 10:
            raise HTTPException(status_code=400, detail="Override cap (10) reached for this session")

        # Insert manual override (atomic write)
        try:
            cursor.execute(
                """
                INSERT INTO manual_overrides (session_id, student_id, overridden_by, reason)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (data.session_id, data.student_id, user["user_id"], data.reason)
            )
            override = cursor.fetchone()
            
            # Insert or update attendance record as manual override
            cursor.execute(
                """
                INSERT INTO attendance_records (session_id, student_id, is_within_geofence, is_manual_override, distance_meters)
                VALUES (%s, %s, TRUE, TRUE, 0.0)
                ON CONFLICT (session_id, student_id)
                DO UPDATE SET is_manual_override = TRUE, is_within_geofence = TRUE, distance_meters = 0.0
                """,
                (data.session_id, data.student_id)
            )
        except psycopg2.DatabaseError as e:
            if "Override cap" in str(e):
                raise HTTPException(status_code=400, detail="Override cap (10) reached for this session")
            raise HTTPException(status_code=400, detail=f"Database error: {e}")

    return {
        "status": "success",
        "message": "Manual override created successfully",
        "data": override
    }

@router.get("/session/{session_id}")
def get_session_overrides(session_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT mo.id, mo.created_at, mo.reason, 
                   s.full_name as student_name, s.matric_number as student_matric,
                   cr.full_name as class_rep_name
            FROM manual_overrides mo
            JOIN users s ON mo.student_id = s.id
            JOIN users cr ON mo.overridden_by = cr.id
            WHERE mo.session_id = %s
            ORDER BY mo.created_at DESC
            """,
            (session_id,)
        )
        overrides = cursor.fetchall()
    return {"status": "success", "data": overrides}

@router.get("/session/{session_id}/count")
def get_session_override_count(session_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) as count FROM manual_overrides WHERE session_id = %s",
            (session_id,)
        )
        count = cursor.fetchone()["count"]
    return {"status": "success", "count": count, "max": 10, "remaining": max(0, 10 - count)}
