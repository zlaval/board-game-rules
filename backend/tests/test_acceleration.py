import sys
from types import SimpleNamespace

import pytest

from app import acceleration


@pytest.mark.parametrize("available, expected", [(True, "cuda:0"), (False, "cpu")])
def test_auto_device_checks_cuda_kernels(monkeypatch, available, expected):
    calls = []
    torch = SimpleNamespace(
        cuda=SimpleNamespace(
            is_available=lambda: available, synchronize=lambda: calls.append("sync")
        ),
        ones=lambda *a, **kw: calls.append(kw["device"]) or 1,
    )
    monkeypatch.setitem(sys.modules, "torch", torch)
    monkeypatch.setenv("PROCESSING_DEVICE", "auto")
    assert acceleration.select_device() == expected
    assert calls == (["cuda:0", "sync"] if available else [])


def test_unusable_cuda_and_cpu_override(monkeypatch):
    def fail(*a, **kw):
        raise RuntimeError("GPU kernels unavailable")

    monkeypatch.setitem(
        sys.modules,
        "torch",
        SimpleNamespace(
            cuda=SimpleNamespace(is_available=lambda: True),
            ones=fail,
        ),
    )
    monkeypatch.setenv("PROCESSING_DEVICE", "auto")
    assert acceleration.select_device() == "cpu"
    monkeypatch.setenv("PROCESSING_DEVICE", "cpu")
    monkeypatch.setattr(acceleration, "cuda_available", fail)
    assert acceleration.select_device() == "cpu"


def test_gpu_failure_retries_cpu_once(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(acceleration, "select_device", lambda: "cuda:0")
    monkeypatch.setattr(acceleration, "release_cuda", lambda: calls.append("release"))

    def convert(device):
        calls.append(device)
        if device != "cpu":
            raise RuntimeError("CUDA out of memory")
        return "converted"

    assert acceleration.convert_with_fallback(convert, tmp_path) == "converted"
    assert calls == ["cuda:0", "release", "cpu"]
    assert '"cpu_fallback": true' in (tmp_path / "acceleration.json").read_text()


def test_successful_gpu_does_not_run_cpu(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(acceleration, "select_device", lambda: "cuda:0")
    assert acceleration.convert_with_fallback(lambda d: calls.append(d) or "ok", tmp_path) == "ok"
    assert calls == ["cuda:0"]
    assert '"ocr_backend": "torch"' in (tmp_path / "acceleration.json").read_text()


def test_cpu_failure_is_not_retried(tmp_path, monkeypatch):
    monkeypatch.setattr(acceleration, "select_device", lambda: "cpu")
    calls = []

    def fail(device):
        calls.append(device)
        raise ValueError("Invalid PDF")

    with pytest.raises(ValueError, match="Invalid PDF"):
        acceleration.convert_with_fallback(fail, tmp_path)
    assert calls == ["cpu"]


def test_failed_cpu_fallback_remains_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(acceleration, "select_device", lambda: "cuda:0")
    monkeypatch.setattr(acceleration, "release_cuda", lambda: None)
    calls = []

    def fail(device):
        calls.append(device)
        raise ValueError("Unreadable document")

    with pytest.raises(ValueError, match="Unreadable document"):
        acceleration.convert_with_fallback(fail, tmp_path)
    assert calls == ["cuda:0", "cpu"]
    assert not (tmp_path / "acceleration.json").exists()
