import hashlib
import hmac
import logging
import secrets
import threading
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import config
from .db import connect
from .storage import storage_path

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    if len(config.ADMIN_PASSWORD) < 12:
        raise RuntimeError(
            "ADMIN_PASSWORD must contain at least 12 characters. Run infra/setup.ps1 or infra/setup.sh."
        )
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Szabálytár admin API", version="0.1.0", lifespan=lifespan)
login_attempts = defaultdict(deque)
login_lock = threading.Lock()


@app.middleware("http")
async def same_origin(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        if origin and urlsplit(origin).netloc != request.headers.get("host"):
            return JSONResponse(
                {"detail": "Eltérő eredetű kérés nem engedélyezett."}, status_code=403
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def require_admin(request: Request):
    token = request.cookies.get("rules_session", "")
    with connect() as db:
        session = db.execute(
            "SELECT 1 FROM sessions WHERE token_hash = %s AND expires_at > now()",
            (token_hash(token),),
        ).fetchone()
    if not session:
        raise HTTPException(401, "Jelentkezz be az adminfelület használatához.")


Admin = Annotated[None, Depends(require_admin)]


class Login(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=500)


class GameInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=150)
    edition: str = Field(default="", max_length=150)
    language: str = Field(default="hu", pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")
    description: str = Field(default="", max_length=3000)


class TextInput(BaseModel):
    title: str = Field(default="szabaly.md", min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=2_000_000)
    language: str = Field(default="hu", pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")

    @field_validator("content")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("A szabály szövege nem lehet üres.")
        return value


@app.get("/api/health")
def health():
    try:
        with connect() as db:
            db.execute("SELECT 1 FROM schema_migrations LIMIT 1")
        return {"status": "ok"}
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)


@app.post("/api/auth/login")
def login(body: Login, request: Request, response: Response):
    address = request.client.host if request.client else "unknown"
    with login_lock:
        attempts = login_attempts[address]
        now = time.monotonic()
        while attempts and attempts[0] < now - 60:
            attempts.popleft()
        if len(attempts) >= 10:
            raise HTTPException(429, "Túl sok belépési kísérlet. Próbáld újra egy perc múlva.")
    if not (
        hmac.compare_digest(body.username.encode(), config.ADMIN_USERNAME.encode())
        & hmac.compare_digest(body.password.encode(), config.ADMIN_PASSWORD.encode())
    ):
        with login_lock:
            attempts.append(now)
        raise HTTPException(401, "Hibás felhasználónév vagy jelszó.")
    token = secrets.token_urlsafe(32)
    with connect() as db:
        db.execute("DELETE FROM sessions WHERE expires_at < now()")
        db.execute(
            "INSERT INTO sessions(token_hash, expires_at) VALUES (%s, now() + interval '12 hours')",
            (token_hash(token),),
        )
    response.set_cookie(
        "rules_session",
        token,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite="strict",
        max_age=43200,
        path="/",
    )
    return {"username": config.ADMIN_USERNAME}


@app.get("/api/auth/me")
def me(admin: Admin):
    return {"username": config.ADMIN_USERNAME}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    with connect() as db:
        db.execute(
            "DELETE FROM sessions WHERE token_hash = %s",
            (token_hash(request.cookies.get("rules_session", "")),),
        )
    response.delete_cookie("rules_session", path="/")
    return {"ok": True}


GAME_QUERY = """
SELECT g.*, count(DISTINCT d.id)::int AS document_count,
 count(DISTINCT v.id) FILTER (WHERE v.status IN ('queued','processing'))::int AS processing_count,
 count(DISTINCT v.id) FILTER (WHERE v.status = 'published')::int AS published_count
FROM games g LEFT JOIN documents d ON d.game_id = g.id
LEFT JOIN versions v ON v.document_id = d.id
"""


@app.get("/api/games")
def games(admin: Admin):
    with connect() as db:
        return db.execute(GAME_QUERY + " GROUP BY g.id ORDER BY g.created_at DESC").fetchall()


@app.post("/api/games", status_code=201)
def create_game(body: GameInput, admin: Admin):
    with connect() as db:
        return db.execute(
            "INSERT INTO games(id,title,edition,language,description) VALUES (%s,%s,%s,%s,%s) RETURNING *",
            (uuid4(), body.title, body.edition, body.language, body.description),
        ).fetchone()


@app.patch("/api/games/{game_id}")
def edit_game(game_id: UUID, body: GameInput, admin: Admin):
    with connect() as db:
        row = db.execute(
            "UPDATE games SET title=%s,edition=%s,language=%s,description=%s WHERE id=%s RETURNING *",
            (body.title, body.edition, body.language, body.description, game_id),
        ).fetchone()
        if not row:
            raise HTTPException(404, "A játék nem található.")
        return row


def ensure_game(db, game_id):
    if not db.execute("SELECT 1 FROM games WHERE id=%s", (game_id,)).fetchone():
        raise HTTPException(404, "A játék nem található.")


DOCUMENT_QUERY = """
SELECT d.id,d.game_id,d.filename,d.format,d.language,d.size_bytes,d.created_at,
 COALESCE(v.status,'uploaded') AS status,v.id AS version_id,v.stage,v.progress,v.error,
 v.page_count,v.character_count,v.processor,v.finished_at,
 (SELECT count(*)::int FROM chunks c WHERE c.version_id=v.id) AS chunk_count,
 (SELECT count(*)::int FROM assets a WHERE a.version_id=v.id) AS asset_count,
 EXISTS(SELECT 1 FROM versions pv WHERE pv.document_id=d.id AND pv.status='published') AS has_published,
 (SELECT pv.id FROM versions pv WHERE pv.document_id=d.id AND pv.status='published') AS published_version_id
FROM documents d LEFT JOIN LATERAL
 (SELECT * FROM versions WHERE document_id=d.id ORDER BY created_at DESC,id DESC LIMIT 1) v ON true
"""


@app.get("/api/games/{game_id}/documents")
def documents(game_id: UUID, admin: Admin):
    with connect() as db:
        ensure_game(db, game_id)
        return db.execute(
            DOCUMENT_QUERY + " WHERE d.game_id=%s ORDER BY d.created_at DESC", (game_id,)
        ).fetchall()


def save_document(game_id, filename, extension, language, content):
    if not content or not content.strip() and extension in {"txt", "md"}:
        raise HTTPException(400, "Üres dokumentum nem tölthető fel.")
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
        raise HTTPException(409, "Ezt a dokumentumot már feltöltötted ehhez a játékhoz.")
    except Exception:
        path.unlink(missing_ok=True)
        raise


@app.post("/api/games/{game_id}/documents", status_code=201)
def upload_document(
    game_id: UUID,
    admin: Admin,
    file: Annotated[UploadFile, File()],
    language: Annotated[str, Form(pattern=r"^[a-z]{2,3}(-[A-Za-z]{2,4})?$")] = "hu",
):
    filename = (file.filename or "document").replace("\\", "/").rsplit("/", 1)[-1][:200]
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in {"pdf", "txt", "md", "png", "jpg", "jpeg", "webp"}:
        raise HTTPException(415, "PDF, TXT, Markdown, PNG, JPG vagy WebP fájlt válassz.")
    content = bytearray()
    while block := file.file.read(1024 * 1024):
        content.extend(block)
        if len(content) > config.MAX_UPLOAD_BYTES:
            raise HTTPException(
                413, f"A fájl legfeljebb {config.MAX_UPLOAD_BYTES // 1024 // 1024} MB lehet."
            )
    if extension == "pdf" and not bytes(content[:1024]).lstrip().startswith(b"%PDF-"):
        raise HTTPException(400, "A fájl nem érvényes PDF.")
    if extension in {"txt", "md"}:
        try:
            bytes(content).decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(400, "A szöveges fájlt UTF-8 kódolással mentsd el.")
    return save_document(game_id, filename, extension, language, bytes(content))


@app.post("/api/games/{game_id}/documents/text", status_code=201)
def upload_text(game_id: UUID, body: TextInput, admin: Admin):
    filename = Path(body.title.replace("\\", "/")).name
    if not filename.endswith(".md"):
        filename += ".md"
    content = body.content.encode("utf-8")
    if len(content) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Túl hosszú szabályszöveg.")
    return save_document(game_id, filename, "md", body.language, content)


@app.post("/api/documents/{document_id}/process", status_code=202)
def process_document(document_id: UUID, admin: Admin):
    with connect() as db:
        document = db.execute(
            "SELECT id FROM documents WHERE id=%s FOR UPDATE", (document_id,)
        ).fetchone()
        if not document:
            raise HTTPException(404, "A dokumentum nem található.")
        active = db.execute(
            "SELECT id FROM versions WHERE document_id=%s AND status IN ('queued','processing')",
            (document_id,),
        ).fetchone()
        if active:
            raise HTTPException(409, "A dokumentum feldolgozása már folyamatban van.")
        version_id = uuid4()
        db.execute("INSERT INTO versions(id,document_id) VALUES (%s,%s)", (version_id, document_id))
        db.execute("INSERT INTO jobs(id,version_id) VALUES (%s,%s)", (uuid4(), version_id))
        return {"version_id": version_id, "status": "queued"}


@app.get("/api/versions/{version_id}/preview")
def preview(version_id: UUID, admin: Admin, q: str = "", offset: int = 0):
    if len(q) > 200 or offset < 0:
        raise HTTPException(400, "Érvénytelen keresés vagy lapozás.")
    with connect() as db:
        version = db.execute("SELECT * FROM versions WHERE id=%s", (version_id,)).fetchone()
        if not version:
            raise HTTPException(404, "A feldolgozott változat nem található.")
        if q.strip():
            chunks = db.execute(
                "SELECT id,ordinal,heading,content,page,source_ref FROM chunks WHERE version_id=%s AND search_vector @@ websearch_to_tsquery('simple',%s) ORDER BY ts_rank(search_vector,websearch_to_tsquery('simple',%s)) DESC,ordinal LIMIT 50 OFFSET %s",
                (version_id, q, q, offset),
            ).fetchall()
        else:
            chunks = db.execute(
                "SELECT id,ordinal,heading,content,page,source_ref FROM chunks WHERE version_id=%s ORDER BY ordinal LIMIT 50 OFFSET %s",
                (version_id, offset),
            ).fetchall()
        assets = db.execute(
            "SELECT id,caption,page FROM assets WHERE version_id=%s ORDER BY ordinal", (version_id,)
        ).fetchall()
        count = db.execute(
            "SELECT count(*)::int AS n FROM chunks WHERE version_id=%s", (version_id,)
        ).fetchone()["n"]
        return {"version": version, "chunks": chunks, "assets": assets, "total_chunks": count}


@app.post("/api/versions/{version_id}/publish")
def publish(version_id: UUID, admin: Admin):
    with connect() as db:
        row = db.execute("SELECT document_id FROM versions WHERE id=%s", (version_id,)).fetchone()
        if not row:
            raise HTTPException(404, "A változat nem található.")
        db.execute("SELECT id FROM documents WHERE id=%s FOR UPDATE", (row["document_id"],))
        version = db.execute(
            "SELECT status FROM versions WHERE id=%s FOR UPDATE", (version_id,)
        ).fetchone()
        if version["status"] not in {"ready", "published"}:
            raise HTTPException(409, "Csak sikeresen feldolgozott változat tehető közzé.")
        db.execute(
            "UPDATE versions SET status='ready', published_at=NULL WHERE document_id=%s AND status='published' AND id<>%s",
            (row["document_id"], version_id),
        )
        db.execute(
            "UPDATE versions SET status='published',published_at=now() WHERE id=%s", (version_id,)
        )
        return {"status": "published"}


@app.get("/api/documents/{document_id}/source")
def source(document_id: UUID, admin: Admin):
    with connect() as db:
        row = db.execute(
            "SELECT source_path,filename FROM documents WHERE id=%s", (document_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "A dokumentum nem található.")
    return FileResponse(storage_path(row["source_path"]), filename=row["filename"])


@app.get("/api/assets/{asset_id}")
def asset(asset_id: UUID, admin: Admin):
    with connect() as db:
        row = db.execute("SELECT path FROM assets WHERE id=%s", (asset_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Az ábra nem található.")
    return FileResponse(storage_path(row["path"]), media_type="image/png")
