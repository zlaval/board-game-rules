import json
from contextlib import contextmanager
from uuid import UUID, uuid4

import httpx2
import pytest
from openai import OpenAI

from app import answers, config, embeddings, enrichment
from app.db import connect
from app.storage import storage_path
from app.worker import claim, complete
from test_admin import add_text, create_game, process


def vector(axis=0):
    return [float(index == axis) for index in range(config.EMBEDDING_DIMENSIONS)]


def manifest(text="After an attack you cannot move."):
    return {
        "chunks": [
            {
                "id": str(uuid4()),
                "ordinal": 0,
                "content": text,
                "heading": "Attack",
                "page": 2,
                "source_ref": "#/texts/1",
                "provenance": [{"page_no": 2}],
            }
        ],
        "assets": [],
        "page_count": 3,
        "character_count": len(text),
        "processor": "text-v1",
    }


def mock_sdk(monkeypatch, captured, invalid_ids=False):
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test-key-not-a-secret")
    monkeypatch.setattr(config, "AI_PROCESSING_ENABLED", True)

    def response(request):
        payload = json.loads(request.content)
        captured.append((request.url.path, payload))
        if request.url.path.endswith("/embeddings"):
            return httpx2.Response(
                200,
                json={
                    "object": "list",
                    "model": config.OPENAI_EMBEDDING_MODEL,
                    "data": [
                        {"object": "embedding", "index": index, "embedding": vector(index)}
                        for index in reversed(range(len(payload["input"])))
                    ],
                    "usage": {"prompt_tokens": 20, "total_tokens": 20},
                },
            )
        excerpts = json.loads(payload["input"])
        body = {
            "sections": [
                {
                    "id": "S999" if invalid_ids else row["id"],
                    "translation": "Támadás után nem mozoghatsz. A futár kivétel."
                    if "into Hungarian only" in payload["instructions"]
                    else row["text"],
                    "keywords": ["movement", "mozgás", "courier", "futár"],
                }
                for row in excerpts
            ]
        }
        return httpx2.Response(
            200,
            json={
                "id": "resp_test",
                "object": "response",
                "created_at": 0,
                "status": "completed",
                "model": config.OPENAI_PROCESSING_MODEL,
                "output": [
                    {
                        "id": "msg_test",
                        "type": "message",
                        "status": "completed",
                        "role": "assistant",
                        "content": [
                            {"type": "output_text", "text": json.dumps(body), "annotations": []}
                        ],
                    }
                ],
                "parallel_tool_calls": True,
                "tool_choice": "auto",
                "tools": [],
                "metadata": {},
            },
        )

    @contextmanager
    def provider():
        with OpenAI(
            api_key="test-key-not-a-secret",
            http_client=httpx2.Client(transport=httpx2.MockTransport(response)),
        ) as sdk:
            yield sdk

    monkeypatch.setattr(enrichment, "provider_client", provider)
    monkeypatch.setattr(answers, "provider_client", provider)


def test_sdk_translation_and_embedding_preserve_original_and_provenance(monkeypatch, tmp_path):
    captured = []
    mock_sdk(monkeypatch, captured)
    data = manifest()
    original = dict(data["chunks"][0])
    enrichment.enrich(data, tmp_path)
    chunk = data["chunks"][0]
    assert data["ai_status"] == "complete"
    assert chunk["content"] == original["content"]
    assert chunk["id"] == original["id"] and chunk["provenance"] == original["provenance"]
    assert chunk["page"] == 2 and chunk["source_ref"] == "#/texts/1"
    assert "nem mozoghatsz" in chunk["translation_hu"]
    assert "translation_en" not in chunk
    assert len(chunk["embedding"]) == 1536
    assert captured[0][1]["store"] is False
    assert captured[0][1]["reasoning"]["effort"] == "none"
    assert captured[0][1]["text"]["format"]["type"] == "json_schema"
    assert captured[1][1]["dimensions"] == 1536
    assert "cannot move" in captured[1][1]["input"][0]


def test_invalid_translation_ids_are_rejected_and_original_remains(monkeypatch, tmp_path):
    captured = []
    mock_sdk(monkeypatch, captured, invalid_ids=True)
    data = manifest()
    enrichment.enrich(data, tmp_path)
    assert data["ai_status"] == "partial" and data["ai_error_code"] == "ai_processing_failed"
    assert "translation_hu" not in data["chunks"][0]
    assert "cannot move" in data["chunks"][0]["content"]
    assert len(captured) == 2 and data["chunks"][0]["embedding"]


