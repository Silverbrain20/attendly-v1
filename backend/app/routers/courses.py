import secrets
import string
from fastapi import APIRouter, HTTPException, Depends
from app.config.database import db
from app.schemas.validators import CourseCreate, RedeemInvite
from app.middleware.auth import get_current_user, get_class_rep_user

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.post("")
def create_course(data: CourseCreate, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT id FROM courses WHERE course_code = %s", (data.course_code.upper(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Course code already exists")

        cursor.execute(
            """
            INSERT INTO courses (course_code, course_title, created_by)
            VALUES (%s, %s, %s)
            RETURNING id, course_code, course_title, created_at
            """,
            (data.course_code.upper(), data.course_title, user["user_id"])
        )
        course = cursor.fetchone()

        cursor.execute(
            "INSERT INTO course_enrollments (user_id, course_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user["user_id"], course["id"])
        )

    return {"status": "success", "data": course}


@router.get("")
def list_my_courses(user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute(
            """
            SELECT c.id, c.course_code, c.course_title, c.created_at
            FROM courses c
            JOIN course_enrollments ce ON c.id = ce.course_id
            WHERE ce.user_id = %s
            """,
            (user["user_id"],)
        )
        courses = cursor.fetchall()
    return {"status": "success", "data": courses}


@router.get("/all")
def list_all_courses(user: dict = Depends(get_current_user)):
    with db.get_cursor() as cursor:
        cursor.execute("SELECT id, course_code, course_title FROM courses ORDER BY course_code")
        courses = cursor.fetchall()
    return {"status": "success", "data": courses}


@router.post("/enroll/{course_id}")
def enroll(course_id: str, user: dict = Depends(get_current_user)):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Course not found")

        cursor.execute(
            "INSERT INTO course_enrollments (user_id, course_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user["user_id"], course_id)
        )
    return {"status": "success", "message": "Enrolled successfully"}


@router.get("/{course_id}/students")
def list_course_students(course_id: str, user: dict = Depends(get_class_rep_user)):
    with db.get_cursor() as cursor:
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
    return {"status": "success", "data": students}


@router.post("/redeem-invite")
def redeem_invite(data: RedeemInvite, user: dict = Depends(get_current_user)):
    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "SELECT * FROM invite_codes WHERE code = %s AND used_by IS NULL",
            (data.code.upper(),)
        )
        invite = cursor.fetchone()

        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or already redeemed invite code")

        cursor.execute(
            "UPDATE invite_codes SET used_by = %s WHERE id = %s",
            (user["user_id"], invite["id"])
        )
        cursor.execute(
            "UPDATE users SET role = 'class_rep' WHERE id = %s",
            (user["user_id"],)
        )

    return {"status": "success", "message": "Successfully promoted to Class Representative. Please sign in again to activate your role."}


@router.post("/generate-invite")
def generate_invite(user: dict = Depends(get_class_rep_user)):
    alphabet = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(8))

    with db.get_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO invite_codes (code) VALUES (%s) RETURNING code, created_at",
            (code,)
        )
        result = cursor.fetchone()

    return {"status": "success", "data": {"code": result["code"], "created_at": result["created_at"]}}
