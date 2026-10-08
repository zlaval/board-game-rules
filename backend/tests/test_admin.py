from uuid import UUID

from app.db import connect
from app.processing import extract_text, split_text
from app.storage import storage_path
from app.worker import claim, complete, run_job

RULES = "# Előkészületek\n\nMinden játékos három kártyát kap.\n\n# Körök\n\nEgy körben két akció hajtható végre. Támadás után nem mozoghatsz.\n\n# Kivétel\n\nA futár támadás után is mozoghat."


def create_game(client, title="Tesztjáték"):
    response = client.post("/api/games", json={"title": title, "edition": "2024", "language": "hu"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def add_text(client, game_id, text=RULES):
    response = client.post(
        f"/api/games/{game_id}/documents/text",
        json={"content": text, "title": "Alapszabály", "language": "hu"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def process(client, document_id):
    response = client.post(f"/api/documents/{document_id}/process")
    assert response.status_code == 202, response.text
    job = claim()
    assert str(job["version_id"]) == response.json()["version_id"]
    run_job(job)
    return response.json()["version_id"]


def test_admin_read_and_write_without_login(client):
    assert client.cookies.get("rules_session") is None
    assert client.get("/api/games").status_code == 200
    game_id = create_game(client)
    assert client.get("/api/games").json()[0]["id"] == game_id
    assert client.get(f"/api/games/{game_id}/documents").status_code == 200
    assert client.cookies.get("rules_session") is None


def test_cross_origin_write_rejected(client):
    response = client.post(
        "/api/games", json={"title": "Bad origin"}, headers={"Origin": "https://another.example"}
    )
    assert response.status_code == 403


def test_game_validation_and_edit(client):
    assert client.post("/api/games", json={"title": "   "}).status_code == 422
    game_id = create_game(client)
    response = client.patch(f"/api/games/{game_id}", json={"title": "Új név", "language": "en"})
    assert response.status_code == 200
    assert client.get("/api/games").json()[0]["title"] == "Új név"


def test_text_to_search_preview_and_publish(client):
    game_id = create_game(client)
    document_id = add_text(client, game_id)
    version_id = process(client, document_id)
    docs = client.get(f"/api/games/{game_id}/documents").json()
    assert docs[0]["status"] == "ready"
    assert docs[0]["chunk_count"] >= 3
    preview = client.get(f"/api/versions/{version_id}/preview", params={"q": "futár"}).json()
    assert len(preview["chunks"]) == 1
    assert "támadás után is mozoghat" in preview["chunks"][0]["content"]
    assert preview["chunks"][0]["heading"] == "Kivétel"
    assert client.post(f"/api/versions/{version_id}/publish").status_code == 200
    assert client.get(f"/api/games/{game_id}/documents").json()[0]["status"] == "published"


def test_reprocessing_keeps_published_version_until_atomic_swap(client):
    game_id = create_game(client)
    document_id = add_text(client, game_id)
    first = process(client, document_id)
    client.post(f"/api/versions/{first}/publish")
    second = process(client, document_id)
    doc = client.get(f"/api/games/{game_id}/documents").json()[0]
    assert doc["status"] == "ready" and doc["has_published"] is True
    assert doc["published_version_id"] == first
    assert client.get(f"/api/versions/{first}/preview").json()["version"]["status"] == "published"
    client.post(f"/api/versions/{second}/publish")
    assert client.get(f"/api/versions/{first}/preview").json()["version"]["status"] == "ready"
    assert client.get(f"/api/versions/{second}/preview").json()["version"]["status"] == "published"


def test_duplicate_upload_and_duplicate_job_rejected(client):
    game_id = create_game(client)
    document_id = add_text(client, game_id)
    assert (
        client.post(f"/api/games/{game_id}/documents/text", json={"content": RULES}).status_code
        == 409
    )
    assert client.post(f"/api/documents/{document_id}/process").status_code == 202
    assert client.post(f"/api/documents/{document_id}/process").status_code == 409


def test_invalid_uploads_and_empty_text(client):
    game_id = create_game(client)
    base = f"/api/games/{game_id}/documents"
    assert client.post(base, files={"file": ("rules.exe", b"bad")}).status_code == 415
    assert client.post(base, files={"file": ("rules.pdf", b"not a pdf")}).status_code == 400
    assert client.post(base, files={"file": ("rules.txt", b"\xff\xfe")}).status_code == 400
    assert client.post(base, files={"file": ("rules.txt", b"")}).status_code == 400
    assert client.post(base + "/text", json={"content": "   "}).status_code == 422


def test_upload_bound_and_filename_sanitizing(client, monkeypatch):
    from app import config

    game_id = create_game(client)
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 100)
    assert (
        client.post(
            f"/api/games/{game_id}/documents", files={"file": ("rules.txt", b"x" * 101)}
        ).status_code
        == 413
    )
    response = client.post(
        f"/api/games/{game_id}/documents", files={"file": ("../../rules.txt", b"valid")}
    )
    assert response.status_code == 201
    assert client.get(f"/api/games/{game_id}/documents").json()[0]["filename"] == "rules.txt"


def test_document_isolation_and_source_download(client):
    one = create_game(client, "Első")
    two = create_game(client, "Második")
    doc = add_text(client, one)
    assert client.get(f"/api/games/{two}/documents").json() == []
    assert client.get(f"/api/documents/{doc}/source").content.decode() == RULES


def test_cannot_publish_unprocessed_version(client):
    doc = add_text(client, create_game(client))
    version = client.post(f"/api/documents/{doc}/process").json()["version_id"]
    assert client.post(f"/api/versions/{version}/publish").status_code == 409


def test_expired_lease_recovery_and_stale_worker_fencing(client):
    doc = add_text(client, create_game(client))
    version = client.post(f"/api/documents/{doc}/process").json()["version_id"]
    first = claim()
    with connect() as db:
        db.execute(
            "UPDATE jobs SET lease_until=now()-interval '1 minute' WHERE version_id=%s",
            (UUID(version),),
        )
    replacement = claim()
    assert replacement["token"] != first["token"]
    assert complete(first, {}, "irrelevant") is False
    run_job(replacement)
    assert client.get(f"/api/versions/{version}/preview").json()["version"]["status"] == "ready"


def test_failure_is_visible_and_can_retry(client):
    game_id = create_game(client)
    doc = add_text(client, game_id, "# Empty heading")
    version = process(client, doc)
    preview = client.get(f"/api/versions/{version}/preview").json()
    assert preview["version"]["status"] == "failed"
    assert preview["version"]["error"]
    assert client.post(f"/api/documents/{doc}/process").status_code == 202


def test_chunking_preserves_negation_and_long_content(tmp_path):
    path = tmp_path / "rules.md"
    path.write_text(RULES, encoding="utf-8")
    sections, _, _, _ = extract_text(path)
    assert any("nem mozoghatsz" in s["text"] for s in sections)
    text = " ".join(["szabály"] * 800)
    pieces = split_text(text)
    assert len(pieces) > 1 and max(map(len, pieces)) <= 1800
    assert " ".join(pieces) == text


def test_storage_path_cannot_escape():
    import pytest

    with pytest.raises(ValueError):
        storage_path("../../etc/passwd")
