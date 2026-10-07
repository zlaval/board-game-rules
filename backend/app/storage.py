from pathlib import Path

from .config import DATA_DIR


def storage_path(relative: str) -> Path:
    root = DATA_DIR.resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Invalid storage path")
    return path
