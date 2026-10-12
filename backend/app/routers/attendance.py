from fastapi import APIRouter, HTTPException, Depends, Request
from app.config.database import db
from app.schemas.validators import AttendanceMark
from app.middleware.auth import get_current_user, get_class_rep_user
from app.utils.permissions import require_session_owner
from app.utils.risk import GEOFENCE_RADIUS_METRES, haversine_distance, calculate_risk_score
import json

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/mark")
def mark_attendance(request: Request, data: AttendanceMark, user: dict = Depends(get_current_user)):
    user_agent = request.headers.get("User-Agent", "Unknown")
    client_ip = request.client.host if request.client else "127.0.0.1"
    gps_accuracy = data.gps_accuracy

    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            """
            SELECT s.id, s.course_id, s.created_by, s.start_time, s.end_time, s.ended_at, s.geofence_radius_m,
                   s.latitude as center_lat,
                   s.longitude as center_lng
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

        center_lat = float(sess["center_lat"]) if sess.get("center_lat") is not None else 0.0
        center_lng = float(sess["center_lng"]) if sess.get("center_lng") is not None else 0.0

        dist_m = haversine_distance(data.latitude, data.longitude, center_lat, center_lng)
        geofence_limit = float(sess.get("geofence_radius_m") or GEOFENCE_RADIUS_METRES)
        if dist_m > geofence_limit:
            raise HTTPException(
                status_code=403,
                detail=f"You are {dist_m:.0f}m from the classroom. You must be within {int(geofence_limit)}m.",
            )

        # Risk scoring — batch fetch IPs once
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
            session_ips=session_ips,
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

        cursor.execute(
            """
            UPDATE attendance_records
            SET risk_score = %s, risk_factors = %s, risk_level = %s, client_ip = %s
            WHERE session_id = %s AND student_id = %s
            """,
            (risk_score, json.dumps(risk_factors), risk_level, client_ip, data.session_id, user["user_id"])
        )

    return {
        "status": "success",
        "message": res["message"],
        "data": {
            "distance_meters": round(dist_m, 1),
            "risk_score": risk_score,
            "risk_level": risk_level,
        },
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
            LIMIT 200
            """,
            (user["user_id"],)
        )
        records = cursor.fetchall()
    return {"status": "success", "data": records}


@router.get("/session/{session_id}")
def get_session_attendance(session_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
        require_session_owner(cursor, session_id, user)
        cursor.execute(
            """
            SELECT ar.id, ar.marked_at, ar.is_within_geofence, ar.is_manual_override, ar.distance_meters,
                   u.full_name, u.matric_number, ar.risk_score, ar.risk_factors, ar.risk_level
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
    """Single aggregate query replacing the previous N×3 per-course query loop."""
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                c.id                                                            AS course_id,
                c.course_code,
                c.course_title,
                COUNT(DISTINCT s.id)                                            AS total_classes,
                COUNT(DISTINCT ar.session_id)                                   AS attended,
                COUNT(DISTINCT mo.id)                                           AS manual_overrides
            FROM course_enrollments ce
            JOIN courses c ON c.id = ce.course_id
            LEFT JOIN attendance_sessions s
                ON s.course_id = c.id AND (s.ended_at IS NOT NULL OR s.end_time < NOW())
            LEFT JOIN attendance_records ar
                ON ar.session_id = s.id AND ar.student_id = ce.user_id
            LEFT JOIN manual_overrides mo
                ON mo.session_id = s.id AND mo.student_id = ce.user_id
            WHERE ce.user_id = %s
            GROUP BY c.id, c.course_code, c.course_title
            ORDER BY c.course_code
            """,
            (user["user_id"],)
        )
        rows = cursor.fetchall()

    summary = []
    for row in rows:
        total = row["total_classes"] or 0
        attended = row["attended"] or 0
        absences = max(0, total - attended)
        pct = round(attended / total * 100, 1) if total > 0 else 100.0
        summary.append({
            "course_id": row["course_id"],
            "course_code": row["course_code"],
            "course_title": row["course_title"],
            "total_classes": total,
            "attended": attended,
            "absences": absences,
            "attendance_percentage": pct,
            "manual_overrides": row["manual_overrides"] or 0,
        })

    return {"status": "success", "data": summary}
