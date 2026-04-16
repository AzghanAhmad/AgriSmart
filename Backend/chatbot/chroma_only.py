"""
ChromaDB-only retrieval: no LLM (no Groq). Returns text built only from stored chunks.

Uses the same DB and embeddings as ingest.py / chatbot.py.

  python chroma_only.py "wheat rust symptoms"
  python chroma_only.py "gandum zang" --k 6
"""
from __future__ import annotations

import argparse
import os
import sys
import warnings

warnings.filterwarnings("ignore")

from ingest import load_vectorstore

DEFAULT_K = 4


def get_response_text_from_chroma(query: str, k: int = DEFAULT_K) -> str:
    """
    Similarity search only. `response_text` is the joined page_content from Chroma hits
    (plus source labels), not model-generated prose.
    """
    query = (query or "").strip()
    if not query:
        return ""

    _root = os.path.dirname(os.path.abspath(__file__))
    _prev = os.getcwd()
    docs: list = []
    try:
        os.chdir(_root)
        vs = load_vectorstore()
        retriever = vs.as_retriever(
            search_type="similarity",
            search_kwargs={"k": max(1, k)},
        )
        docs = retriever.invoke(query)
    finally:
        os.chdir(_prev)

    if not docs:
        return "No matching chunks found in ChromaDB for this query."

    parts = []
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        crop = doc.metadata.get("crop", "general")
        parts.append(f"[{src} | crop: {crop}]\n{doc.page_content.strip()}")

    return "\n\n---\n\n".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Retrieve text from ChromaDB only (no Groq / no LLM)."
    )
    parser.add_argument("query", nargs="*", help="Search query")
    parser.add_argument(
        "-k",
        "--k",
        type=int,
        default=DEFAULT_K,
        help=f"Number of chunks to retrieve (default {DEFAULT_K})",
    )
    args = parser.parse_args()

    q = " ".join(args.query).strip()
    if not q:
        print("Usage: python chroma_only.py \"your question\" [--k 4]")
        sys.exit(1)

    text = get_response_text_from_chroma(q, k=args.k)
    print(text)


if __name__ == "__main__":
    main()
