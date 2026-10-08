import os
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://rules:rules@localhost:5432/rules")
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "50")) * 1024 * 1024
MAX_DOCUMENT_PAGES = int(os.environ.get("MAX_DOCUMENT_PAGES", "100"))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
OPENAI_ANSWER_MODEL = os.environ.get("OPENAI_ANSWER_MODEL", "gpt-6-luna")
OPENAI_PROCESSING_MODEL = os.environ.get("OPENAI_PROCESSING_MODEL", OPENAI_ANSWER_MODEL)
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
AI_PROCESSING_ENABLED = os.environ.get("AI_PROCESSING_ENABLED", "true").lower() == "true"
AI_MAX_CHUNKS = int(os.environ.get("AI_MAX_CHUNKS", "2000"))
AI_MAX_CHARACTERS = int(os.environ.get("AI_MAX_CHARACTERS", "600000"))
EMBEDDING_DIMENSIONS = 1536
OPENAI_TRANSCRIPTION_MODEL = os.environ.get("OPENAI_TRANSCRIPTION_MODEL", "gpt-transcribe")
MAX_AUDIO_BYTES = 10 * 1024 * 1024
AI_CONTEXT_CHARACTERS = 32_000
PLAYER_REQUESTS_PER_MINUTE = 12
