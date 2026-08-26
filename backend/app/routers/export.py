from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.config.database import db
from app.middleware.auth import get_class_rep_user
import io
import csv

router = APIRouter(prefix="/api/export", tags=["Exports"])

@router.get("/session/{session_id}")
def export_session_attendance(session_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT s.id, s.start_time, c.course_code, c.course_title, s.course_id
            FROM attendance_sessions s
            JOIN courses c ON s.course_id = c.id
            WHERE s.id = %s
            """,
            (session_id,)
        )
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cursor.execute(
            """
            SELECT u.id, u.full_name, u.matric_number, u.email, u.phone_number
            FROM users u
            JOIN course_enrollments ce ON u.id = ce.user_id
            WHERE ce.course_id = %s
            ORDER BY u.full_name
            """,
            (session["course_id"],)
        )
        students = cursor.fetchall()

        cursor.execute(
            "SELECT * FROM attendance_records WHERE session_id = %s",
            (session_id,)
        )
        records = {r["student_id"]: r for r in cursor.fetchall()}

        cursor.execute(
            "SELECT student_id, reason FROM manual_overrides WHERE session_id = %s",
            (session_id,)
        )
        overrides = {o["student_id"]: o["reason"] for o in cursor.fetchall()}

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Full Name", "Matric Number", "Email", "Phone Number", 
        "Status", "Method", "Distance (meters)", "Manual Override Reason", "Time Marked"
    ])

    for s in students:
        student_id = s["id"]
        record = records.get(student_id)
        override_reason = overrides.get(student_id, "")
        
        status = "Absent"
        method = "N/A"
        distance = "N/A"
        time_marked = "N/A"

        if record:
            status = "Present"
            time_marked = record["marked_at"].strftime("%Y-%m-%d %H:%M:%S")
            if record["is_manual_override"]:
                method = "Manual Override"
                distance = "0.0"
            else:
                method = "Geo-Verified"
                distance = f"{record['distance_meters']:.1f}" if record["distance_meters"] is not None else "Unknown"

        writer.writerow([
            s["full_name"], s["matric_number"], s["email"], s["phone_number"],
            status, method, distance, override_reason, time_marked
        ])

    output.seek(0)
    session_date = session["start_time"].strftime("%Y-%m-%d")
    filename = f"{session['course_code']}_attendance_{session_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/course/{course_id}")
def export_course_attendance(course_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        cursor.execute("SELECT id, course_code, course_title FROM courses WHERE id = %s", (course_id,))
        course = cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        cursor.execute(
            "SELECT id, start_time FROM attendance_sessions WHERE course_id = %s AND (ended_at IS NOT NULL OR end_time < NOW()) ORDER BY start_time",
            (course_id,)
        )
        sessions = cursor.fetchall()
        total_sessions = len(sessions)

        cursor.execute(
            """
            SELECT u.id, u.full_name, u.matric_number, u.email, u.phone_number
            FROM users u
            JOIN course_enrollments ce ON u.id = ce.user_id
            WHERE ce.course_id = %s
            ORDER BY u.full_name
            """,
            (course_id,)
        )
        students = cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Full Name", "Matric Number", "Email", "Phone Number",
        "Attended Classes", "Total Sessions Held", "Absences",
        "Attendance Rate (%)", "Manual Overrides", "Exam Eligibility Status"
    ])

    for s in students:
        student_id = s["id"]
        with db.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) as attended,
                       COUNT(CASE WHEN is_manual_override THEN 1 END) as overrides
                FROM attendance_records ar
                JOIN attendance_sessions sess ON ar.session_id = sess.id
                WHERE sess.course_id = %s AND ar.student_id = %s
                """,
                (course_id, student_id)
            )
            stats = cursor.fetchone()

        attended = stats["attended"] if stats else 0
        overrides = stats["overrides"] if stats else 0
        absences = max(0, total_sessions - attended)
        rate = (attended / total_sessions * 100) if total_sessions > 0 else 100.0
        eligibility = "Eligible (>= 75%)" if rate >= 75.0 else "Ineligible (< 75%)"

        writer.writerow([
            s["full_name"], s["matric_number"], s["email"], s["phone_number"],
            attended, total_sessions, absences,
            f"{rate:.1f}%", overrides, eligibility
        ])

    output.seek(0)
    filename = f"{course['course_code']}_full_attendance_report.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
