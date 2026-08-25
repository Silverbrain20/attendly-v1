from fastapi import APIRouter, HTTPException, Depends, Request
from app.config.database import db
from app.schemas.validators import AttendanceMark
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.post("/mark")
def mark_attendance(request: Request, data: AttendanceMark, user: dict = Depends(get_current_user)):
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT * FROM mark_attendance_atomic(%s, %s, %s, %s, %s)",
            (data.session_id, user["user_id"], data.latitude, data.longitude, user_agent)
        )
        res = cursor.fetchone()

    if not res:
        raise HTTPException(status_code=500, detail="Failed to process attendance submission")

    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])

    return {
        "status": "success",
        "message": res["message"],
        "data": {
            "distance_meters": res["distance_m"]
        }
    }

@router.get("/me")
def my_attendance_history(user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT ar.id, ar.marked_at, ar.is_within_geofence, ar.is_manual_override, ar.distance_meters,
                   s.start_time, c.course_code, c.course_title
            FROM attendance_records ar
            JOIN attendance_sessions s ON ar.session_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE ar.student_id = %s
            ORDER BY ar.marked_at DESC
            """,
            (user["user_id"],)
        )
        records = cursor.fetchall()
    return {"status": "success", "data": records}

@router.get("/session/{session_id}")
def get_session_attendance(session_id: str, user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT ar.id, ar.marked_at, ar.is_within_geofence, ar.is_manual_override, ar.distance_meters,
                   u.full_name, u.matric_number
            FROM attendance_records ar
            JOIN users u ON ar.student_id = u.id
            WHERE ar.session_id = %s
            ORDER BY u.full_name
            """,
            (session_id,)
        )
        records = cursor.fetchall()
    return {"status": "success", "data": records}

@router.get("/my-summary")
def get_my_summary(user: dict = Depends(get_current_user)):
    # Aggregated metrics for total classes, absences, attendance %
    with db.get_cursor() as cursor:
        # Get all enrollments
        cursor.execute(
            """
            SELECT ce.course_id, c.course_code, c.course_title
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = %s
            """,
            (user["user_id"],)
        )
        enrollments = cursor.fetchall()

        summary_data = []
        for course in enrollments:
            # Count total sessions for this course
            cursor.execute(
                "SELECT COUNT(*) as total FROM attendance_sessions WHERE course_id = %s AND (ended_at IS NOT NULL OR end_time < NOW())",
                (course["course_id"],)
            )
            total_sessions = cursor.fetchone()["total"]

            # Count attended sessions for this course
            cursor.execute(
                """
                SELECT COUNT(*) as attended FROM attendance_records ar
                JOIN attendance_sessions s ON ar.session_id = s.id
                WHERE s.course_id = %s AND ar.student_id = %s
                """,
                (course["course_id"], user["user_id"])
            )
            attended = cursor.fetchone()["attended"]

            absences = max(0, total_sessions - attended)
            attendance_pct = round((attended / total_sessions * 100), 1) if total_sessions > 0 else 100.0

            # Get manual overrides for this course
            cursor.execute(
                """
                SELECT COUNT(*) as overrides FROM manual_overrides mo
                JOIN attendance_sessions s ON mo.session_id = s.id
                WHERE s.course_id = %s AND mo.student_id = %s
                """,
                (course["course_id"], user["user_id"])
            )
            overrides_count = cursor.fetchone()["overrides"]

            summary_data.append({
                "course_id": course["course_id"],
                "course_code": course["course_code"],
                "course_title": course["course_title"],
                "total_classes": total_sessions,
                "attended": attended,
                "absences": absences,
                "attendance_percentage": attendance_pct,
                "manual_overrides": overrides_count
            })

    return {"status": "success", "data": summary_data}
