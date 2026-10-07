"""Cache verified RapidOCR weights atomically, including models shipped in its wheel."""

import hashlib
import shutil
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def ensure_model(url, cache, expected_hash=None, bundled=None):
    cache.mkdir(parents=True, exist_ok=True)
    destination = cache / Path(urlsplit(url).path).name

    def valid(path):
        if not path.is_file() or not path.stat().st_size:
            return False
        if expected_hash:
            return digest(path) == expected_hash
        # Recognition dictionaries have no checksum in the upstream registry.
        try:
            return bool(path.read_text(encoding="utf-8").strip())
        except UnicodeError:
            return False

    if valid(destination):
        return str(destination)
    for attempt in range(2):
        temporary = cache / f".{destination.name}.{uuid4().hex}.partial"
        try:
            if bundled and valid(bundled):
                shutil.copyfile(bundled, temporary)
            else:
                # ModelScope can cache expired CDN redirects: request a fresh redirect.
                separator = "&" if "?" in url else "?"
                fresh_url = f"{url}{separator}t={uuid4().hex}"
                with urllib.request.urlopen(fresh_url, timeout=60) as response:
                    with temporary.open("wb") as target:
                        shutil.copyfileobj(response, target)
            if not valid(temporary):
                raise ValueError(f"OCR model integrity check failed: {destination.name}")
            temporary.replace(destination)
            return str(destination)
        except (OSError, ValueError):
            if attempt == 1:
                raise
        finally:
            temporary.unlink(missing_ok=True)


def prepare_ocr_models(cache, backend):
    import rapidocr
    from rapidocr.inference_engine.base import FileInfo, InferSession
    from rapidocr.utils.typings import EngineType, ModelType, OCRVersion, TaskType

    engine = EngineType.TORCH if backend == "torch" else EngineType.ONNXRUNTIME
    bundled = Path(rapidocr.__file__).parent / "models"
    paths = {}
    for name, task, version, size in [
        ("det", TaskType.DET, OCRVersion.PPOCRV6, ModelType.SMALL),
        ("cls", TaskType.CLS, OCRVersion.PPOCRV4, ModelType.MOBILE),
        ("rec", TaskType.REC, OCRVersion.PPOCRV6, ModelType.SMALL),
    ]:
        spec = InferSession.get_model_url(FileInfo(engine, version, task, "ch", size))
        url = spec["model_dir"]
        paths[f"{name}_model_path"] = ensure_model(
            url, cache, spec["SHA256"], bundled / Path(urlsplit(url).path).name
        )
        if name == "rec" and backend == "torch" and "dict_url" in spec:
            paths["rec_keys_path"] = ensure_model(spec["dict_url"], cache)
    return paths
