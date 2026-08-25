import sys
import os

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.config.database import db

def promote_user_to_admin(identifier=None):
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
            print("\nTo promote a user, run: python make_admin.py <email_or_matric>")
            return

        identifier = identifier.strip()
        cursor.execute(
            "SELECT id, email, full_name, role FROM users WHERE email = %s OR matric_number = %s",
            (identifier, identifier)
        )
        user = cursor.fetchone()

        if not user:
            print(f"ERROR: No user found matching email/matric '{identifier}'")
            return

        cursor.execute(
            "UPDATE users SET role = 'class_rep' WHERE id = %s",
            (user["id"],)
        )
        print(f"SUCCESS: Promoted {user['full_name']} ({user['email']}) to Class Representative (class_rep / admin) role!")
        print("Note: Please re-login to activate the admin session.")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    promote_user_to_admin(target)
