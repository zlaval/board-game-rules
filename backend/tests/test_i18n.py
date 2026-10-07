from types import SimpleNamespace

from app.db import connect
from app.i18n import CATALOGS, localize_version, request_language
from test_admin import add_text, create_game, process


def test_error_language_default_selection_and_stable_code(client):
    client.post("/api/auth/logout")
    en = client.get("/api/games")
    hu = client.get("/api/games", headers={"Accept-Language": "hu-HU, en;q=0.5"})
    assert en.status_code == hu.status_code == 401
    assert en.json()["code"] == hu.json()["code"] == "auth_required"
    assert en.json()["detail"] == CATALOGS["en"]["errors.auth_required"]
    assert hu.json()["detail"] == CATALOGS["hu"]["errors.auth_required"]
    assert en.headers["content-language"] == "en"
    assert hu.headers["content-language"] == "hu"


def test_validation_and_upload_errors_are_localized(client, monkeypatch):
    response = client.post("/api/games", json={"title": ""}, headers={"Accept-Language": "hu"})
    assert response.status_code == 422
    assert response.json()["detail"] == CATALOGS["hu"]["errors.validation_error"]
    from app import config

    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 1024 * 1024)
    game = create_game(client)
    response = client.post(
        f"/api/games/{game}/documents", files={"file": ("rules.txt", b"x" * (1024 * 1024 + 1))}
    )
    assert response.status_code == 413
    assert response.json()["params"] == {"limit": 1}
    assert response.json()["detail"] == "The file must be no larger than 1 MB."


def test_progress_errors_and_source_text_survive_language_switch(client):
    game = create_game(client)
    doc = add_text(client, game, "Original rules stay unchanged.")
    version = process(client, doc)
    with connect() as db:
        db.execute(
            "UPDATE versions SET stage=%s,error=%s WHERE id=%s",
            ("loading_ocr (cuda:0)", "processing_timeout", version),
        )
    en = client.get(f"/api/games/{game}/documents").json()[0]
    hu = client.get(f"/api/games/{game}/documents", headers={"Accept-Language": "hu"}).json()[0]
    assert en["stage_code"] == hu["stage_code"] == "loading_ocr"
    assert en["stage_params"] == hu["stage_params"] == {"device": "cuda:0"}
    assert en["error_code"] == hu["error_code"] == "processing_timeout"
    assert en["stage"] == "Loading OCR and document models (cuda:0)"
    assert hu["stage"] == "OCR és dokumentummodellek betöltése (cuda:0)"
    assert en["error"] == CATALOGS["en"]["errors.processing_timeout"]
    assert hu["error"] == CATALOGS["hu"]["errors.processing_timeout"]
    for language in ("en", "hu"):
        preview = client.get(
            f"/api/versions/{version}/preview", headers={"Accept-Language": language}
        ).json()
        assert preview["chunks"][0]["content"] == "Original rules stay unchanged."


def test_legacy_hungarian_progress_and_errors_are_translatable():
    row = {
        "stage": "OCR és dokumentummodellek betöltése (cpu)",
        "error": CATALOGS["hu"]["errors.worker_interrupted"],
    }
    localized = localize_version(row, "en")
    assert localized["stage_code"] == "loading_ocr"
    assert localized["stage"] == "Loading OCR and document models (cpu)"
    assert localized["error_code"] == "worker_interrupted"


def test_language_negotiation_uses_quality_and_english_fallback():
    for header, expected in [
        ("de, hu;q=0.7, en;q=0.2", "hu"),
        ("hu;q=0,en;q=1", "en"),
        ("fr", "en"),
        ("hu;q=bad", "en"),
        ("en-US,hu;q=0.8", "en"),
    ]:
        assert request_language(SimpleNamespace(headers={"accept-language": header})) == expected
