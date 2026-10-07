import hashlib
from io import BytesIO

import pytest

from app.ocr_models import ensure_model


def test_bundled_model_repairs_invalid_cache_without_network(tmp_path, monkeypatch):
    content = b"verified OCR weights"
    checksum = hashlib.sha256(content).hexdigest()
    bundled = tmp_path / "bundled.onnx"
    bundled.write_bytes(content)
    cache = tmp_path / "cache"
    cache.mkdir()
    (cache / "model.onnx").write_bytes(b"partial download")

    def unexpected(*args, **kwargs):
        raise AssertionError("Bundled weights must not require network")

    monkeypatch.setattr("urllib.request.urlopen", unexpected)
    result = ensure_model("https://example.com/model.onnx", cache, checksum, bundled)
    assert result == str(cache / "model.onnx")
    assert (cache / "model.onnx").read_bytes() == content
    assert not list(cache.glob("*.partial"))


def test_download_retries_and_checks_integrity_before_atomic_publish(tmp_path, monkeypatch):
    content = b"valid model"
    checksum = hashlib.sha256(content).hexdigest()
    calls = []

    def download(url, timeout):
        calls.append(url)
        return BytesIO(b"truncated" if len(calls) == 1 else content)

    monkeypatch.setattr("urllib.request.urlopen", download)
    result = ensure_model("https://example.com/model.pth", tmp_path, checksum)
    assert len(calls) == 2 and calls[0] != calls[1]
    assert "?t=" in calls[0]
    assert result == str(tmp_path / "model.pth")
    assert (tmp_path / "model.pth").read_bytes() == content
    assert not list(tmp_path.glob("*.partial"))
    ensure_model("https://example.com/model.pth", tmp_path, checksum)
    assert len(calls) == 2


def test_invalid_download_never_replaces_existing_model(tmp_path, monkeypatch):
    original = tmp_path / "model.pth"
    original.write_bytes(b"old invalid file")
    monkeypatch.setattr("urllib.request.urlopen", lambda *a, **kw: BytesIO(b"bad download"))
    with pytest.raises(ValueError, match="integrity check"):
        ensure_model("https://example.com/model.pth", tmp_path, "expected checksum")
    assert original.read_bytes() == b"old invalid file"
    assert not list(tmp_path.glob("*.partial"))
