"""Remove only the explicitly identified synthetic game created by browser tests."""

import shutil
import sys
from uuid import UUID

from app.db import connect
from app.storage import storage_path

game_id = UUID(sys.argv[1])
with connect() as db:
    game = db.execute("SELECT title FROM games WHERE id=%s FOR UPDATE", (game_id,)).fetchone()
    if not game or not game["title"].startswith("__e2e__ "):
        raise ValueError("Refusing cleanup: this is not an identified synthetic E2E game")
    versions = db.execute(
        "SELECT v.id FROM versions v JOIN documents d ON d.id=v.document_id WHERE d.game_id=%s",
        (game_id,),
    ).fetchall()
    documents = db.execute(
        "SELECT source_path FROM documents WHERE game_id=%s", (game_id,)
    ).fetchall()
    for version in versions:
        for table in ("jobs", "assets", "chunks"):
            # Table names come exclusively from this fixed allowlist.
            db.execute(f"DELETE FROM {table} WHERE version_id=%s", (version["id"],))
        db.execute("DELETE FROM versions WHERE id=%s", (version["id"],))
    db.execute("DELETE FROM documents WHERE game_id=%s", (game_id,))
    db.execute("DELETE FROM games WHERE id=%s", (game_id,))
for document in documents:
    storage_path(document["source_path"]).unlink(missing_ok=True)
for version in versions:
    target = storage_path(f"processed/{version['id']}")
    if target.is_dir():
        shutil.rmtree(target)
print("Synthetic E2E game removed.")
