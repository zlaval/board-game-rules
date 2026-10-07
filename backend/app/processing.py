"""Document extraction runs in an isolated subprocess supervised by the worker."""

import json
import os
import re
import sys
from pathlib import Path
from uuid import uuid4

from .config import MAX_DOCUMENT_PAGES, MAX_UPLOAD_BYTES
from .acceleration import convert_with_fallback
from .ocr_models import prepare_ocr_models


def progress(output: Path, stage: str, percent: int):
    temporary = output / "progress.tmp"
    temporary.write_text(json.dumps({"stage": stage, "progress": percent}), encoding="utf-8")
    temporary.replace(output / "progress.json")


def split_text(text: str, limit: int = 1800) -> list[str]:
    pieces = []
    while len(text) > limit:
        cut = text.rfind(" ", 0, limit + 1)
        if cut < limit // 2:
            cut = limit
        pieces.append(text[:cut].strip())
        text = text[cut:].strip()
    if text.strip():
        pieces.append(text.strip())
    return pieces


def extract_text(path: Path):
    text = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    sections = []
    heading = ""
    buffer = []

    def flush():
        paragraph = "\n".join(buffer).strip()
        if paragraph:
            sections.append(
                {
                    "text": paragraph,
                    "heading": heading,
                    "page": None,
                    "source_ref": f"section-{len(sections) + 1}",
                    "provenance": [],
                }
            )
        buffer.clear()

    for line in text.splitlines():
        match = re.match(r"^#{1,6}\s+(.+)$", line)
        if match:
            flush()
            heading = match.group(1).strip()
        elif not line.strip():
            flush()
        else:
            buffer.append(line)
    flush()
    return sections, [], 0, "text-v1"


def extract_docling(path: Path, output: Path):
    from docling.datamodel.accelerator_options import AcceleratorOptions
    from docling.datamodel.base_models import ConversionStatus, InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions
    from docling.document_converter import DocumentConverter, ImageFormatOption, PdfFormatOption

    def convert(device):
        progress(output, f"loading_ocr ({device})", 20)
        options = PdfPipelineOptions()
        options.accelerator_options = AcceleratorOptions(num_threads=2, device=device)
        # ONNX Runtime is CPU-only here; torch shares the CUDA-enabled PyTorch runtime.
        backend = "onnxruntime" if device == "cpu" else "torch"
        cache = (
            Path(os.environ.get("DOCLING_CACHE_DIR", str(Path.home() / ".cache/docling")))
            / "rapidocr"
        )
        options.ocr_options = RapidOcrOptions(
            backend=backend,
            **prepare_ocr_models(cache, backend),
            rapidocr_params={"Global.model_root_dir": cache},
        )
        options.generate_page_images = True
        options.generate_picture_images = True
        options.images_scale = 1.5
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=options),
                InputFormat.IMAGE: ImageFormatOption(pipeline_options=options),
            }
        )
        result = converter.convert(
            path, max_num_pages=MAX_DOCUMENT_PAGES, max_file_size=MAX_UPLOAD_BYTES
        )
        if result.status != ConversionStatus.SUCCESS:
            raise ValueError("Document conversion was incomplete. Check the file and page limit.")
        return result

    result = convert_with_fallback(convert, output)
    doc = result.document
    doc.save_as_json(output / "document.json")
    (output / "document.md").write_text(doc.export_to_markdown(), encoding="utf-8")
    progress(output, "extracting_sections", 70)
    sections = []
    heading = ""
    for item, _ in doc.iterate_items():
        label = getattr(getattr(item, "label", None), "value", "")
        content = getattr(item, "text", "")
        if label == "table" and hasattr(item, "export_to_markdown"):
            content = item.export_to_markdown(doc=doc)
        if not content or label in {"page_header", "page_footer"}:
            continue
        if label in {"title", "section_header"}:
            heading = content
        provenance = [p.model_dump(mode="json") for p in getattr(item, "prov", [])]
        sections.append(
            {
                "text": content,
                "heading": heading,
                "page": provenance[0].get("page_no") if provenance else None,
                "source_ref": item.self_ref,
                "provenance": provenance,
            }
        )
    assets = []
    for picture in doc.pictures:
        image = picture.get_image(doc)
        if image is None:
            continue
        asset_id = str(uuid4())
        image.convert("RGB").save(output / f"{asset_id}.png")
        provenance = [p.model_dump(mode="json") for p in picture.prov]
        assets.append(
            {
                "id": asset_id,
                "filename": f"{asset_id}.png",
                "caption": picture.caption_text(doc),
                "page": provenance[0].get("page_no") if provenance else None,
                "provenance": provenance,
            }
        )
    return sections, assets, len(doc.pages), "docling-v2"


def process(path: Path, output: Path):
    output.mkdir(parents=True, exist_ok=True)
    progress(output, "extracting_text", 15)
    if path.suffix.lower() in {".txt", ".md"}:
        sections, assets, pages, processor = extract_text(path)
    else:
        sections, assets, pages, processor = extract_docling(path, output)
    chunks = []
    for section in sections:
        for content in split_text(section["text"]):
            chunks.append(
                {**section, "content": content, "id": str(uuid4()), "ordinal": len(chunks)}
            )
    if not chunks:
        raise ValueError(
            "Could not extract readable rule text. Check the document or image quality."
        )
    if len(chunks) > 20000:
        raise ValueError("Too many rule sections. Split the material into smaller documents.")
    progress(output, "preparing_search", 90)
    manifest = {
        "chunks": chunks,
        "assets": assets,
        "page_count": pages,
        "character_count": sum(len(c["content"]) for c in chunks),
        "processor": processor,
    }
    (output / "result.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    process(Path(sys.argv[1]), Path(sys.argv[2]))
