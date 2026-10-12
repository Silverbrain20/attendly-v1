-- Run after 001_schema.sql and 002_functions.sql, including on existing databases.
-- Safe to run again; no existing attendance records are removed.
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'allow',
    ADD COLUMN IF NOT EXISTS client_ip TEXT;
