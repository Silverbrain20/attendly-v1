import sys
import os

# Add backend root to sys.path for Vercel Python runtime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
