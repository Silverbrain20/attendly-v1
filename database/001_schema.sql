-- ============================================
-- Attendly Database Schema
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Roles Check Constraint values
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    matric_number TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'class_rep')),
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_otp TEXT,
    email_verification_expires TIMESTAMPTZ,
    password_reset_otp TEXT,
    password_reset_expires TIMESTAMPTZ,
    device_fingerprint JSONB, -- stores {user_agent, screen_resolution, timezone}
    device_verification_otp TEXT,
    device_verification_expires TIMESTAMPTZ,
    refresh_token_hash TEXT,
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code TEXT UNIQUE NOT NULL,
    course_title TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- session UUID
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_point GEOGRAPHY(Point, 4326),
    geofence_radius_m INTEGER NOT NULL DEFAULT 100,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE, -- Flagged for review when overrides >= 10
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_point GEOGRAPHY(Point, 4326),
    distance_meters DOUBLE PRECISION,
    is_within_geofence BOOLEAN NOT NULL DEFAULT FALSE,
    is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    user_agent TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, student_id)
);

-- Immutable manual overrides table
CREATE TABLE manual_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    overridden_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, student_id)
);

CREATE TABLE invite_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial trigger for attendance sessions
CREATE OR REPLACE FUNCTION set_session_geography()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_session_geography
    BEFORE INSERT OR UPDATE OF latitude, longitude ON attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_session_geography();

-- Spatial trigger for attendance records
CREATE OR REPLACE FUNCTION set_record_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_record_geography
    BEFORE INSERT OR UPDATE OF latitude, longitude ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION set_record_geography();

-- Prevent updates or deletes on manual overrides
CREATE OR REPLACE FUNCTION prevent_override_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'manual_overrides table is immutable. Modifications and deletions are prohibited.'
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_override_update
    BEFORE UPDATE ON manual_overrides
    FOR EACH ROW
    EXECUTE FUNCTION prevent_override_mutation();

CREATE TRIGGER trg_prevent_override_delete
    BEFORE DELETE ON manual_overrides
    FOR EACH ROW
    EXECUTE FUNCTION prevent_override_mutation();

-- Indexes for optimal lookup performance
CREATE INDEX idx_sessions_location ON attendance_sessions USING GIST (location_point);
CREATE INDEX idx_records_location ON attendance_records USING GIST (location_point);
CREATE INDEX idx_users_matric ON users (matric_number);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_records_session_student ON attendance_records (session_id, student_id);
CREATE INDEX idx_overrides_session_student ON manual_overrides (session_id, student_id);
