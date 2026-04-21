import os
import sys

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(_THIS_DIR, "pdfs")
CHROMA_PATH = os.path.join(_THIS_DIR, "wheat_cotton_rice_db")
COLLECTION_NAME = "agrismart_docs"

# Advanced RAG defaults (token-based)
CHUNK_SIZE_TOKENS = int(os.getenv("AGRISMART_CHUNK_SIZE_TOKENS", "500"))
CHUNK_OVERLAP_TOKENS = int(os.getenv("AGRISMART_CHUNK_OVERLAP_TOKENS", "100"))

# 768-d multilingual embeddings (matches the advanced spec)
EMBEDDING_MODEL_NAME = os.getenv(
    "AGRISMART_EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
)

def detect_crop_from_filename(filename: str) -> str:
    f = filename.lower()
    if any(w in f for w in ["wheat", "gandum", "rust", "cimmyt"]):
        return "wheat"
    elif any(w in f for w in ["rice", "chawal", "irri"]):
        return "rice"
    elif any(w in f for w in ["cotton", "kapas"]):
        return "cotton"
    elif any(w in f for w in ["pest", "keere"]):
        return "pest"
    elif any(w in f for w in ["fertilizer", "khad"]):
        return "fertilizer"
    return "general"

def load_all_pdfs():
    from langchain_community.document_loaders import PyMuPDFLoader
    import warnings
    warnings.filterwarnings("ignore")  # suppress empty page warnings

    documents = []

    if not os.path.exists(PDF_DIR):
        os.makedirs(PDF_DIR)
        print("Created /pdfs folder. Add your PDFs there and run again.")
        sys.exit(0)

    pdf_files = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")]

    if not pdf_files:
        print("No PDFs found in /pdfs folder!")
        sys.exit(0)

    print(f"Found {len(pdf_files)} PDFs\n")

    for filename in pdf_files:
        filepath = os.path.join(PDF_DIR, filename)
        print(f"Loading: {filename}")
        try:
            loader = PyMuPDFLoader(filepath)
            docs = loader.load()
            # Filter out empty pages
            docs = [d for d in docs if d.page_content.strip()]
            for doc in docs:
                doc.metadata["source"] = filename
                doc.metadata["crop"] = detect_crop_from_filename(filename)
            documents.extend(docs)
            print(f"  -> {len(docs)} pages loaded")
        except Exception as e:
            print(f"  -> SKIPPED (error): {e}")

    print(f"\nTotal pages loaded: {len(documents)}")
    return documents

def split_documents(documents):
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    # Token-based chunks (preferred over raw characters for RAG stability).
    # Uses tiktoken encoder if available; falls back to char-based split if not.
    try:
        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=CHUNK_SIZE_TOKENS,
            chunk_overlap=CHUNK_OVERLAP_TOKENS,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    except Exception:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE_TOKENS * 4,      # rough fallback ≈ 4 chars/token
            chunk_overlap=CHUNK_OVERLAP_TOKENS * 4,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    chunks = splitter.split_documents(documents)
    # Remove empty chunks
    chunks = [c for c in chunks if c.page_content.strip()]
    print(f"Total chunks created: {len(chunks)}")
    return chunks

def build_vectorstore(chunks):
    from langchain_huggingface import HuggingFaceEmbeddings  # updated import
    from langchain_community.vectorstores import Chroma
    import warnings
    warnings.filterwarnings("ignore")

    print("\nLoading multilingual embedding model...")
    print("Please wait...\n")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

    print("Building ChromaDB vectorstore...")

    batch_size = 500
    vectorstore = None

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(chunks) // batch_size) + 1
        print(f"  Processing batch {batch_num} / {total_batches}")

        if vectorstore is None:
            vectorstore = Chroma.from_documents(
                documents=batch,
                embedding=embeddings,
                collection_name=COLLECTION_NAME,
                persist_directory=CHROMA_PATH
            )
        else:
            vectorstore.add_documents(batch)

    print(f"\nChromaDB saved at: {CHROMA_PATH}")
    return vectorstore

def load_vectorstore():
    from langchain_huggingface import HuggingFaceEmbeddings  # updated import
    from langchain_community.vectorstores import Chroma
    import warnings
    warnings.filterwarnings("ignore")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH
    )

if __name__ == "__main__":
    print("=== AgriSmart PDF Ingestion ===\n")
    docs = load_all_pdfs()
    chunks = split_documents(docs)
    build_vectorstore(chunks)
    print("\nDone! ChromaDB is ready.")
    print("Next: python chatbot.py")