def test_embedding_failure_retains_translations_and_records_partial_status(monkeypatch, tmp_path):
    mock_sdk(monkeypatch, [])

    def failed(texts):
        raise TimeoutError()

    monkeypatch.setattr(enrichment, "embed_texts", failed)
    data = enrichment.enrich(manifest(), tmp_path)
    assert data["ai_status"] == "partial"
    assert data["chunks"][0]["translation_hu"] and "embedding" not in data["chunks"][0]


def test_processing_bound_makes_no_provider_request(monkeypatch, tmp_path):
    captured = []
    mock_sdk(monkeypatch, captured)
    monkeypatch.setattr(config, "AI_MAX_CHARACTERS", 5)
    data = enrichment.enrich(manifest(), tmp_path)
    assert data["ai_status"] == "limited" and not captured


def test_embedding_response_order_is_matched_to_input(monkeypatch):
    mock_sdk(monkeypatch, [])
    assert embeddings.embed_texts(["First rule", "Second rule"]) == [vector(0), vector(1)]


def test_ai_reprocessing_reuses_extraction_and_preserves_published_version(client, monkeypatch):
    game = create_game(client)
    doc = client.post(
        f"/api/games/{game}/documents/text",
        json={
            "content": "After an attack you cannot move. The courier is an exception.",
            "language": "en",
            "usage_language": "hu",
        },
    ).json()["id"]
    old = process(client, doc)
    old_asset = uuid4()
    path = f"test-ai/{old_asset}.png"
    storage_path(path).parent.mkdir(parents=True, exist_ok=True)
    storage_path(path).write_bytes(b"original figure")
    with connect() as db:
        db.execute("UPDATE chunks SET page=2 WHERE version_id=%s", (old,))
        db.execute(
            "INSERT INTO assets(id,version_id,ordinal,path,caption,page) VALUES (%s,%s,0,%s,'Courier',2)",
            (old_asset, old, path),
        )
    captured = []
    mock_sdk(monkeypatch, captured)
    response = client.post(f"/api/documents/{doc}/ai-process")
    assert response.status_code == 202
    new = response.json()["version_id"]
    assert client.post(f"/api/documents/{doc}/ai-process").status_code == 409
    job = claim()
    assert job["kind"] == "ai" and str(job["source_version_id"]) == old
    assert client.get(f"/api/play/games/{game}/documents").json()[0]["version_id"] == old
    output = storage_path("test-ai-copy")
    output.mkdir(parents=True, exist_ok=True)
    data = enrichment.copy_extracted(old, output)
    assert data["source_language"] == "en" and data["usage_language"] == "hu"
    enrichment.enrich(data, output, data["source_language"], data["usage_language"])
    assert data["chunks"][0]["page"] == 2
    assert (output / data["assets"][0]["filename"]).read_bytes() == b"original figure"
    assert data["assets"][0]["id"] != str(old_asset)
    assert complete(job, data, "test-ai-copy")
    document = client.get(f"/api/games/{game}/documents").json()[0]
    assert document["ai_status"] == "complete" and document["published_version_id"] == new
    preview = client.get(f"/api/versions/{new}/preview", params={"q": "futár"}).json()
    assert preview["chunks"][0]["content"].startswith("After an attack")
    assert "futár" in preview["chunks"][0]["translation_hu"]
    assert (
        client.get(f"/api/play/games/{game}/assets/{data['assets'][0]['id']}").content
        == b"original figure"
    )
    monkeypatch.setattr(config, "OPENAI_API_KEY", "")
    result = client.post(f"/api/play/games/{game}/questions", json={"question": "futár"}).json()
    assert result["status"] == "search_results"
    assert result["sources"][0]["content"].startswith("After an attack")
    assert result["sources"][0]["version_id"] == new


def test_ai_request_needs_key_and_extracted_rules(client, monkeypatch):
    game = create_game(client)
    doc = add_text(client, game)
    assert client.post(f"/api/documents/{doc}/ai-process").json()["code"] == "ai_not_configured"
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test")
    assert (
        client.post(f"/api/documents/{doc}/ai-process").json()["code"] == "ai_requires_extraction"
    )


