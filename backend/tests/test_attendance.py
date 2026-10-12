"""Regression tests. RUN_DB_TESTS=1 also checks PostgreSQL in a rolled-back schema.

Run from backend: .venv/Scripts/python.exe -m unittest discover -s tests -v
"""
import csv
import io
import os
from pathlib import Path
import sys
import types
import unittest
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

if os.getenv("RUN_DB_TESTS") != "1":
    os.environ.setdefault("DATABASE_URL", "postgresql://unused/test")
    os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret-not-for-production")
    os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret-not-for-production")

# No real pool, Supabase requests, or production writes during API unit tests.
database_module = types.ModuleType("app.config.database")
database_module.db = MagicMock()
database_module.supabase = MagicMock()
sys.modules["app.config.database"] = database_module
from app.middleware.auth import get_current_user
from app.routers import attendance, courses, export, overrides, sessions
from app.utils.risk import calculate_risk_score, haversine_distance

app = FastAPI()
for module in (attendance, courses, export, overrides, sessions):
    app.include_router(module.router)

REP = {"user_id": str(uuid4()), "role": "class_rep"}
STUDENT = {"user_id": str(uuid4()), "role": "student"}
OTHER = {"user_id": str(uuid4()), "role": "class_rep"}
COURSE, SESSION = str(uuid4()), str(uuid4())


class APIRegressionTests(unittest.TestCase):
    def setUp(self):
        self.cursor = MagicMock()
        database_module.db.reset_mock()
        database_module.db.get_cursor.return_value.__enter__.return_value = self.cursor
        self.user = STUDENT
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app, raise_server_exceptions=False)
        self.body = dict(session_id=SESSION, latitude=6.5, longitude=3.4, gps_accuracy=8)
        self.session = dict(id=SESSION, course_id=COURSE, created_by=REP["user_id"],
                            center_lat=6.5, center_lng=3.4, geofence_radius_m=50,
                            start_time=datetime.now(timezone.utc)-timedelta(minutes=1),
                            ended_at=None)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()

    def test_check_in_saves_real_accuracy_and_risk(self):
        self.cursor.fetchone.side_effect = [self.session, {"success": True, "message": "Recorded"}]
        self.cursor.fetchall.return_value = []
        self.body["gps_accuracy"] = 80
        response = self.client.post("/api/attendance/mark", json=self.body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["risk_score"], 10)
        self.assertEqual(self.cursor.execute.call_args.args[1][0], 10)

    def test_representative_cannot_bypass_geofence(self):
        self.user = REP
        self.cursor.fetchone.return_value = self.session
        self.body["latitude"] = 7
        response = self.client.post("/api/attendance/mark", json=self.body)
        self.assertEqual(response.status_code, 403)

    def test_closed_session_rejected(self):
        self.session["ended_at"] = datetime.now(timezone.utc)
        self.cursor.fetchone.return_value = self.session
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body).status_code, 400)

    def test_invalid_coordinates_and_accuracy_rejected_before_database(self):
        for changes in ({"latitude": 91}, {"longitude": -181}, {"gps_accuracy": -1},
                        {"latitude": "NaN"}, {"gps_accuracy": "Infinity"}):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.post("/api/attendance/mark", json=self.body | changes).status_code, 422)
        del self.body["gps_accuracy"]
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body).status_code, 422)
        database_module.db.get_cursor.assert_not_called()

    def test_risk_write_failure_never_reports_success(self):
        self.cursor.fetchone.side_effect = [self.session, {"success": True, "message": "Recorded"}]
        self.cursor.fetchall.return_value = []
        def execute(sql, params):
            if "UPDATE attendance_records" in sql:
                raise RuntimeError("Risk persistence failed")
        self.cursor.execute.side_effect = execute
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body).status_code, 500)

    def test_students_cannot_read_rosters_or_override_audits(self):
        for url in (f"/api/attendance/session/{SESSION}", f"/api/courses/{COURSE}/students",
                    f"/api/overrides/session/{SESSION}", f"/api/overrides/session/{SESSION}/count",
                    f"/api/export/session/{SESSION}", f"/api/export/course/{COURSE}"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)
        database_module.db.get_cursor.assert_not_called()

    def test_unrelated_representative_cannot_access_or_modify_session(self):
        self.user = OTHER
        self.cursor.fetchone.return_value = {"created_by": REP["user_id"], "course_created_by": REP["user_id"]}
        for url in (f"/api/attendance/session/{SESSION}", f"/api/overrides/session/{SESSION}",
                    f"/api/overrides/session/{SESSION}/count", f"/api/export/session/{SESSION}",
                    f"/api/courses/{COURSE}/students", f"/api/export/course/{COURSE}"):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)
        body = dict(session_id=SESSION, student_id=STUDENT["user_id"], reason="GPS unavailable today")
        self.assertEqual(self.client.post("/api/overrides", json=body).status_code, 403)
        self.assertEqual(self.client.post("/api/sessions", json=dict(course_id=COURSE, latitude=6.5,
                            longitude=3.4, duration_minutes=30)).status_code, 403)

    def test_owner_can_read_attendance(self):
        self.user = REP
        self.cursor.fetchone.return_value = {"created_by": REP["user_id"], "course_created_by": OTHER["user_id"]}
        self.cursor.fetchall.return_value = [{"full_name": "Student", "risk_level": "flag"}]
        response = self.client.get(f"/api/attendance/session/{SESSION}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"][0]["risk_level"], "flag")

    def test_advisory_risk_levels_are_reachable(self):
        start = datetime.now(timezone.utc)-timedelta(seconds=1)
        for distance, accuracy, ips, score, level in (
            (0, 8, [], 15, "allow"), (45, 8, [], 30, "flag"),
            (45, 80, ["same"]*4, 60, "flag_high"),
        ):
            self.assertEqual(calculate_risk_score(distance, accuracy, start, "same", ips)[::2], (score, level))
        self.assertAlmostEqual(haversine_distance(6.5, 3.4, 6.5, 3.4), 0)


