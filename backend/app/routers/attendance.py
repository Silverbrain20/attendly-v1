from fastapi import APIRouter, HTTPException, Depends, Request
from app.config.database import db
from app.schemas.validators import AttendanceMark
from app.middleware.auth import get_current_user
from app.utils.risk import GEOFENCE_RADIUS_METRES, haversine_distance, calculate_risk_score
import json

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/mark")
def mark_attendance(request: Request, data: AttendanceMark, user: dict = Depends(get_current_user)):
    user_agent = request.headers.get("User-Agent", "Unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    gps_accuracy = getattr(data, "gps_accuracy", 10.0)

    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.created_by, s.start_time, s.end_time, s.ended_at,
                   ST_Y(s.location_point::geometry) as center_lat,
                   ST_X(s.location_point::geometry) as center_lng
            FROM attendance_sessions s
            WHERE s.id = %s
            """,
            (data.session_id,)
        )
        sess = cursor.fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Attendance session not found")

        if sess.get("ended_at") is not None:
            raise HTTPException(status_code=400, detail="Attendance session is closed or inactive")

        cursor.execute(
            "INSERT INTO course_enrollments (user_id, course_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user["user_id"], sess["course_id"])
        )

        center_lat = float(sess["center_lat"]) if sess["center_lat"] is not None else 0.0
        center_lng = float(sess["center_lng"]) if sess["center_lng"] is not None else 0.0

        # Guarantee 0.0m distance check-in for the session creator (Class Rep)
        if sess["created_by"] == user["user_id"] and center_lat != 0.0 and center_lng != 0.0:
            data.latitude = center_lat
            data.longitude = center_lng

        # Layer 4 Geofence Hard Block (50m floor)
        dist_m = haversine_distance(data.latitude, data.longitude, center_lat, center_lng)
        if dist_m > GEOFENCE_RADIUS_METRES:
            raise HTTPException(
                status_code=403,
                detail=f"You are {dist_m:.0f}m from the classroom. You must be within {int(GEOFENCE_RADIUS_METRES)}m to mark attendance."
            )

        # Layer 5 Risk Scoring Engine
        cursor.execute(
            "SELECT client_ip FROM attendance_records WHERE session_id = %s AND client_ip IS NOT NULL",
            (data.session_id,)
        )
        session_ips = [r["client_ip"] for r in cursor.fetchall() if r.get("client_ip")]

        risk_score, risk_factors, risk_level = calculate_risk_score(
            distance_meters=dist_m,
            gps_accuracy=gps_accuracy,
            session_start=sess.get("start_time"),
            client_ip=client_ip,
            session_ips=session_ips
        )

        if risk_level == "block":
            raise HTTPException(
                status_code=403,
                detail="Submission flagged as high risk. Contact your class rep for manual attendance."
            )

        cursor.execute(
            "SELECT * FROM mark_attendance_atomic(%s, %s, %s, %s, %s)",
            (data.session_id, user["user_id"], data.latitude, data.longitude, user_agent)
        )
        res = cursor.fetchone()

        if not res:
            raise HTTPException(status_code=500, detail="Failed to process attendance submission")

        if not res["success"]:
            raise HTTPException(status_code=400, detail=res["message"])

        # Store risk metadata
        try:
            cursor.execute(
                """
                UPDATE attendance_records
                SET risk_score = %s, risk_factors = %s, risk_level = %s, client_ip = %s
                WHERE session_id = %s AND student_id = %s
                """,
                (risk_score, json.dumps(risk_factors), risk_level, client_ip, data.session_id, user["user_id"])
            )
        except Exception:
            pass

    return {
        "status": "success",
        "message": res["message"],
        "data": {
            "distance_meters": round(dist_m, 1),
            "risk_score": risk_score,
            "risk_level": risk_level
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
    with db.get_cursor() as cursor:
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
            cursor.execute(
                "SELECT COUNT(*) as total FROM attendance_sessions WHERE course_id = %s AND (ended_at IS NOT NULL OR end_time < NOW())",
                (course["course_id"],)
            )
            total_sessions = cursor.fetchone()["total"]

            cursor.execute(
                """
                SELECT COUNT(*) as attended FROM attendance_records ar
                JOIN attendance_sessions s ON ar.session_id = s.id
                WHERE s.course_id = %s AND ar.student_id = %s
                """,
                (course["course_id"], user["user_id"])
            )
            attended = cursor.fetchone()["attended"]

            cursor.execute(
                """
                SELECT COUNT(*) as overrides FROM manual_overrides mo
                JOIN attendance_sessions s ON mo.session_id = s.id
                WHERE s.course_id = %s AND mo.student_id = %s
                """,
                (course["course_id"], user["user_id"])
            )
            overrides_count = cursor.fetchone()["overrides"]

            absences = max(0, total_sessions - attended)
            attendance_pct = round((attended / total_sessions * 100), 1) if total_sessions > 0 else 100.0

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
