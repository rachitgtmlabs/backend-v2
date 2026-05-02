#!/usr/bin/env python3
"""
Fast PDF text extraction with smart fallback:

PRIMARY:
  • PyMuPDF (fitz) → instant text extraction (for digital PDFs)

FALLBACK:
  • docTR OCR → only if text extraction fails / is too small

Output schema (unchanged):
  {
    "source_pdf": str,
    "det_arch":   str | null,
    "reco_arch":  str | null,
    "full_text":  str,
    "exported":   dict | null
  }

Usage:
  python extract.py --warmup
  python extract.py file.pdf
  python extract.py file.pdf --json-out out.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Optional


# OCR config (used only for fallback)
DET_ARCH = "db_mobilenet_v3_large"
RECO_ARCH = "parseq"

# Heuristic threshold
MIN_TEXT_LENGTH = 100


# ---------------------------------------------------------------------------
# FAST PATH: PyMuPDF
# ---------------------------------------------------------------------------

def extract_with_pymupdf(pdf_path: Path) -> str:
    import fitz  # PyMuPDF

    doc = fitz.open(pdf_path)
    text_parts = []

    for page in doc:
        text_parts.append(page.get_text())

    return "\n".join(text_parts).strip()


# ---------------------------------------------------------------------------
# FALLBACK: docTR OCR
# ---------------------------------------------------------------------------

def _build_predictor():
    from doctr.models import ocr_predictor

    return ocr_predictor(
        det_arch=DET_ARCH,
        reco_arch=RECO_ARCH,
        pretrained=True,
        assume_straight_pages=True,
    )


def extract_with_doctr(pdf_path: Path) -> dict[str, Any]:
    from doctr.io import DocumentFile

    predictor = _build_predictor()

    doc = DocumentFile.from_pdf(str(pdf_path))
    result = predictor(doc)

    exported = result.export()
    full_text = _flatten_text_from_export(exported)

    return {
        "full_text": full_text,
        "exported": exported,
    }


def _flatten_text_from_export(exported: dict) -> str:
    lines_out: list[str] = []

    for page in exported.get("pages", []):
        for block in page.get("blocks", []):
            for line in block.get("lines", []):
                parts = [
                    w["value"]
                    for w in line.get("words", [])
                    if w.get("value")
                ]
                if parts:
                    lines_out.append(" ".join(parts))

    return "\n".join(lines_out)


# ---------------------------------------------------------------------------
# MAIN EXTRACTION LOGIC
# ---------------------------------------------------------------------------

def extract_pdf(pdf_path: Path) -> dict[str, Any]:
    print("Fast extraction (PyMuPDF)...", file=sys.stderr)

    try:
        text = extract_with_pymupdf(pdf_path)
    except Exception as e:
        print(f"PyMuPDF failed: {e}", file=sys.stderr)
        text = ""

    # Decide fallback
    if len(text.strip()) >= MIN_TEXT_LENGTH:
        print("Using fast path (no OCR needed)", file=sys.stderr)

        return {
            "source_pdf": str(pdf_path.resolve()),
            "det_arch": None,
            "reco_arch": None,
            "full_text": text,
            "exported": None,
        }

    # Fallback to OCR
    print("Falling back to OCR (docTR)...", file=sys.stderr)

    ocr_result = extract_with_doctr(pdf_path)

    return {
        "source_pdf": str(pdf_path.resolve()),
        "det_arch": DET_ARCH,
        "reco_arch": RECO_ARCH,
        "full_text": ocr_result["full_text"],
        "exported": ocr_result["exported"],
    }


# ---------------------------------------------------------------------------
# WARMUP (for NestJS / container startup)
# ---------------------------------------------------------------------------

def warmup():
    print("Warming up docTR (loading model)...", file=sys.stderr)
    _ = _build_predictor()
    print(f"docTR ready: det={DET_ARCH}, reco={RECO_ARCH}", file=sys.stderr)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fast PDF text extraction with OCR fallback",
    )

    parser.add_argument(
        "--warmup",
        action="store_true",
        help="Preload OCR model",
    )

    parser.add_argument(
        "pdf",
        nargs="?",
        type=Path,
        help="Path to PDF",
    )

    parser.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Write output to file",
    )

    args = parser.parse_args()

    if args.warmup:
        warmup()
        return 0

    if not args.pdf:
        parser.error("Provide a PDF path or use --warmup")

    if not args.pdf.exists():
        print(f"File not found: {args.pdf}", file=sys.stderr)
        return 1

    try:
        payload = extract_pdf(args.pdf)
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