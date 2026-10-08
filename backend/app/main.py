import hashlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import config
from .db import connect
from .storage import storage_path
from .i18n import api_error, error_response, localize_version, request_language
from .play import router as play_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="RuleShelf admin API", version="0.1.0", lifespan=lifespan)
app.include_router(play_router)


@app.get("/api/ai/status")
def ai_status():
    return {
        "explanations": bool(config.OPENAI_API_KEY),
        "processing": bool(config.OPENAI_API_KEY) and config.AI_PROCESSING_ENABLED,
    }


@app.exception_handler(StarletteHTTPException)
async def localized_http_error(request, exception):
    detail = exception.detail if isinstance(exception.detail, dict) else {}
    return error_response(
        request,
        exception.status_code,
        detail.get("code", "request_failed"),
        detail.get("params"),
        exception.headers,
    )


@app.exception_handler(RequestValidationError)
async def localized_validation_error(request, exception):
    return error_response(request, 422, "validation_error")


@app.middleware("http")
async def same_origin(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        if origin and urlsplit(origin).netloc != request.headers.get("host"):
            return error_response(request, 403, "cross_origin")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Language"] = request_language(request)
    response.headers["Vary"] = "Accept-Language"
    return response


class GameInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=150)
    edition: str = Field(default="", max_length=150)
    language: str = Field(default="en", pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")
    description: str = Field(default="", max_length=3000)


class TextInput(BaseModel):
    title: str = Field(default="szabaly.md", min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=2_000_000)
    language: str = Field(default="en", pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")

    @field_validator("content")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Rule text must not be empty.")
        return value


@app.get("/api/health")
def health():
    try:
        with connect() as db:
            db.execute("SELECT 1 FROM schema_migrations LIMIT 1")
        return {"status": "ok"}
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)


GAME_QUERY = """
SELECT g.*, count(DISTINCT d.id)::int AS document_count,
 count(DISTINCT v.id) FILTER (WHERE v.status IN ('queued','processing'))::int AS processing_count,
 count(DISTINCT v.id) FILTER (WHERE v.status = 'published')::int AS published_count
FROM games g LEFT JOIN documents d ON d.game_id = g.id
LEFT JOIN versions v ON v.document_id = d.id
"""


@app.get("/api/games")
def games():
    with connect() as db:
        return db.execute(GAME_QUERY + " GROUP BY g.id ORDER BY g.created_at DESC").fetchall()


@app.post("/api/games", status_code=201)
def create_game(body: GameInput):
    with connect() as db:
        return db.execute(
            "INSERT INTO games(id,title,edition,language,description) VALUES (%s,%s,%s,%s,%s) RETURNING *",
            (uuid4(), body.title, body.edition, body.language, body.description),
        ).fetchone()


@app.patch("/api/games/{game_id}")
def edit_game(game_id: UUID, body: GameInput):
    with connect() as db:
        row = db.execute(
            "UPDATE games SET title=%s,edition=%s,language=%s,description=%s WHERE id=%s RETURNING *",
            (body.title, body.edition, body.language, body.description, game_id),
        ).fetchone()
        if not row:
            raise api_error(404, "game_not_found")
        return row


def ensure_game(db, game_id):
    if not db.execute("SELECT 1 FROM games WHERE id=%s", (game_id,)).fetchone():
        raise api_error(404, "game_not_found")


DOCUMENT_QUERY = """
SELECT d.id,d.game_id,d.filename,d.format,d.language,d.size_bytes,d.created_at,
 COALESCE(v.status,'uploaded') AS status,v.id AS version_id,v.stage,v.progress,v.error,
 COALESCE(v.ai_status,'none') AS ai_status,v.ai_error_code,
 v.page_count,v.character_count,v.processor,v.finished_at,
 (SELECT count(*)::int FROM chunks c WHERE c.version_id=v.id) AS chunk_count,
 (SELECT count(*)::int FROM assets a WHERE a.version_id=v.id) AS asset_count,
 EXISTS(SELECT 1 FROM versions pv WHERE pv.document_id=d.id AND pv.status='published') AS has_published,
 (SELECT pv.id FROM versions pv WHERE pv.document_id=d.id AND pv.status='published') AS published_version_id
FROM documents d LEFT JOIN LATERAL
 (SELECT * FROM versions WHERE document_id=d.id ORDER BY created_at DESC,id DESC LIMIT 1) v ON true
"""


@app.get("/api/games/{game_id}/documents")
def documents(game_id: UUID, request: Request):
    with connect() as db:
        ensure_game(db, game_id)
        rows = db.execute(
            DOCUMENT_QUERY + " WHERE d.game_id=%s ORDER BY d.created_at DESC", (game_id,)
        ).fetchall()
        return [localize_version(row, request_language(request)) for row in rows]


def save_document(game_id, filename, extension, language, content):
    if not content or not content.strip() and extension in {"txt", "md"}:
        raise api_error(400, "empty_document")
    digest = hashlib.sha256(content).hexdigest()
    document_id = uuid4()
    relative = f"sources/{document_id}.{extension}"
    path = storage_path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with connect() as db:
            ensure_game(db, game_id)
            path.write_bytes(content)
            row = db.execute(
                "INSERT INTO documents(id,game_id,filename,format,language,size_bytes,sha256,source_path) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (
                    document_id,
                    game_id,
                    filename,
                    extension,
                    language,
                    len(content),
                    digest,
                    relative,
                ),
            ).fetchone()
        return row
    except UniqueViolation:
        path.unlink(missing_ok=True)
        raise api_error(409, "duplicate_document")
    except Exception:
        path.unlink(missing_ok=True)
        raise


