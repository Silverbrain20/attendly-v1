import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from app.config.settings import settings
import time


class Database:
    def __init__(self):
        self.pool = None
        self.connect()

    def connect(self, retries=3):
        for attempt in range(1, retries + 1):
            try:
                self.pool = ThreadedConnectionPool(
                    minconn=2,
                    maxconn=10,   # Supabase free-tier pooler allows ~15; stay at 10 to leave headroom
                    dsn=settings.DATABASE_URL,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5,
                    connect_timeout=10,
                )
                print("Connected to database successfully")
                return
            except Exception as e:
                print(f"DB connect attempt {attempt}/{retries}: {e}")
                if attempt < retries:
                    time.sleep(2 * attempt)
        raise RuntimeError("Could not connect to PostgreSQL after multiple attempts.")

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

# Supabase Python Client for Auth & OTP management
from supabase import create_client, Client

_sb_url = settings.EFFECTIVE_SUPABASE_URL or settings.SUPABASE_URL or "https://placeholder.supabase.co"
_sb_key = settings.SUPABASE_KEY or "placeholder-key"
supabase: Client = create_client(_sb_url, _sb_key)
