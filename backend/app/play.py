"""Household reader endpoints: only published material is available here."""

from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException

from . import config
from .answers import Question, answer_question, limit_requests, provider_client
from .db import connect
from .i18n import api_error, request_language
from .storage import storage_path

router = APIRouter(prefix="/api/play", tags=["Player"])


@router.get("/capabilities")
def capabilities():
    return {
        "explanations": bool(config.OPENAI_API_KEY),
        "transcription": bool(config.OPENAI_API_KEY),
        "max_audio_bytes": config.MAX_AUDIO_BYTES,
    }


@router.get("/games")
def games():
    with connect() as db:
        return db.execute(
            "SELECT g.id,g.title,g.edition,g.language,g.description,count(d.id)::int AS document_count "
            "FROM games g JOIN documents d ON d.game_id=g.id "
            "JOIN versions v ON v.document_id=d.id AND v.status='published' "
            "GROUP BY g.id ORDER BY lower(g.title),g.id"
        ).fetchall()


@router.get("/games/{game_id}/documents")
def documents(game_id: UUID):
    with connect() as db:
        if not db.execute("SELECT 1 FROM games WHERE id=%s", (game_id,)).fetchone():
            raise api_error(404, "game_not_found")
        return db.execute(
            "SELECT d.id,d.filename,d.language,v.id AS version_id,v.page_count "
            "FROM documents d JOIN versions v ON v.document_id=d.id AND v.status='published' "
            "WHERE d.game_id=%s ORDER BY d.created_at,d.id",
            (game_id,),
        ).fetchall()


@router.post("/games/{game_id}/questions")
def question(game_id: UUID, body: Question, request: Request):
    limit_requests(request.client.host if request.client else "unknown")
    return answer_question(game_id, body, request_language(request))


@router.get("/games/{game_id}/sources/{chunk_id}")
def source(game_id: UUID, chunk_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT c.id,c.ordinal,c.heading,c.content,c.page,c.source_ref,d.id AS document_id,d.filename,d.language "
            "FROM chunks c JOIN versions v ON v.id=c.version_id AND v.status='published' "
            "JOIN documents d ON d.id=v.document_id WHERE c.id=%s AND d.game_id=%s",
            (chunk_id, game_id),
        ).fetchone()
    if not row:
        raise api_error(404, "source_not_available")
    return row


@router.get("/games/{game_id}/documents/{document_id}/original")
def original(game_id: UUID, document_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT d.source_path,d.filename,d.format FROM documents d "
            "JOIN versions v ON v.document_id=d.id AND v.status='published' "
            "WHERE d.id=%s AND d.game_id=%s",
            (document_id, game_id),
        ).fetchone()
    if not row:
        raise api_error(404, "source_not_available")
    return FileResponse(
        storage_path(row["source_path"]),
        filename=row["filename"],
        media_type="application/pdf" if row["format"] == "pdf" else None,
        content_disposition_type="inline" if row["format"] == "pdf" else "attachment",
    )


@router.get("/games/{game_id}/assets/{asset_id}")
def asset(game_id: UUID, asset_id: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT a.path FROM assets a JOIN versions v ON v.id=a.version_id AND v.status='published' "
            "JOIN documents d ON d.id=v.document_id WHERE a.id=%s AND d.game_id=%s",
            (asset_id, game_id),
        ).fetchone()
    if not row:
        raise api_error(404, "asset_not_found")
    return FileResponse(storage_path(row["path"]), media_type="image/png")


@router.post("/transcriptions")
def transcription(
    request: Request,
    file: Annotated[UploadFile, File()],
    language: Annotated[str, Form(pattern="^(en|hu)$")] = "en",
):
    limit_requests(request.client.host if request.client else "unknown")
    if not config.OPENAI_API_KEY:
        raise api_error(503, "voice_not_configured")
    extension = Path(file.filename or "").suffix.lower().lstrip(".")
    if extension not in {"webm", "mp4", "m4a", "wav", "mp3", "ogg", "flac"}:
        raise api_error(415, "unsupported_audio")
    content = file.file.read(config.MAX_AUDIO_BYTES + 1)
    if len(content) > config.MAX_AUDIO_BYTES:
        raise api_error(413, "audio_too_large")
    if not content:
        raise api_error(400, "empty_audio")
    try:
        with provider_client() as client:
            result = client.audio.transcriptions.create(
                model=config.OPENAI_TRANSCRIPTION_MODEL,
                file=(
                    f"question.{extension}",
                    content,
                    file.content_type or "application/octet-stream",
                ),
                **(
                    {"extra_body": {"languages": [language]}}
                    if config.OPENAI_TRANSCRIPTION_MODEL == "gpt-transcribe"
                    else {"language": language}
                ),
            )
        text = result.text.strip()
        if not text:
            raise api_error(422, "empty_transcription")
        if len(text) > 1000:
            raise api_error(422, "transcription_too_long")
        return {"text": text}
    except HTTPException:
        raise
    except Exception:
        raise api_error(503, "transcription_failed") from None
