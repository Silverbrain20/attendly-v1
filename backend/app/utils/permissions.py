from fastapi import HTTPException


def require_course_owner(cursor, course_id: str, user: dict):
    cursor.execute("SELECT created_by FROM courses WHERE id = %s", (course_id,))
    course = cursor.fetchone()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.get("role") != "class_rep" or str(course["created_by"]) != str(user["user_id"]):
        raise HTTPException(status_code=403, detail="Only the course creator can manage this course")


def require_session_owner(cursor, session_id: str, user: dict):
    cursor.execute(
        """SELECT s.created_by, c.created_by AS course_created_by
           FROM attendance_sessions s JOIN courses c ON c.id = s.course_id
           WHERE s.id = %s""",
        (session_id,),
    )
    session = cursor.fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    owners = {str(session["created_by"]), str(session["course_created_by"])}
    if user.get("role") != "class_rep" or str(user["user_id"]) not in owners:
        raise HTTPException(status_code=403, detail="Only the session or course creator can manage this session")
