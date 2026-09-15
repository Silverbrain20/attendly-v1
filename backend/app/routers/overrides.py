from fastapi import APIRouter, HTTPException, Depends
from app.config.database import db
from app.schemas.validators import OverrideCreate
from app.middleware.auth import get_class_rep_user
import psycopg2

router = APIRouter(prefix="/api/overrides", tags=["Manual Overrides"])


@router.post("")
def create_override(data: OverrideCreate, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor(commit=True) as cursor:
        # Verify the session exists and belongs to a course the rep created or is enrolled in
        cursor.execute(
            "SELECT id, course_id FROM attendance_sessions WHERE id = %s",
            (data.session_id,)
        )
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=400, detail="Session not found")

        # Verify target student exists
        cursor.execute("SELECT id FROM users WHERE id = %s", (data.student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Student not found")

        # Verify target student is enrolled in the session's course
        cursor.execute(
            "SELECT id FROM course_enrollments WHERE course_id = %s AND user_id = %s",
            (session["course_id"], data.student_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Student is not enrolled in this course")

        cursor.execute(
            "SELECT COUNT(*) as count FROM manual_overrides WHERE session_id = %s",
            (data.session_id,)
        )
        count = cursor.fetchone()["count"]
        if count >= 10:
            raise HTTPException(status_code=400, detail="Override cap (10) reached for this session")

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
            err = str(e)
            if "Override cap" in err:
                raise HTTPException(status_code=400, detail="Override cap (10) reached for this session")
            raise HTTPException(status_code=400, detail="Failed to process manual override due to database error")

    return {
        "status": "success",
        "message": "Manual override created successfully",
        "data": override
    }


@router.get("/session/{session_id}/students")
def get_session_students_for_override(session_id: str, user: dict = Depends(get_class_rep_user)):
    """
    Returns all students enrolled in the session's course who have NOT yet marked attendance.
    Used to populate the override student picker.
    """
    with db.get_cursor() as cursor:
        cursor.execute(
            "SELECT course_id FROM attendance_sessions WHERE id = %s",
            (session_id,)
        )
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cursor.execute(
            """
            SELECT u.id, u.full_name, u.matric_number, u.email
            FROM users u
            JOIN course_enrollments ce ON u.id = ce.user_id
            WHERE ce.course_id = %s
              AND NOT EXISTS (
                SELECT 1 FROM attendance_records ar
                WHERE ar.session_id = %s AND ar.student_id = u.id
              )
            ORDER BY u.full_name
            """,
            (session["course_id"], session_id)
        )
        students = cursor.fetchall()

    return {"status": "success", "data": students}


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
