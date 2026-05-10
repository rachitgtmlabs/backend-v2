#!/usr/bin/env python3
"""
PDF text extraction via PyMuPDF (fitz).

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
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

def resolve_pymupdf_module():
    try:
        import pymupdf as pymupdf_mod

        return pymupdf_mod
    except Exception:
        import fitz as fitz_mod  # type: ignore

        return fitz_mod


def extract_with_pymupdf(pdf_path: Path) -> tuple[str, list[dict[str, Any]]]:
    fitz = resolve_pymupdf_module()
    if not hasattr(fitz, "open"):
        raise RuntimeError(
            f"Imported module '{getattr(fitz, '__name__', 'unknown')}' has no open()"
        )

    doc = fitz.open(pdf_path)
    text_parts = []
    pages = []

    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        text_parts.append(page_text)
        pages.append({
            "page_number": page_num,
            "text": page_text
        })

    full_text = "\n".join(text_parts).strip()
    return full_text, pages


def extract_pdf(pdf_path: Path) -> dict[str, Any]:
    try:
        text, pages = extract_with_pymupdf(pdf_path)
    except Exception as e:
        print(f"PyMuPDF extraction failed: {e}", file=sys.stderr)
        text = ""
        pages = []

    return {
        "source_pdf": str(pdf_path.resolve()),
        "det_arch": None,
        "reco_arch": None,
        "full_text": text,
        "pages": pages,
        "exported": None,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PDF text extraction (PyMuPDF)")
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
