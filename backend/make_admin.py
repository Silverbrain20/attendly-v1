import sys
import os

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.config.database import db

def promote_user_to_admin(identifier=None, role="class_rep"):
    with db.get_cursor(commit=True) as cursor:
        if not identifier:
            # List current users
            cursor.execute("SELECT id, email, full_name, matric_number, role FROM users ORDER BY created_at DESC LIMIT 10;")
            users = cursor.fetchall()
            print("--- REGISTERED USERS IN DATABASE ---")
            if not users:
                print("No registered users found.")
            for u in users:
                print(f"Name: {u['full_name']} | Email: {u['email']} | Matric: {u['matric_number']} | Role: {u['role']}")
            print("\nUsage: python make_admin.py <email_or_matric> [class_rep|student]")
            return

        identifier = identifier.strip()
        role = role.strip().lower()
        if role not in ("class_rep", "student"):
            role = "class_rep"

        cursor.execute(
            "SELECT id, email, full_name, role FROM users WHERE email = %s OR matric_number = %s",
            (identifier, identifier)
        )
        user = cursor.fetchone()

        if not user:
            print(f"ERROR: No user found matching email/matric '{identifier}'")
            return

        cursor.execute(
            "UPDATE users SET role = %s WHERE id = %s",
            (role, user["id"])
        )
        print(f"SUCCESS: Updated {user['full_name']} ({user['email']}) to '{role}' role!")
        print("Note: Please re-login to activate the session.")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    role_arg = sys.argv[2] if len(sys.argv) > 2 else "class_rep"
    promote_user_to_admin(target, role_arg)

