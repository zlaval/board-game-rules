from pathlib import Path

from .db import connect


def migrate():
    with connect() as db:
        db.execute("SELECT pg_advisory_xact_lock(734612)")
        db.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        for path in sorted((Path(__file__).parent.parent / "migrations").glob("*.sql")):
            if not db.execute(
                "SELECT 1 FROM schema_migrations WHERE name = %s", (path.name,)
            ).fetchone():
                db.execute(path.read_text(encoding="utf-8"))
                db.execute("INSERT INTO schema_migrations(name) VALUES (%s)", (path.name,))
                print(f"Applied migration {path.name}", flush=True)


if __name__ == "__main__":
    migrate()
