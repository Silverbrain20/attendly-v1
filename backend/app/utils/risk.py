import math
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any

# PRD v3 Security Constant: Hard Floor Geofence Radius
GEOFENCE_RADIUS_METRES = 50.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

def calculate_risk_score(
    distance_meters: float,
    gps_accuracy: float,
    session_start: Any,
    client_ip: str,
    session_ips: List[str]
) -> Tuple[int, List[str], str]:
    """
    PRD v3 Risk Engine — 4 Signals & 4 Tiers:
    1. Distance > 40m (Near geofence boundary): +15
    2. GPS accuracy > 50m (Poor GPS accuracy): +10
    3. Submission < 5 seconds after session start (Suspicious speed): +15
    4. IP count > 3 in session (Shared IP): +20
    """
    score = 0
    factors: List[str] = []

    # Signal 1: Near Boundary (> 40m)
    if distance_meters > 40.0:
        score += 15
        factors.append("Near geofence boundary (>40m)")

    # Signal 2: Poor GPS Accuracy (> 50m)
    if gps_accuracy > 50.0:
        score += 10
        factors.append("Poor GPS accuracy (>50m)")

    # Signal 3: Suspiciously Fast Submission (< 5 seconds)
    if session_start:
        try:
            if isinstance(session_start, str):
                session_start_dt = datetime.fromisoformat(session_start.replace('Z', '+00:00'))
            else:
                session_start_dt = session_start

            if session_start_dt.tzinfo is None:
                session_start_dt = session_start_dt.replace(tzinfo=timezone.utc)

            now_dt = datetime.now(timezone.utc)
            elapsed_seconds = (now_dt - session_start_dt).total_seconds()
            if 0 <= elapsed_seconds < 5.0:
                score += 15
                factors.append("Suspiciously fast submission (<5s)")
        except Exception:
            pass

    # Signal 4: Shared IP (> 3 submissions from same IP in session)
    if session_ips and client_ip:
        ip_count = session_ips.count(client_ip)
        if ip_count > 3:
            score += 20
            factors.append(f"Shared IP ({ip_count} submissions)")

    final_score = min(score, 100)

    # Risk Tiers & Actions
    if final_score <= 25:
        risk_level = "allow"
    elif final_score <= 50:
        risk_level = "flag"
    elif final_score <= 75:
        risk_level = "flag_high"
    else:
        risk_level = "block"

    return final_score, factors, risk_level
