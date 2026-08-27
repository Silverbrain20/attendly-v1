import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from app.config.settings import settings
import time

class Database:
    def __init__(self):
        self.pool = None
        self.connect()

    def connect(self, retries=3):
        attempt = 0
        while attempt < retries:
            try:
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=20,
                    dsn=settings.DATABASE_URL
                )
                print("Connected to database successfully")
                return
            except Exception as e:
                attempt += 1
                print(f"Error connecting to database (attempt {attempt}/{retries}): {e}")
                if attempt < retries:
                    time.sleep(2 * attempt)
        raise RuntimeError("Could not connect to PostgreSQL database after multiple attempts.")

    @contextmanager
    def get_connection(self):
        conn = self.pool.getconn()
        try:
            yield conn
        finally:
            self.pool.putconn(conn)

    @contextmanager
    def get_cursor(self, commit=True):
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cursor.close()

db = Database()

# Initialize Supabase Python Client (supabase-py) for Auth & OTP management
from supabase import create_client, Client
_sb_url = settings.EFFECTIVE_SUPABASE_URL or settings.SUPABASE_URL or "https://placeholder.supabase.co"
_sb_key = settings.SUPABASE_KEY or "placeholder-key"
supabase: Client = create_client(_sb_url, _sb_key)