def test_semantic_retrieval_isolates_selected_published_versions(client, monkeypatch):
    game = create_game(client)
    doc = add_text(client, game, "You cannot relocate after combat.")
    version = process(client, doc)
    client.post(f"/api/versions/{version}/publish")
    other = create_game(client, "Other edition")
    other_doc = add_text(client, other, "Players may fly after fighting.")
    other_version = process(client, other_doc)
    client.post(f"/api/versions/{other_version}/publish")
    with connect() as db:
        db.execute(
            "UPDATE chunks SET embedding=%s::vector,embedding_model=%s WHERE version_id=ANY(%s)",
            (
                json.dumps(vector()),
                config.OPENAI_EMBEDDING_MODEL,
                [UUID(version), UUID(other_version)],
            ),
        )
        for ordinal in range(1, 45):
            db.execute(
                "INSERT INTO chunks(id,version_id,ordinal,content,source_ref,embedding,embedding_model) "
                "VALUES (%s,%s,%s,'Unrelated setup.','noise',%s::vector,%s)",
                (uuid4(), version, ordinal, json.dumps(vector(1)), config.OPENAI_EMBEDDING_MODEL),
            )
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test")
    monkeypatch.setattr(answers, "embed_texts", lambda texts: [vector()])
    with connect() as db:
        _, docs = answers.published_documents(db, UUID(game), [doc])
        rows, complete_context = answers.retrieve(
            db, docs, "áthelyezhető harc után", full_context=True
        )
    assert not complete_context
    assert rows[0]["content"] == "You cannot relocate after combat."
    assert all(str(row["version_id"]) == version for row in rows)


def test_ai_progress_stages_are_localized():
    from app.i18n import localize_version

    assert (
        localize_version({"stage": "ai_indexing"}, "hu")["stage"]
        == "Szemantikus keresési index építése"
    )


@pytest.mark.parametrize(
    "source,usage,targets",
    [
        ("hu", "hu", []),
        ("en", "en", []),
        ("en-US", "en", []),
        ("en", "hu", ["hu"]),
        ("hu", "en", ["en"]),
        ("hu", "both", ["en"]),
        ("en", "both", ["hu"]),
        ("de", "both", ["en", "hu"]),
    ],
)
def test_only_requested_non_source_languages_are_translated(
    monkeypatch, tmp_path, source, usage, targets
):
    captured = []
    mock_sdk(monkeypatch, captured)
    data = enrichment.enrich(manifest(), tmp_path, source, usage)
    assert data["ai_status"] == "complete"
    translation_calls = [body for path, body in captured if path.endswith("/responses")]
    embedding_calls = [body for path, body in captured if path.endswith("/embeddings")]
    assert len(translation_calls) == len(targets)
    assert len(embedding_calls) == 1
    for body, language in zip(translation_calls, targets, strict=True):
        target = {"en": "English", "hu": "Hungarian"}[language]
        assert f"into {target} only" in body["instructions"]
    for language in ("en", "hu"):
        assert (f"translation_{language}" in data["chunks"][0]) == (language in targets)
    assert (
        data["chunks"][0]["embedding"]
        and data["chunks"][0]["content"] == manifest()["chunks"][0]["content"]
    )
    assert data["ai_model"] == (config.OPENAI_PROCESSING_MODEL if targets else None)


def test_upload_usage_language_is_validated_and_persisted(client):
    game = create_game(client)
    text = client.post(
        f"/api/games/{game}/documents/text",
        json={
            "content": "Támadás után nem mozoghatsz.",
            "language": "hu",
            "usage_language": "hu",
        },
    )
    assert text.status_code == 201
    file = client.post(
        f"/api/games/{game}/documents",
        files={
            "file": ("rules.txt", b"After an attack you cannot move.", "text/plain"),
        },
        data={"language": "en", "usage_language": "both"},
    )
    assert file.status_code == 201
    docs = {doc["id"]: doc for doc in client.get(f"/api/games/{game}/documents").json()}
    assert docs[text.json()["id"]]["usage_language"] == "hu"
    assert docs[file.json()["id"]]["usage_language"] == "both"
    assert (
        client.post(
            f"/api/games/{game}/documents/text",
            json={
                "content": "Invalid language selection",
                "usage_language": "fr",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/api/games/{game}/documents",
            files={
                "file": ("invalid.txt", b"Invalid selection", "text/plain"),
            },
            data={"usage_language": "fr"},
        ).status_code
        == 422
    )
    job_id = client.post(f"/api/documents/{text.json()['id']}/process").json()["version_id"]
    job = claim()
    assert str(job["version_id"]) == job_id
    assert job["document"]["language"] == "hu" and job["document"]["usage_language"] == "hu"
