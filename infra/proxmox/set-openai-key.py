"""Receive one OPENAI_API_KEY= line on stdin, without logging the secret."""

import os
from pathlib import Path
import sys
import tempfile


def main():
    if os.geteuid() != 0:
        raise SystemExit("Run with sudo inside the application VM.")
    config = Path("/opt/ruleshelf/infra/.env")
    payload = sys.stdin.read().strip()
    if (
        not payload.startswith("OPENAI_API_KEY=")
        or "\n" in payload
        or "\r" in payload
        or not payload.partition("=")[2].strip().strip("\"'")
    ):
        raise SystemExit("Expected one non-empty OPENAI_API_KEY assignment.")
    if config.is_symlink() or not config.is_file():
        raise SystemExit("Expected an existing regular application config file.")
    lines = [
        line for line in config.read_text(encoding="utf-8").splitlines()
        if not line.startswith("OPENAI_API_KEY=")
    ]
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=config.parent, delete=False
        ) as stream:
            temporary = Path(stream.name)
            os.fchmod(stream.fileno(), 0o600)
            stream.write("\n".join([*lines, payload]) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, config)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    print("OpenAI key configured; application secrets were not printed.")


if __name__ == "__main__":
    main()
