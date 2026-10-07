import json
import logging
import signal
import subprocess
import sys
import threading
import time
from uuid import uuid4

from psycopg.types.json import Jsonb

from .db import connect
from .storage import storage_path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")
stop = threading.Event()


def claim():
    with connect() as db:
        exhausted = db.execute(
            "UPDATE jobs SET state='failed',lease_token=NULL WHERE state='running' AND lease_until<now() AND attempts>=3 RETURNING version_id"
        ).fetchall()
        for row in exhausted:
            db.execute(
                "UPDATE versions SET status='failed',stage='interrupted',error='worker_interrupted',finished_at=now() WHERE id=%s",
                (row["version_id"],),
            )
        job = db.execute(
            "SELECT * FROM jobs WHERE state='queued' OR (state='running' AND lease_until<now() AND attempts<3) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1"
        ).fetchone()
        if not job:
            return None
        token = uuid4()
        db.execute(
            "UPDATE jobs SET state='running', attempts=attempts+1,lease_until=now()+interval '60 seconds',lease_token=%s WHERE id=%s",
            (token, job["id"]),
        )
        db.execute(
            "UPDATE versions SET status='processing',stage='starting',progress=5,error=NULL WHERE id=%s",
            (job["version_id"],),
        )
        document = db.execute(
            "SELECT d.* FROM documents d JOIN versions v ON v.document_id=d.id WHERE v.id=%s",
            (job["version_id"],),
        ).fetchone()
        return {**job, "token": token, "document": document}


def heartbeat(job, stage, percent):
    with connect() as db:
        owned = db.execute(
            "UPDATE jobs SET lease_until=now()+interval '60 seconds' WHERE id=%s AND lease_token=%s AND state='running' RETURNING id",
            (job["id"], job["token"]),
        ).fetchone()
        if not owned:
            return False
        db.execute(
            "UPDATE versions SET stage=%s,progress=%s WHERE id=%s",
            (stage, percent, job["version_id"]),
        )
    return True


def fail(job, message):
    with connect() as db:
        owned = db.execute(
            "UPDATE jobs SET state='failed',lease_until=NULL WHERE id=%s AND lease_token=%s AND state='running' RETURNING id",
            (job["id"], job["token"]),
        ).fetchone()
        if owned:
            db.execute(
                "UPDATE versions SET status='failed',stage='failed',error=%s,finished_at=now() WHERE id=%s",
                (message[:1000], job["version_id"]),
            )


def complete(job, manifest, relative_output):
    with connect() as db:
        owned = db.execute(
            "SELECT id FROM jobs WHERE id=%s AND lease_token=%s AND state='running' FOR UPDATE",
            (job["id"], job["token"]),
        ).fetchone()
        if not owned:
            return False
        version = job["version_id"]
        with db.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO chunks(id,version_id,ordinal,heading,content,page,source_ref,provenance) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                [
                    (
                        c["id"],
                        version,
                        c["ordinal"],
                        c["heading"],
                        c["content"],
                        c["page"],
                        c["source_ref"],
                        Jsonb(c["provenance"]),
                    )
                    for c in manifest["chunks"]
                ],
            )
            cursor.executemany(
                "INSERT INTO assets(id,version_id,ordinal,path,caption,page,provenance) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                [
                    (
                        a["id"],
                        version,
                        i,
                        f"{relative_output}/{a['filename']}",
                        a["caption"],
                        a["page"],
                        Jsonb(a["provenance"]),
                    )
                    for i, a in enumerate(manifest["assets"])
                ],
            )
        db.execute(
            "UPDATE versions SET status='ready',stage='ready',progress=100,page_count=%s,character_count=%s,processor=%s,finished_at=now() WHERE id=%s",
            (manifest["page_count"], manifest["character_count"], manifest["processor"], version),
        )
        db.execute("UPDATE jobs SET state='done',lease_until=NULL WHERE id=%s", (job["id"],))
        return True


def run_job(job):
    relative = f"processed/{job['version_id']}/{job['token']}"
    output = storage_path(relative)
    output.mkdir(parents=True, exist_ok=True)
    log.info("Processing job %s", job["id"])
    with (output / "processing.log").open("w", encoding="utf-8") as logfile:
        child = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "app.processing",
                str(storage_path(job["document"]["source_path"])),
                str(output),
            ],
            stdout=logfile,
            stderr=subprocess.STDOUT,
        )
        started = time.monotonic()
        next_heartbeat = 0
        try:
            while child.poll() is None:
                if stop.is_set():
                    # Leave the durable lease to expire so a restarted worker can recover it.
                    return
                if time.monotonic() - started > 1800:
                    fail(
                        job,
                        "processing_timeout",
                    )
                    return
                if time.monotonic() >= next_heartbeat:
                    state = {"stage": "processing", "progress": 10}
                    try:
                        state = json.loads((output / "progress.json").read_text(encoding="utf-8"))
                    except (FileNotFoundError, json.JSONDecodeError):
                        pass
                    if not heartbeat(job, state["stage"], state["progress"]):
                        return
                    next_heartbeat = time.monotonic() + 10
                stop.wait(0.5)
            if child.returncode:
                detail = (output / "processing.log").read_text(encoding="utf-8", errors="replace")
                log.error("Job %s failed: %s", job["id"], detail[-2000:])
                fail(
                    job,
                    "processing_failed",
                )
                return
            manifest = json.loads((output / "result.json").read_text(encoding="utf-8"))
            complete(job, manifest, relative)
            log.info("Job %s completed", job["id"])
        finally:
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


def main():
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    log.info("Document worker started")
    while not stop.is_set():
        job = None
        try:
            job = claim()
            if job:
                run_job(job)
            else:
                stop.wait(2)
        except Exception:
            log.exception("Worker iteration failed")
            # A leased job is recovered after expiry; never acknowledge lost work.
            stop.wait(5)


if __name__ == "__main__":
    main()