@app.post("/api/games/{game_id}/documents", status_code=201)
def upload_document(
    game_id: UUID,
    file: Annotated[UploadFile, File()],
    language: Annotated[str, Form(pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")] = "en",
):
    filename = (file.filename or "document").replace("\\", "/").rsplit("/", 1)[-1][:200]
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in {"pdf", "txt", "md", "png", "jpg", "jpeg", "webp"}:
        raise api_error(415, "unsupported_file")
    content = bytearray()
    while block := file.file.read(1024 * 1024):
        content.extend(block)
        if len(content) > config.MAX_UPLOAD_BYTES:
            raise api_error(413, "file_too_large", limit=config.MAX_UPLOAD_BYTES // 1024 // 1024)
    if extension == "pdf" and not bytes(content[:1024]).lstrip().startswith(b"%PDF-"):
        raise api_error(400, "invalid_pdf")
    if extension in {"txt", "md"}:
        try:
            bytes(content).decode("utf-8-sig")
        except UnicodeDecodeError:
            raise api_error(400, "invalid_encoding")
    return save_document(game_id, filename, extension, language, bytes(content))


@app.post("/api/games/{game_id}/documents/text", status_code=201)
def upload_text(game_id: UUID, body: TextInput):
    filename = Path(body.title.replace("\\", "/")).name
    if not filename.endswith(".md"):
        filename += ".md"
    content = body.content.encode("utf-8")
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise api_error(413, "text_too_long")
    return save_document(game_id, filename, "md", body.language, content)


@app.post("/api/documents/{document_id}/process", status_code=202)
def process_document(document_id: UUID):
    with connect() as db:
        document = db.execute(
            "SELECT id FROM documents WHERE id=%s FOR UPDATE", (document_id,)
        ).fetchone()
        if not document:
            raise api_error(404, "document_not_found")
        active = db.execute(
            "SELECT id FROM versions WHERE document_id=%s AND status IN ('queued','processing')",
            (document_id,),
        ).fetchone()
        if active:
            raise api_error(409, "processing_active")
        version_id = uuid4()
        db.execute(
            "INSERT INTO versions(id,document_id,stage) VALUES (%s,%s,'queued')",
            (version_id, document_id),
        )
        db.execute("INSERT INTO jobs(id,version_id) VALUES (%s,%s)", (uuid4(), version_id))
        return {"version_id": version_id, "status": "queued"}


@app.post("/api/documents/{document_id}/ai-process", status_code=202)
def ai_process_document(document_id: UUID):
    if not config.OPENAI_API_KEY or not config.AI_PROCESSING_ENABLED:
        raise api_error(409, "ai_not_configured")
    with connect() as db:
        if not db.execute(
            "SELECT id FROM documents WHERE id=%s FOR UPDATE", (document_id,)
        ).fetchone():
            raise api_error(404, "document_not_found")
        if db.execute(
            "SELECT 1 FROM versions WHERE document_id=%s AND status IN ('queued','processing')",
            (document_id,),
        ).fetchone():
            raise api_error(409, "processing_active")
        source = db.execute(
            "SELECT v.id FROM versions v WHERE v.document_id=%s AND v.status IN ('ready','published') "
            "AND EXISTS(SELECT 1 FROM chunks c WHERE c.version_id=v.id) "
            "ORDER BY v.created_at DESC,v.id DESC LIMIT 1",
            (document_id,),
        ).fetchone()
        if not source:
            raise api_error(409, "ai_requires_extraction")
        version_id = uuid4()
        db.execute(
            "INSERT INTO versions(id,document_id,stage) VALUES (%s,%s,'queued')",
            (version_id, document_id),
        )
        db.execute(
            "INSERT INTO jobs(id,version_id,kind,source_version_id) VALUES (%s,%s,'ai',%s)",
            (uuid4(), version_id, source["id"]),
        )
        return {"version_id": version_id, "status": "queued"}


@app.get("/api/versions/{version_id}/preview")
def preview(version_id: UUID, request: Request, q: str = "", offset: int = 0):
    if len(q) > 200 or offset < 0:
        raise api_error(400, "invalid_search")
    with connect() as db:
        version = db.execute("SELECT * FROM versions WHERE id=%s", (version_id,)).fetchone()
        if not version:
            raise api_error(404, "version_not_found")
        if q.strip():
            chunks = db.execute(
                "SELECT id,ordinal,heading,content,page,source_ref,translation_en,translation_hu FROM chunks WHERE version_id=%s AND search_vector @@ websearch_to_tsquery('simple',%s) ORDER BY ts_rank(search_vector,websearch_to_tsquery('simple',%s)) DESC,ordinal LIMIT 50 OFFSET %s",
                (version_id, q, q, offset),
            ).fetchall()
        else:
            chunks = db.execute(
                "SELECT id,ordinal,heading,content,page,source_ref,translation_en,translation_hu FROM chunks WHERE version_id=%s ORDER BY ordinal LIMIT 50 OFFSET %s",
                (version_id, offset),
            ).fetchall()
        assets = db.execute(
            "SELECT id,caption,page FROM assets WHERE version_id=%s ORDER BY ordinal", (version_id,)
        ).fetchall()
        count = db.execute(
            "SELECT count(*)::int AS n FROM chunks WHERE version_id=%s", (version_id,)
        ).fetchone()["n"]
        return {
            "version": localize_version(version, request_language(request)),
            "chunks": chunks,
            "assets": assets,
            "total_chunks": count,
        }


@app.post("/api/versions/{version_id}/publish")
def publish(version_id: UUID):
    with connect() as db:
        row = db.execute("SELECT document_id FROM versions WHERE id=%s", (version_id,)).fetchone()
        if not row:
            raise api_error(404, "version_not_found")
        db.execute("SELECT id FROM documents WHERE id=%s FOR UPDATE", (row["document_id"],))
        version = db.execute(
            "SELECT status FROM versions WHERE id=%s FOR UPDATE", (version_id,)
        ).fetchone()
        if version["status"] not in {"ready", "published"}:
            raise api_error(409, "publish_not_ready")
        db.execute(
            "UPDATE versions SET status='ready', published_at=NULL WHERE document_id=%s AND status='published' AND id<>%s",
            (row["document_id"], version_id),
        )
        db.execute(
            "UPDATE versions SET status='published',published_at=now() WHERE id=%s", (version_id,)
        )
        return {"status": "published"}


@app.get("/api/documents/{document_id}/source")
def source(document_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT source_path,filename FROM documents WHERE id=%s", (document_id,)
        ).fetchone()
    if not row:
        raise api_error(404, "document_not_found")
    return FileResponse(storage_path(row["source_path"]), filename=row["filename"])


@app.get("/api/assets/{asset_id}")
def asset(asset_id: UUID):
    with connect() as db:
        row = db.execute("SELECT path FROM assets WHERE id=%s", (asset_id,)).fetchone()
    if not row:
        raise api_error(404, "asset_not_found")
    return FileResponse(storage_path(row["path"]), media_type="image/png")
