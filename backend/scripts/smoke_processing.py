"""Exercise the running API and worker with synthetic PDF and OCR inputs."""

import io
import json
import time
import urllib.error
import urllib.request
import zlib
from http.cookiejar import CookieJar
from uuid import uuid4

from PIL import Image, ImageDraw, ImageFont

from app import config
from app.db import connect
from app.storage import storage_path


def create_pdf(card: Image.Image) -> bytes:
    image_data = zlib.compress(card.convert("RGB").tobytes())
    commands = b"BT /F1 24 Tf 50 760 Td (TEST GAME RULES) Tj /F1 14 Tf 0 -50 Td (Each player receives three cards.) Tj 0 -30 Td (On your turn, take two actions.) Tj 0 -30 Td (You cannot move after an attack.) Tj ET q 160 0 0 220 50 380 cm /Card Do Q"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> /XObject << /Card 6 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(commands)} >>\nstream\n".encode() + commands + b"\nendstream",
        f"<< /Type /XObject /Subtype /Image /Width {card.width} /Height {card.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length {len(image_data)} >>\nstream\n".encode()
        + image_data
        + b"\nendstream",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, body in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode() + body + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(output)


def main():
    base = "http://api:8000/api"
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))

    def request(path, body=None):
        payload = json.dumps(body).encode() if body is not None else None
        with opener.open(
            urllib.request.Request(
                base + path, data=payload, headers={"Content-Type": "application/json"}
            ),
            timeout=30,
        ) as response:
            return json.load(response)

    request("/auth/login", {"username": config.ADMIN_USERNAME, "password": config.ADMIN_PASSWORD})
    game = request(
        "/games", {"title": f"__e2e__ PDF OCR smoke {uuid4().hex[:8]}", "language": "en"}
    )
    print(f"SMOKE_GAME_ID={game['id']}", flush=True)
    card = Image.new("RGB", (400, 560), "#244c3a")
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((15, 15, 385, 545), radius=24, outline="#dae3be", width=8)
    draw.text((70, 45), "MOVE", font=ImageFont.load_default(size=55), fill="white")
    draw.polygon([(200, 145), (320, 270), (200, 395), (80, 270)], fill="#d8c395")
    draw.text((70, 445), "2 STEPS", font=ImageFont.load_default(size=42), fill="white")
    scan = Image.new("RGB", (1400, 900), "white")
    draw = ImageDraw.Draw(scan)
    font = ImageFont.load_default(size=42)
    for y, text in [
        (60, "BOARD GAME RULES"),
        (170, "Each player receives three cards."),
        (280, "You can take two actions on your turn."),
        (390, "Moving after an attack is not allowed."),
    ]:
        draw.text((60, y), text, font=font, fill="black")
    image_buffer = io.BytesIO()
    scan.save(image_buffer, format="PNG")
    for filename, payload, content_type in [
        ("rules.pdf", create_pdf(card), "application/pdf"),
        ("scan.png", image_buffer.getvalue(), "image/png"),
    ]:
        boundary = f"rules-{uuid4().hex}"
        multipart = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()
            + payload
            + f"\r\n--{boundary}--\r\n".encode()
        )
        with opener.open(
            urllib.request.Request(
                base + f"/games/{game['id']}/documents",
                data=multipart,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            ),
            timeout=30,
        ) as response:
            document = json.load(response)
        request(f"/documents/{document['id']}/process", {})
        deadline = time.monotonic() + 600
        while time.monotonic() < deadline:
            documents = request(f"/games/{game['id']}/documents")
            current = next(d for d in documents if d["id"] == document["id"])
            if current["status"] == "failed":
                raise RuntimeError(f"{filename}: {current['error']}")
            if current["status"] == "ready":
                preview = request(f"/versions/{current['version_id']}/preview")
                content = " ".join(c["content"] for c in preview["chunks"]).lower()
                assert "cards" in content, content
                assert current["page_count"] == 1
                assert all(c["page"] == 1 for c in preview["chunks"])
                with connect() as db:
                    job = db.execute(
                        "SELECT lease_token FROM jobs WHERE version_id=%s",
                        (current["version_id"],),
                    ).fetchone()
                runtime = json.loads(
                    storage_path(
                        f"processed/{current['version_id']}/{job['lease_token']}/acceleration.json"
                    ).read_text()
                )
                print(f"RUNTIME {filename}: {runtime}", flush=True)
                for asset in preview["assets"]:
                    with opener.open(base + f"/assets/{asset['id']}") as response:
                        assert response.read(8) == b"\x89PNG\r\n\x1a\n"
                print(
                    f"PASS {filename}: {current['chunk_count']} chunks, {current['asset_count']} original figures, page provenance retained",
                    flush=True,
                )
                break
            time.sleep(2)
        else:
            raise TimeoutError(f"{filename}: processing did not complete")
    print("PDF and image OCR smoke tests passed.", flush=True)


if __name__ == "__main__":
    main()
