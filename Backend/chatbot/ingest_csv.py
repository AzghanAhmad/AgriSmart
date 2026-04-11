"""
Ingest Q/A rows from one or multiple CSV files into the ChromaDB collection.

Run examples:
  python ingest_csv.py
  python ingest_csv.py --csv wheat_qa_dataset.csv rice_qa_dataset.csv maize_qa_dataset.csv
  python ingest_csv.py --csv wheat_qa_dataset.csv --limit 1500
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from typing import Dict, List, Optional


def _project_root() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _read_rows(csv_path: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            rows.append({k: (v or "").strip() for k, v in row.items()})
            if limit is not None and i >= limit:
                break
    return rows


def _row_to_text(row: Dict[str, str]) -> str:
    q = row.get("text", "").strip()
    a = row.get("answer", "").strip()
    label = row.get("label", "").strip()
    crop = row.get("crop", "").strip()
    lang = row.get("language", "").strip()

    header_bits = []
    if crop:
        header_bits.append(f"Crop: {crop}")
    if lang:
        header_bits.append(f"Language: {lang}")
    if label:
        header_bits.append(f"Label: {label}")
    header = " | ".join(header_bits)

    if header:
        return f"{header}\n\nQ: {q}\n\nA: {a}".strip()
    return f"Q: {q}\n\nA: {a}".strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Q/A CSV(s) into ChromaDB")
    parser.add_argument(
        "--csv", 
        dest="csv_paths", 
        nargs="+",                    # ← Allows multiple files
        default=["wheat_qa_dataset.csv"],
        help="One or more CSV files to ingest (space separated)"
    )
    parser.add_argument("--limit", type=int, default=None, help="Ingest only first N rows per file")
    
    args = parser.parse_args()

    root = _project_root()
    
    # Import here so --help doesn't require langchain
    from langchain_core.documents import Document
    from ingest import load_vectorstore, COLLECTION_NAME

    print(f"Loading vectorstore collection: {COLLECTION_NAME}")
    os.chdir(root)
    vs = load_vectorstore()

    total_docs = 0

    for csv_filename in args.csv_paths:
        csv_path = csv_filename
        if not os.path.isabs(csv_path):
            csv_path = os.path.join(root, csv_path)

        if not os.path.exists(csv_path):
            print(f"⚠️  CSV not found: {csv_path} → Skipping")
            continue

        print(f"\n📂 Processing: {os.path.basename(csv_path)}")
        
        rows = _read_rows(csv_path, limit=args.limit)
        if not rows:
            print(f"   No rows found in {os.path.basename(csv_path)}")
            continue

        docs: List[Document] = []
        for row in rows:
            text = _row_to_text(row)
            if not text:
                continue
                
            meta = {
                "source": os.path.basename(csv_path),
                "type": "qa_csv",
                "row_id": row.get("id", ""),
                "language": row.get("language", ""),
                "crop": row.get("crop", ""),
                "label": row.get("label", ""),
            }
            docs.append(Document(page_content=text, metadata=meta))

        if docs:
            print(f"   Adding {len(docs)} documents...")
            vs.add_documents(docs)
            total_docs += len(docs)
        else:
            print("   No valid documents to add.")

    print(f"\n✅ Completed! Total {total_docs} documents added to ChromaDB.")


if __name__ == "__main__":
    main()