"""Structured processing events; never expose raw provider logs or document text."""

import json
from datetime import datetime, timezone


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def event(output, code, **params):
    if output is None:
        return
    output.mkdir(parents=True, exist_ok=True)
    with (output / "events.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(
            json.dumps({"time": timestamp(), "code": code, "params": params}, ensure_ascii=False)
            + "\n"
        )


def read_events(output):
    try:
        with (output / "events.jsonl").open("rb") as stream:
            stream.seek(0, 2)
            size = stream.tell()
            stream.seek(max(0, size - 96000))
            lines = stream.read().decode("utf-8", errors="replace").splitlines()
    except FileNotFoundError:
        return []
    rows = []
    for line in lines:
        try:
            row = json.loads(line)
            if isinstance(row, dict) and all(key in row for key in ("time", "code", "params")):
                rows.append(row)
        except json.JSONDecodeError:
            pass  # A concurrent append may not yet have its final newline/JSON suffix.
    return rows[-250:]
