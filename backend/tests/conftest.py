import os
import tempfile
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo


def pytest_configure(config):
    # Integration tests always get their own database; application data is untouched.
    original = os.environ["DATABASE_URL"]
    name = f"rules_test_{uuid4().hex}"
    with psycopg.connect(original, autocommit=True) as db:
        db.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    parameters = conninfo_to_dict(original)
    parameters["dbname"] = name
    os.environ["DATABASE_URL"] = make_conninfo(**parameters)
    os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="rules-tests-")
    config._rules_test_database = (original, name)
    from app.migrate import migrate

    migrate()


def pytest_unconfigure(config):
    entry = getattr(config, "_rules_test_database", None)
    if entry:
        original, name = entry
        with psycopg.connect(original, autocommit=True) as db:
            db.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app import config
    from app.db import connect
    from app.main import app

    with connect() as db:
        db.execute("TRUNCATE games,sessions CASCADE")
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/auth/login",
            json={"username": config.ADMIN_USERNAME, "password": config.ADMIN_PASSWORD},
        )
        assert response.status_code == 200
        yield test_client
