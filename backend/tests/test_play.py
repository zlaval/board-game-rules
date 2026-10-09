import json
from contextlib import contextmanager
from types import SimpleNamespace
from uuid import uuid4

import httpx2
import pytest
from openai import OpenAI

from app import answers, config, play
from app.db import connect
from app.storage import storage_path
from app.worker import claim, run_job
from test_admin import add_text, create_game, process


@pytest.fixture(autouse=True)
def isolate_provider(monkeypatch):
    monkeypatch.setattr(config, "OPENAI_API_KEY", "")
    answers.request_windows.clear()


def published(
    client,
    title="Reader game",
    text="# Attack\n\nAfter an attack you cannot move.\n\n# Courier\n\nThe courier can move after an attack.",
):
    game = create_game(client, title)
    doc = add_text(client, game, text)
    version = process(client, doc)
    assert client.get(f"/api/play/games/{game}/documents").json()[0]["version_id"] == version
    return game, doc, version


def ask(
    client, game, question="Can the courier move after an attack?", documents=None, language="en"
):
    return client.post(
        f"/api/play/games/{game}/questions",
        json={"question": question, "document_ids": documents or []},
        headers={"Accept-Language": language},
    )


def install_sdk_response(monkeypatch, result, captured):
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test-key-not-a-secret")

    def response(request):
        payload = json.loads(request.content)
        captured.append(payload)
        body = result(payload) if callable(result) else result
        return httpx2.Response(
            200,
            json={
                "id": "resp_test",
                "object": "response",
                "created_at": 0,
                "status": "completed",
                "model": "gpt-4.1-mini",
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
    def client():
        with OpenAI(
            api_key="test-key-not-a-secret",
            http_client=httpx2.Client(transport=httpx2.MockTransport(response)),
        ) as sdk:
            yield sdk

    monkeypatch.setattr(answers, "provider_client", client)


def test_reader_only_lists_published_rules_while_admin_can_access_drafts(client):
    game, doc, version = published(client)
    draft_game = create_game(client, "Unpublished")
    draft_doc = add_text(client, draft_game)
    draft_version = process(client, draft_doc)
    with connect() as db:
        # Archived processed versions must remain inaccessible to the reader.
        db.execute("UPDATE versions SET status='ready',published_at=NULL WHERE id=%s", (draft_version,))
        draft_chunk = db.execute(
            "SELECT id FROM chunks WHERE version_id=%s LIMIT 1", (draft_version,)
        ).fetchone()["id"]
    listing = client.get("/api/play/games").json()
    assert [row["id"] for row in listing] == [game]
    assert client.get("/api/games").status_code == 200
    assert client.get(f"/api/documents/{doc}/source").status_code == 200
    assert client.get(f"/api/play/games/{draft_game}/documents").json() == []
    assert client.get(f"/api/play/games/{draft_game}/sources/{draft_chunk}").status_code == 404
    assert (
        client.get(f"/api/play/games/{draft_game}/documents/{draft_doc}/original").status_code
        == 404
    )
    assert ask(client, draft_game).status_code == 409
    assert client.get("/api/play/capabilities").json()["explanations"] is False


def test_game_search_queries_published_titles_and_editions_as_literal_text(client):
    game, _, _ = published(client, "Árvíz 100%_ Reader")
    other, _, _ = published(client, "Other game")
    create_game(client, "Reader draft")

    def search(query):
        response = client.get("/api/play/games", params={"q": query})
        assert response.status_code == 200
        return [row["id"] for row in response.json()]

    assert search("  READER  ") == [game]
    assert search("árvíz") == [game]
    assert set(search("2024")) == {other, game}
    assert search("%_") == [game]
    assert search("' OR 1=1 --") == []
    assert search("missing") == []
    assert set(search("   ")) == {other, game}
    # A newly published game appears on the next query without a library refresh.
    newer, _, _ = published(client, "Reader newly published")
    assert set(search("reader")) == {game, newer}


def test_local_search_isolates_games_rule_selection_and_has_no_fabricated_answer(client):
    game, doc, _ = published(client)
    other, other_doc, _ = published(
        client, "Other edition", "# Courier\n\nThe courier may teleport to Mars."
    )
    response = ask(client, game)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "search_results" and result["paragraphs"] == []
    assert result["fallback_code"] == "ai_not_configured"
    assert result["sources"] and all(row["document_id"] == doc for row in result["sources"])
    assert "Mars" not in json.dumps(result)
    assert ask(client, game, documents=[other_doc]).status_code == 400
    assert ask(client, game, documents=[str(uuid4())]).status_code == 400
    assert ask(client, other, documents=[other_doc]).json()["status"] == "search_results"
    assert ask(client, game, "purple unicorn").json()["status"] == "no_matches"
    assert ask(client, game, " ").status_code == 422
    assert ask(client, game, "x" * 1001).status_code == 422


def test_hungarian_search_includes_exception_and_does_not_treat_negation_as_exclusion(client):
    game, _, _ = published(
        client,
        text="# Mozgás\n\nTámadás után nem mozoghatsz.\n\n# Kivétel\n\nA futár támadás után is mozoghat.",
    )
    result = ask(client, game, "A futár nem mozoghat támadás után?", language="hu").json()
    assert result["language"] == "hu" and result["status"] == "search_results"
    assert {row["heading"] for row in result["sources"]} == {"Mozgás", "Kivétel"}


def test_source_and_image_endpoints_reject_other_games_and_unpublished_versions(client):
    game, doc, version = published(client)
    other, _, _ = published(client, "Other")
    asset_id = uuid4()
    path = f"processed/{asset_id}.png"
    storage_path(path).parent.mkdir(parents=True, exist_ok=True)
    storage_path(path).write_bytes(b"image")
    with connect() as db:
        chunk = db.execute(
            "SELECT id FROM chunks WHERE version_id=%s LIMIT 1", (version,)
        ).fetchone()["id"]
        db.execute(
            "INSERT INTO assets(id,version_id,ordinal,path,page) VALUES (%s,%s,0,%s,1)",
            (asset_id, version, path),
        )
    assert client.get(f"/api/play/games/{game}/sources/{chunk}").status_code == 200
    assert client.get(f"/api/play/games/{other}/sources/{chunk}").status_code == 404
    assert client.get(f"/api/play/games/{other}/assets/{asset_id}").status_code == 404
    assert client.get(f"/api/play/games/{game}/assets/{asset_id}").content == b"image"
    assert client.get(f"/api/play/games/{other}/documents/{doc}/original").status_code == 404
    assert client.get(f"/api/play/games/{game}/documents/{doc}/original").status_code == 200
    with connect() as db:
        db.execute("UPDATE versions SET status='ready' WHERE id=%s", (version,))
    assert client.get(f"/api/play/games/{game}/sources/{chunk}").status_code == 404
    assert client.get(f"/api/play/games/{game}/assets/{asset_id}").status_code == 404


def test_reprocessing_uses_previous_published_version_until_swap(client):
    game, doc, first = published(client)
    second = client.post(f"/api/documents/{doc}/process").json()["version_id"]
    result = ask(client, game).json()
    assert {row["version_id"] for row in result["sources"]} == {first}
    run_job(claim())
    assert {row["version_id"] for row in ask(client, game).json()["sources"]} == {second}


def test_real_sdk_structured_answer_checks_sources_and_provider_request(client, monkeypatch):
    game, doc, _ = published(client)
    captured = []
    install_sdk_response(
        monkeypatch,
        {
            "status": "answered",
            "paragraphs": [{"text": "A futár támadás után is mozoghat.", "source_ids": ["S2"]}],
            "asset_ids": [],
        },
        captured,
    )
    result = ask(client, game, "Mozoghat a futár?", language="hu").json()
    assert result["status"] == "answered", result
    assert result["sources"][0]["document_id"] == doc
    assert result["sources"][0]["heading"] == "Courier"
    assert result["paragraphs"][0]["source_ids"] == [result["sources"][0]["id"]]
    assert captured[0]["store"] is False
    assert captured[0]["reasoning"] == {"effort": "low"}
    assert result["timings"]["total_ms"] >= result["timings"]["search_ms"] >= 0
    assert result["timings"]["explanation_ms"] >= 0
    assert captured[0]["text"]["format"]["type"] == "json_schema"
    assert "Hungarian" in captured[0]["instructions"]
    context = json.loads(captured[0]["input"])
    assert context["complete_context"] is True and len(context["sources"]) == 2
    schema = captured[0]["text"]["format"]["schema"]
    assert schema["$defs"]["CitedParagraph"]["properties"]["source_ids"]["items"]["enum"] == [
        "S1",
        "S2",
    ]


@pytest.mark.parametrize(
    "body",
    [
        {
            "status": "answered",
            "paragraphs": [{"text": "Invented", "source_ids": ["S999"]}],
            "asset_ids": [],
        },
        {
            "status": "answered",
            "paragraphs": [{"text": "No proof", "source_ids": []}],
            "asset_ids": [],
        },
        {
            "status": "answered",
            "paragraphs": [{"text": "Claim", "source_ids": ["S1"]}],
            "asset_ids": ["A999"],
        },
    ],
)
def test_unverified_model_ids_fall_back_to_original_search(client, monkeypatch, body):
    game, _, _ = published(client)
    install_sdk_response(monkeypatch, body, [])
    result = ask(client, game).json()
    assert result["status"] == "search_results" and result["paragraphs"] == []
    assert result["fallback_code"] == "ai_unavailable"


def test_model_insufficient_evidence_returns_no_claim(client, monkeypatch):
    game, _, _ = published(client)
    install_sdk_response(
        monkeypatch, {"status": "insufficient", "paragraphs": [], "asset_ids": []}, []
    )
    result = ask(client, game, "Can I score points on the moon?").json()
    assert (
        result["status"] == "insufficient"
        and result["sources"] == []
        and result["paragraphs"] == []
    )


def test_provider_failure_preserves_original_results(client, monkeypatch):
    game, _, _ = published(client)
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test")

    def fail(*args):
        raise TimeoutError("provider timeout")

    monkeypatch.setattr(answers, "generate_answer", fail)
    assert ask(client, game).json()["fallback_code"] == "ai_unavailable"


def test_conflicts_cite_both_sources_and_figures_stay_on_cited_pages(client, monkeypatch):
    game, _, version = published(client)
    first_asset, second_asset = uuid4(), uuid4()
    with connect() as db:
        db.execute("UPDATE chunks SET page=ordinal+1 WHERE version_id=%s", (version,))
        for index, asset in enumerate((first_asset, second_asset), 1):
            db.execute(
                "INSERT INTO assets(id,version_id,ordinal,path,page) VALUES (%s,%s,%s,%s,%s)",
                (asset, version, index, f"{asset}.png", index),
            )
    body = {
        "status": "answered",
        "paragraphs": [{"text": "Movement is restricted.", "source_ids": ["S1"]}],
        "asset_ids": [],
    }
    install_sdk_response(monkeypatch, body, [])
    result = ask(client, game).json()
    assert result["status"] == "answered"
    assert [row["id"] for row in result["assets"]] == [str(first_asset)]
    body["asset_ids"] = ["A2"]
    assert ask(client, game).json()["status"] == "search_results"
    body.update(
        status="conflicting",
        asset_ids=[],
        paragraphs=[{"text": "These sources disagree.", "source_ids": ["S1", "S2"]}],
    )
    result = ask(client, game).json()
    assert result["status"] == "conflicting" and len(result["sources"]) == 2


def test_real_sdk_audio_request_uses_bounded_upload_and_language_hint(client, monkeypatch):
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test-key-not-a-secret")
    monkeypatch.setattr(config, "OPENAI_TRANSCRIPTION_MODEL", "gpt-transcribe")
    captured = []

    def response(request):
        captured.append(request.read())
        return httpx2.Response(
            200, json={"text": "Mozoghat a futár?", "languages": [{"code": "hu"}]}
        )

    @contextmanager
    def provider():
        with OpenAI(
            api_key="test-key-not-a-secret",
            http_client=httpx2.Client(transport=httpx2.MockTransport(response)),
        ) as sdk:
            yield sdk

    monkeypatch.setattr(play, "provider_client", provider)
    result = client.post(
        "/api/play/transcriptions",
        files={"file": ("input.webm", b"synthetic-audio", "audio/webm")},
        data={"language": "hu"},
    )
    assert result.json() == {"text": "Mozoghat a futár?"}
    assert b"synthetic-audio" in captured[0] and b"gpt-transcribe" in captured[0]
    assert b"languages" in captured[0] and b"hu" in captured[0]


def test_request_limit_and_busy_provider_are_bounded(client, monkeypatch):
    monkeypatch.setattr(config, "PLAYER_REQUESTS_PER_MINUTE", 1)
    game, _, _ = published(client)
    assert ask(client, game).status_code == 200
    response = ask(client, game, language="hu")
    assert response.status_code == 429 and response.json()["code"] == "question_rate_limit"
    assert "Várj" in response.json()["detail"]
    with answers.provider_slots:
        with answers.provider_slots:
            with pytest.raises(Exception) as error:
                with answers.provider_client():
                    pytest.fail("A third provider call was allowed")
            assert error.value.status_code == 429


def test_transcription_is_bounded_and_text_is_editable_without_asking(client, monkeypatch):
    assert (
        client.post(
            "/api/play/transcriptions", files={"file": ("question.webm", b"audio")}
        ).status_code
        == 503
    )
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test")

    @contextmanager
    def mock_client():
        yield SimpleNamespace(
            audio=SimpleNamespace(
                transcriptions=SimpleNamespace(
                    create=lambda **kwargs: SimpleNamespace(text="Can the courier move?")
                )
            )
        )

    monkeypatch.setattr(play, "provider_client", mock_client)
    assert (
        client.post("/api/play/transcriptions", files={"file": ("q.exe", b"bad")}).status_code
        == 415
    )
    assert (
        client.post("/api/play/transcriptions", files={"file": ("q.webm", b"")}).status_code == 400
    )
    monkeypatch.setattr(config, "MAX_AUDIO_BYTES", 10)
    assert (
        client.post("/api/play/transcriptions", files={"file": ("q.webm", b"a" * 11)}).status_code
        == 413
    )
    response = client.post(
        "/api/play/transcriptions", files={"file": ("q.webm", b"audio")}, data={"language": "hu"}
    )
    assert response.json() == {"text": "Can the courier move?"}
    assert client.get("/api/play/capabilities").json()["transcription"] is True


def test_large_rulebooks_retrieve_neighboring_exception_with_bounded_context(client, monkeypatch):
    game, _, version = published(
        client,
        text="# Attack\n\nYou cannot move after an attack.\n\n# Special case\n\nThe courier ignores this restriction.\n\n# Other\n\nTake three cards.",
    )
    with connect() as db:
        db.execute(
            "INSERT INTO chunks(id,version_id,ordinal,content,source_ref) VALUES (%s,%s,99,%s,'large')",
            (uuid4(), version, "unrelated " * 4000),
        )
    captured = []
    install_sdk_response(
        monkeypatch,
        {
            "status": "answered",
            "paragraphs": [{"text": "The courier is an exception.", "source_ids": ["S1", "S2"]}],
            "asset_ids": [],
        },
        captured,
    )
    assert ask(client, game, "attack").json()["status"] == "answered"
    context = json.loads(captured[0]["input"])
    assert context["complete_context"] is False
    assert any("courier" in row["text"] for row in context["sources"])
    assert sum(len(row["text"]) for row in context["sources"]) <= config.AI_CONTEXT_CHARACTERS


def test_fragmented_procedure_and_referenced_combat_pages_are_retrieved(client, monkeypatch):
    game, doc, version = published(client, text="# Falvak\n\nA falvak lakói védekeznek.")
    _, _, other_version = published(client, "Other edition", "# Falvak\n\nMás szabály.")
    fragments = [
        (1, "Falvak", 20, "Sereggel a mezőre lépve megáll a mozgás."),
        (2, "Falvak", 20, "A bal oldali játékos három első szintű egységgel védekezik."),
        (3, "Falvak", 20, "Győzelem esetén megkapod a jelzőt. A harc a 23. oldalon található."),
        (4, "Falvak", 20, "Vereség esetén elpusztul a bábu."),
        (50, "Előkészületek", 23, "Mindkét fél egységkártyákat húz."),
        (51, "Harc", 24, "Felváltva játsszátok ki az egységeket."),
        (52, "Győzelem", 25, "Döntetlennél a védekező győz."),
    ]
    with connect() as db:
        db.execute("UPDATE chunks SET page=20 WHERE version_id=%s", (version,))
        for ordinal, heading, page, content in fragments:
            db.execute(
                "INSERT INTO chunks(id,version_id,ordinal,heading,page,content,source_ref) "
                "VALUES (%s,%s,%s,%s,%s,%s,'fragment')",
                (uuid4(), version, ordinal, heading, page, content),
            )
        # Force the bounded retrieval path; do not exercise the small-book shortcut.
        db.execute(
            "INSERT INTO chunks(id,version_id,ordinal,content,source_ref) "
            "VALUES (%s,%s,1000,%s,'large')",
            (uuid4(), version, "unrelated " * 4000),
        )
    monkeypatch.setattr(config, "OPENAI_API_KEY", "test")
    with connect() as db:
        _, docs = answers.published_documents(db, game, [doc])
        chunks, complete = answers.retrieve(db, docs, "hogy lehet harcolni falvak ellen?", True)
    assert not complete
    assert "ellen" not in answers.search_terms("falvak ellen")
    assert {0, 1, 2, 3, 4, 50, 51, 52}.issubset({row["ordinal"] for row in chunks})
    assert all(str(row["version_id"]) == version for row in chunks)
    assert (
        sum(len(row["content"]) + len(row["heading"]) for row in chunks)
        <= config.AI_CONTEXT_CHARACTERS
    )
    assert all(str(row["version_id"]) != other_version for row in chunks)


def test_page_reference_hints_are_bounded():
    assert answers.referenced_pages("A harcról a 23. oldalon olvashatsz.") == [23]
    assert answers.referenced_pages("Lásd a 23–24. oldalon.") == [23, 24]
    assert answers.referenced_pages("See pages 23-999.") == [23, 24]
    assert answers.referenced_pages("3 kártya, 20 pont.") == []


def test_checked_citations_are_buttons_not_internal_labels_in_answer_text(client, monkeypatch):
    game, _, _ = published(client)
    install_sdk_response(
        monkeypatch,
        {
            "status": "answered",
            "paragraphs": [{"text": "The courier can move. [S2]", "source_ids": ["S2"]}],
            "asset_ids": [],
        },
        [],
    )
    result = ask(client, game).json()
    assert result["paragraphs"][0]["text"] == "The courier can move."
    assert result["paragraphs"][0]["source_ids"]


def test_large_fragment_context_keeps_reasoning_for_special_setup(monkeypatch):
    captured = []
    install_sdk_response(
        monkeypatch,
        {
            "status": "answered",
            "paragraphs": [{"text": "Specific setup applies.", "source_ids": ["S1"]}],
            "asset_ids": [],
        },
        captured,
    )
    chunks = [
        {
            "id": uuid4(),
            "document_id": uuid4(),
            "version_id": uuid4(),
            "filename": "rules.pdf",
            "language": "hu",
            "ordinal": index,
            "heading": "Rules",
            "content": "Original rule.",
            "page": 20,
            "source_ref": str(index),
        }
        for index in range(41)
    ]
    result = answers.generate_answer(
        {"title": "Game", "edition": ""}, "Specific setup?", chunks, [], "hu", False
    )
    assert result["status"] == "answered"
    assert captured[0]["reasoning"] == {"effort": "medium"}
