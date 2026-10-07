import os
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://rules:rules@localhost:5432/rules")
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "50")) * 1024 * 1024
MAX_DOCUMENT_PAGES = int(os.environ.get("MAX_DOCUMENT_PAGES", "100"))
