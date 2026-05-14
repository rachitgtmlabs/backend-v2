#!/usr/bin/env python3
"""
PDF text extraction via Google Document AI (Document OCR processor).

PDFs exceeding the 30-page API limit are split into chunks and processed
sequentially; results are merged into a single output.

Output schema:
  {
    "source_pdf": str,
    "det_arch":   null,
    "reco_arch":  null,
    "full_text":  str,
    "pages":      list[{"page_number": int, "text": str}],
    "exported":   null
  }

Usage:
  python ocr_extraction.py file.pdf
  python ocr_extraction.py file.pdf --json-out out.json

Required env vars:
  GOOGLE_APPLICATION_CREDENTIALS  — path to service account JSON key file
    OR gcloud ADC already configured

  DOCUMENT_AI_PROJECT_ID    — GCP project number or ID
  DOCUMENT_AI_LOCATION      — processor location, e.g. "us"
  DOCUMENT_AI_PROCESSOR_ID  — processor ID, e.g. "4c9566a49771c217"

Optional env vars:
  DOCUMENT_AI_IMAGELESS — set to "true" for imageless mode (30-page limit, text-only PDFs)
                          Default: non-imageless/OCR mode (15-page limit, works for all PDFs)
"""

from __future__ import annotations

import argparse
import concurrent.futures
import io
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# Document AI OCR hard limits:
#   - imageless mode (text-only PDFs): 30 pages — only for digitally-created PDFs
#   - non-imageless/OCR mode (scanned PDFs): 15 pages — works for all PDFs
def _is_imageless_mode() -> bool:
    """Check if imageless mode is enabled via env var (only for text-based PDFs)."""
    return os.environ.get("DOCUMENT_AI_IMAGELESS", "").lower() == "true"

def _get_page_limit() -> int:
    """Return page limit based on configured mode."""
    return 30 if _is_imageless_mode() else 15


def _get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _page_text_from_document(document: Any) -> list[str]:
    """Extract ordered per-page text from a Document AI document object."""
    page_texts: list[str] = []
    for page in document.pages:
        tokens = []
        for token in page.tokens:
            for seg in token.layout.text_anchor.text_segments:
                start = int(seg.start_index) if seg.start_index else 0
                end = int(seg.end_index)
                tokens.append(document.text[start:end])
        page_texts.append("".join(tokens).strip())
    return page_texts


def _split_pdf_bytes(pdf_bytes: bytes, chunk_size: int) -> list[bytes]:
    """Split a PDF into chunks of at most chunk_size pages, return as list of byte strings."""
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(io.BytesIO(pdf_bytes))
    total = len(reader.pages)
    chunks: list[bytes] = []

    for start in range(0, total, chunk_size):
        writer = PdfWriter()
        for page in reader.pages[start : start + chunk_size]:
            writer.add_page(page)
        buf = io.BytesIO()
        writer.write(buf)
        chunks.append(buf.getvalue())

    return chunks


def extract_with_document_ai(pdf_path: Path) -> tuple[str, list[dict[str, Any]]]:
    from google.api_core.client_options import ClientOptions
    from google.cloud import documentai

    project_id = _get_required_env("DOCUMENT_AI_PROJECT_ID")
    location = _get_required_env("DOCUMENT_AI_LOCATION")
    processor_id = _get_required_env("DOCUMENT_AI_PROCESSOR_ID")

    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)
    processor_name = client.processor_path(project_id, location, processor_id)

    imageless = _is_imageless_mode()
    page_limit = _get_page_limit()
    mode_name = "imageless" if imageless else "OCR"

    pdf_bytes = pdf_path.read_bytes()
    chunks = _split_pdf_bytes(pdf_bytes, page_limit)

    if len(chunks) > 1:
        print(
            f"PDF exceeds {page_limit}-page chunk limit ({mode_name} mode) — processing in {len(chunks)} chunks.",
            file=sys.stderr,
        )

    # Build process_options for imageless mode (native PDF parsing allows 30 pages)
    # Note: imageless mode only works for text-based PDFs; scanned PDFs will still fail
    process_options = None
    if imageless:
        process_options = documentai.ProcessOptions(
            ocr_config=documentai.OcrConfig(
                enable_native_pdf_parsing=True,
            ),
        )

    def _process_chunk(args: tuple[int, bytes]) -> tuple[int, list[str]]:
        i, chunk_bytes = args
        raw_document = documentai.RawDocument(
            content=chunk_bytes,
            mime_type="application/pdf",
        )
        request = documentai.ProcessRequest(
            name=processor_name,
            raw_document=raw_document,
            process_options=process_options,
        )
        result = client.process_document(request=request)
        chunk_texts = _page_text_from_document(result.document)
        print(f"Chunk {i + 1}/{len(chunks)}: extracted {len(chunk_texts)} pages.", file=sys.stderr)
        return i, chunk_texts

    results: list[tuple[int, list[str]]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(chunks)) as executor:
        futures = [executor.submit(_process_chunk, (i, cb)) for i, cb in enumerate(chunks)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda x: x[0])
    all_page_texts: list[str] = []
    for _, chunk_texts in results:
        all_page_texts.extend(chunk_texts)

    pages = [
        {"page_number": i + 1, "text": text}
        for i, text in enumerate(all_page_texts)
    ]
    full_text = "\n".join(all_page_texts).strip()

    return full_text, pages


def extract_pdf(pdf_path: Path) -> dict[str, Any]:
    ocr_started = time.perf_counter()
    try:
        text, pages = extract_with_document_ai(pdf_path)
    except Exception as e:
        elapsed_s = time.perf_counter() - ocr_started
        print(f"Document AI extraction failed: {e}", file=sys.stderr)
        print(
            f"OCR extraction time: {elapsed_s:.2f}s (failed before completion).",
            file=sys.stderr,
        )
        text = ""
        pages = []
    else:
        elapsed_s = time.perf_counter() - ocr_started
        page_count = len(pages)
        print(
            f"OCR extraction time: {elapsed_s:.2f}s — completed successfully "
            f"({page_count} page{'s' if page_count != 1 else ''} extracted).",
            file=sys.stderr,
        )

    return {
        "source_pdf": str(pdf_path.resolve()),
        "det_arch": None,
        "reco_arch": None,
        "full_text": text,
        "pages": pages,
        "exported": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PDF text extraction (Google Document AI)")
    parser.add_argument("pdf", type=Path, help="Path to PDF")
    parser.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Write output to file",
    )

    args = parser.parse_args()
    pdf = args.pdf

    if not pdf.exists():
        print(f"File not found: {pdf}", file=sys.stderr)
        return 1

    try:
        payload = extract_pdf(pdf)
    except Exception as e:
        print(f"Extraction failed: {e}", file=sys.stderr)
        return 1

    output = json.dumps(payload, ensure_ascii=False, indent=2)

    if args.json_out:
        args.json_out.write_text(output, encoding="utf-8")
        print(f"Wrote {args.json_out}", file=sys.stderr)
    else:
        print(output)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
