-- ============================================
-- Attendly Spatial & Business Logic Functions
-- ============================================

-- Check if a student's coordinate is within a session's geofence (100m)
CREATE OR REPLACE FUNCTION check_geofence(
    p_session_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS TABLE (
    is_within BOOLEAN,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    v_session_geom GEOGRAPHY;
    v_student_geom GEOGRAPHY;
    v_radius INTEGER;
BEGIN
    SELECT location_point, geofence_radius_m INTO v_session_geom, v_radius
    FROM attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    v_student_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
    
    RETURN QUERY
    SELECT 
        ST_DWithin(v_session_geom, v_student_geom, v_radius) AS is_within,
        ST_Distance(v_session_geom, v_student_geom) AS distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Mark attendance atomically checking constraints
CREATE OR REPLACE FUNCTION mark_attendance_atomic(
    p_session_id UUID,
    p_student_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_user_agent TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    distance_m DOUBLE PRECISION,
    message TEXT
) AS $$
DECLARE
    v_session_active BOOLEAN;
    v_is_within BOOLEAN;
    v_distance DOUBLE PRECISION;
    v_course_id UUID;
    v_enrolled BOOLEAN;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Check if session exists and is active (not ended manually, and within start/end time)
    SELECT course_id, end_time, (ended_at IS NULL AND start_time <= NOW() AND end_time >= NOW())
    INTO v_course_id, v_end_time, v_session_active
    FROM attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0.0, 'Session not found'::TEXT;
        RETURN;
    END IF;

    IF NOT v_session_active THEN
        RETURN QUERY SELECT FALSE, 0.0, 'Session is not active or has expired'::TEXT;
        RETURN;
    END IF;

    -- Verify student is enrolled in the course
    SELECT EXISTS(
        SELECT 1 FROM course_enrollments 
        WHERE user_id = p_student_id AND course_id = v_course_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        RETURN QUERY SELECT FALSE, 0.0, 'Student is not enrolled in this course'::TEXT;
        RETURN;
    END IF;

    -- Calculate distance and geofence
    SELECT is_within, distance_meters INTO v_is_within, v_distance
    FROM check_geofence(p_session_id, p_lat, p_lng);

    IF NOT v_is_within THEN
        RETURN QUERY SELECT FALSE, v_distance, 'Outside geofence boundary'::TEXT;
        RETURN;
    END IF;

    -- Record attendance
    INSERT INTO attendance_records (
        session_id,
        student_id,
        latitude,
        longitude,
        distance_meters,
        is_within_geofence,
        is_manual_override,
        user_agent
    )
    VALUES (
        p_session_id,
        p_student_id,
        p_lat,
        p_lng,
        v_distance,
        TRUE,
        FALSE,
        p_user_agent
    )
    ON CONFLICT (session_id, student_id) 
    DO NOTHING;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, v_distance, 'Attendance already marked'::TEXT;
    ELSE
        RETURN QUERY SELECT TRUE, v_distance, 'Attendance marked successfully'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto flag session when overrides reach 10
CREATE OR REPLACE FUNCTION check_session_overrides_cap()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check total overrides for this session
    SELECT COUNT(*) INTO v_count
    FROM manual_overrides
    WHERE session_id = NEW.session_id;

    IF v_count >= 10 THEN
        RAISE EXCEPTION 'Override cap (10) reached for this session.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_session_overrides_cap
    BEFORE INSERT ON manual_overrides
    FOR EACH ROW
    EXECUTE FUNCTION check_session_overrides_cap();

-- After insert trigger to mark is_flagged = true on session if count hits 10
CREATE OR REPLACE FUNCTION flag_session_on_override_cap()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM manual_overrides
    WHERE session_id = NEW.session_id;

    IF v_count = 10 THEN
        UPDATE attendance_sessions
        SET is_flagged = TRUE
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flag_session_on_override_cap
    AFTER INSERT ON manual_overrides
    FOR EACH ROW
    EXECUTE FUNCTION flag_session_on_override_cap();
