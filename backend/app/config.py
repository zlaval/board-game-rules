import os
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://rules:rules@localhost:5432/rules")
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "50")) * 1024 * 1024
MAX_DOCUMENT_PAGES = int(os.environ.get("MAX_DOCUMENT_PAGES", "100"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
OPENAI_ANSWER_MODEL = os.environ.get("OPENAI_ANSWER_MODEL", "gpt-4.1-mini")
OPENAI_TRANSCRIPTION_MODEL = os.environ.get("OPENAI_TRANSCRIPTION_MODEL", "gpt-transcribe")
MAX_AUDIO_BYTES = 10 * 1024 * 1024
AI_CONTEXT_CHARACTERS = 32_000
PLAYER_REQUESTS_PER_MINUTE = 12
