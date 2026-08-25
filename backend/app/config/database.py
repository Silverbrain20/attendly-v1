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

    def connect(self):
        try:
            self.pool = SimpleConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=settings.DATABASE_URL
            )
            print("Connected to database successfully")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            time.sleep(2)
            # Retry
            self.connect()

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
            # RealDictCursor allows accessing row values like a dictionary
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
