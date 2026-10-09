import json
from uuid import uuid4

from app import enrichment
from app.joblog import event, read_events
from app.processing import progress
from app.storage import storage_path
from app.worker import claim
from test_admin import create_game, add_text, process


def test_short_fragments_are_packed_without_losing_source_identity():
    chunks = [{"id": str(uuid4()), "heading": "Movement", "content": "x" * 135} for _ in range(774)]
    batches = list(enrichment.processing_batches(chunks))
    assert len(batches) == 25
    assert [row["id"] for batch in batches for row in batch] == [row["id"] for row in chunks]
    assert all(
        len(batch) <= 32
        and sum(len(c["content"]) + len(c["heading"][:400]) for c in batch) <= 10000
        for batch in batches
    )
    long = [{"id": str(uuid4()), "heading": "h" * 500, "content": "x" * 1800} for _ in range(20)]
    assert len(list(enrichment.processing_batches(long))) == 5


def test_completed_text_job_has_durable_localized_processing_log(client):
    game = create_game(client)
    doc = add_text(client, game)
    version = process(client, doc)
    result = client.get(f"/api/games/{game}/processing", headers={"Accept-Language": "hu"}).json()
    job = result["jobs"][0]
    assert job["version_id"] == version and job["state"] == "done" and job["progress"] == 100
    assert job["stage"] == "Feldolgozás kész"
    codes = {e["code"] for e in job["events"]}
    assert {
        "job_started",
        "settings",
        "extracted",
        "ai_disabled",
        "saving_results",
        "job_done",
    } <= codes
    assert job["elapsed_seconds"] >= 0 and "lease_token" not in job
    other = create_game(client, "Another game")
    assert client.get(f"/api/games/{other}/processing").json()["jobs"] == []
    assert client.get(f"/api/games/{uuid4()}/processing").status_code == 404


def test_live_log_reports_batch_and_never_returns_raw_processing_log(client):
    game = create_game(client)
    doc = add_text(client, game)
    client.post(f"/api/documents/{doc}/process")
    job = claim()
    output = storage_path(f"processed/{job['version_id']}/{job['token']}")
    output.mkdir(parents=True, exist_ok=True)
    progress(output, "ai_indexing", 80, batch=2, batches=3, completed_chunks=32, total_chunks=80)
    event(output, "embedding_start", batch=2, batches=3, count=32, model="text-embedding-3-small")
    (output / "processing.log").write_text("private-test-value", encoding="utf-8")
    result = client.get(f"/api/games/{game}/processing")
    assert "private-test-value" not in result.text
    row = result.json()["jobs"][0]
    assert row["stage_code"] == "ai_indexing" and row["progress"] == 80
    assert row["details"] == {"batch": 2, "batches": 3, "completed_chunks": 32, "total_chunks": 80}
    assert row["step_elapsed_seconds"] >= 0


def test_log_tail_is_bounded_and_ignores_incomplete_append(tmp_path):
    for index in range(1000):
        event(tmp_path, "stage", stage="ai_indexing", progress=index)
    with (tmp_path / "events.jsonl").open("a") as stream:
        stream.write('{"time":')
    rows = read_events(tmp_path)
    assert len(rows) == 250 and rows[-1]["params"]["progress"] == 999
    assert all(json.dumps(row) for row in rows)