@unittest.skipUnless(os.getenv("RUN_DB_TESTS") == "1", "Set RUN_DB_TESTS=1 for PostgreSQL checks")
class PostgreSQLIntegrationTests(unittest.TestCase):
    def setUp(self):
        import psycopg2
        from psycopg2 import sql
        from psycopg2.extras import RealDictCursor
        from app.config.settings import settings
        self.conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=10)
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.conn.cursor_factory = RealDictCursor
        schema = "attendly_test_" + uuid4().hex
        with self.conn.cursor() as cur:
            cur.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
            cur.execute("""SELECT DISTINCT n.nspname FROM pg_extension e
                           JOIN pg_namespace n ON n.oid=e.extnamespace
                           WHERE e.extname IN ('uuid-ossp', 'postgis', 'pgcrypto')""")
            extension_schemas = [row["nspname"] for row in cur.fetchall()]
            search_path = [schema, "public"] + [s for s in extension_schemas if s != "public"]
            cur.execute(sql.SQL("SET LOCAL search_path TO {}").format(
                sql.SQL(", ").join(sql.Identifier(s) for s in search_path)))
            root = Path(__file__).resolve().parents[2] / "database"
            for filename in ("001_schema.sql", "002_functions.sql", "002_functions.sql",
                             "003_attendance_risk.sql", "003_attendance_risk.sql"):
                content = (root / filename).read_text(encoding="utf-8")
                # Extensions already exist; never install extensions in the configured database.
                content = "\n".join(line for line in content.splitlines() if not line.startswith("CREATE EXTENSION"))
                cur.execute(content)
            for user, matric in ((REP, "rep"), (STUDENT, "student"), (OTHER, "other")):
                cur.execute("""INSERT INTO users(id,email,password_hash,full_name,matric_number,phone_number,role)
                               VALUES (%s,%s,'test','Test User',%s,%s,%s)""",
                            (user["user_id"], matric+"@example.com", matric, matric, user["role"]))
            cur.execute("INSERT INTO courses(id,course_code,course_title,created_by) VALUES (%s,'TEST101','Test',%s)", (COURSE, REP["user_id"]))
            cur.execute("INSERT INTO course_enrollments(user_id,course_id) VALUES (%s,%s)", (REP["user_id"], COURSE))
            cur.execute("""INSERT INTO attendance_sessions(id,course_id,created_by,latitude,longitude,start_time,end_time)
                           VALUES (%s,%s,%s,6.5,3.4,NOW()-INTERVAL '1 minute',NOW()+INTERVAL '30 minutes')""", (SESSION, COURSE, REP["user_id"]))

        @contextmanager
        def get_cursor(commit=True):
            # Savepoints emulate request transaction rollback without committing the test schema.
            with self.conn.cursor() as cur:
                cur.execute("SAVEPOINT request_test")
                try:
                    yield cur
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT request_test")
                    raise
                finally:
                    cur.execute("RELEASE SAVEPOINT request_test")
        self.patch = patch.object(database_module.db, "get_cursor", side_effect=get_cursor)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.user = STUDENT
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app, raise_server_exceptions=True)
        self.addCleanup(self.client.close)
        self.body = dict(session_id=SESSION, latitude=6.5, longitude=3.4, gps_accuracy=80)

    def test_real_check_in_duplicate_expiry_and_report(self):
        response = self.client.post("/api/attendance/mark", json=self.body)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["risk_score"], 10)
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body).status_code, 400)
        with self.conn.cursor() as cur:
            cur.execute("SELECT risk_score,risk_factors,client_ip FROM attendance_records WHERE session_id=%s", (SESSION,))
            record = cur.fetchone()
            self.assertEqual(record["risk_score"], 10)
            self.assertTrue(record["risk_factors"])
            self.assertIsNotNone(record["client_ip"])
        self.user = REP
        response = self.client.get(f"/api/export/course/{COURSE}")
        self.assertEqual(response.status_code, 200, response.text)
        rows = list(csv.DictReader(io.StringIO(response.text)))
        self.assertTrue(all(row["Attended Classes"] == "0" for row in rows))
        with self.conn.cursor() as cur:
            cur.execute("UPDATE attendance_sessions SET end_time=NOW()-INTERVAL '1 second' WHERE id=%s", (SESSION,))
        self.user = OTHER
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body).status_code, 400)
        self.user = REP
        response = self.client.get(f"/api/export/course/{COURSE}")
        rows = list(csv.DictReader(io.StringIO(response.text)))
        student = next(row for row in rows if row["Matric Number"] == "student")
        self.assertEqual(student["Attendance Rate (%)"], "100.0%")
        response = self.client.get(f"/api/export/session/{SESSION}")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("Poor GPS accuracy", response.text)

    def test_real_permissions_and_location_checks(self):
        self.user = OTHER
        for path in (f"/api/attendance/session/{SESSION}", f"/api/overrides/session/{SESSION}",
                     f"/api/export/session/{SESSION}", f"/api/courses/{COURSE}/students"):
            self.assertEqual(self.client.get(path).status_code, 403)
        self.user = REP
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body | {"latitude": 7}).status_code, 403)
        self.assertEqual(self.client.get(f"/api/courses/{COURSE}/students").status_code, 200)
        self.assertEqual(self.client.get("/api/courses").status_code, 200)
        self.user = STUDENT
        self.assertEqual(self.client.post("/api/attendance/mark", json=self.body | {"latitude": 7}).status_code, 403)
        with self.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM attendance_records")
            self.assertEqual(cur.fetchone()["count"], 0)

    def test_real_override_cap_and_immutable_audit(self):
        self.user = REP
        for index in range(11):
            student_id = str(uuid4())
            with self.conn.cursor() as cur:
                cur.execute("""INSERT INTO users(id,email,password_hash,full_name,matric_number,phone_number)
                               VALUES (%s,%s,'test','Test',%s,%s)""",
                            (student_id, f"test{index}@example.com", f"test{index}", f"test{index}"))
                cur.execute("INSERT INTO course_enrollments(user_id,course_id) VALUES (%s,%s)", (student_id, COURSE))
            response = self.client.post("/api/overrides", json=dict(session_id=SESSION,
                            student_id=student_id, reason="Device GPS unavailable"))
            self.assertEqual(response.status_code, 200 if index < 10 else 400, response.text)
        with self.conn.cursor() as cur:
            cur.execute("SELECT is_flagged FROM attendance_sessions WHERE id=%s", (SESSION,))
            self.assertTrue(cur.fetchone()["is_flagged"])
            cur.execute("SELECT COUNT(*) AS count FROM manual_overrides")
            self.assertEqual(cur.fetchone()["count"], 10)
            for statement in ("UPDATE manual_overrides SET reason='Changed'", "DELETE FROM manual_overrides"):
                cur.execute("SAVEPOINT immutable_test")
                with self.assertRaises(Exception):
                    cur.execute(statement)
                cur.execute("ROLLBACK TO SAVEPOINT immutable_test")
                cur.execute("RELEASE SAVEPOINT immutable_test")

    def test_atomic_function_handles_missing_unenrolled_and_outside(self):
        with self.conn.cursor() as cur:
            for session_id, latitude, expected in (
                (str(uuid4()), 6.5, "Session not found"),
                (SESSION, 6.5, "Student is not enrolled in this course"),
            ):
                cur.execute("SELECT * FROM mark_attendance_atomic(%s,%s,%s,3.4,'test')",
                            (session_id, STUDENT["user_id"], latitude))
                result = cur.fetchone()
                self.assertFalse(result["success"])
                self.assertEqual(result["message"], expected)
            cur.execute("INSERT INTO course_enrollments(user_id,course_id) VALUES (%s,%s)",
                        (STUDENT["user_id"], COURSE))
            cur.execute("SELECT * FROM mark_attendance_atomic(%s,%s,7.0,3.4,'test')",
                        (SESSION, STUDENT["user_id"]))
            result = cur.fetchone()
            self.assertFalse(result["success"])
            self.assertEqual(result["message"], "Outside geofence boundary")


if __name__ == "__main__":
    unittest.main()
