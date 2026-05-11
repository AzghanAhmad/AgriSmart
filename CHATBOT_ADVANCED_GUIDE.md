# AgriSmart Chatbot (Advanced) — Complete Guide

This guide explains **how your chatbot works**, what concepts like **embeddings** and **chunking** mean, **why** they’re used, and **where** each part lives in *your* codebase.

---

## Key idea: What kind of chatbot is this?

Your chatbot is a **RAG chatbot** (Retrieval-Augmented Generation):

- **Retrieval**: it searches a knowledge base built from your PDFs (stored in **ChromaDB**).
- **Augmented**: it injects the retrieved text (“context chunks”) into the prompt.
- **Generation**: it uses an LLM (Grok if configured; otherwise Groq-hosted Llama) to produce an answer.

**Why RAG?**
- **Pros**: answers can be grounded in your documents, updated by re-ingesting PDFs, and you don’t need to fine-tune a model.
- **Cons**: quality depends on chunking/embeddings and can miss info if retrieval fails.

---

## What is an embedding?

An **embedding** is a vector (a list of numbers) that represents the “meaning” of text in a way a computer can compare.

### Why embeddings are used
Instead of keyword matching, embeddings let you do **semantic search**:
- “gandum zang” can match “wheat rust disease”
- “spray for pest” can match “insect control” even without exact words

### Advantages over classic search
- **Handles synonyms / language mixing** (English + Roman Urdu)
- **Better recall** on natural language questions
- **Works well with messy farmer queries**

### Where embeddings happen in your project
- **Embedding model name + construction**: `Backend/chatbot/ingest.py`
  - Default model: `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`
  - Embeddings are normalized: `normalize_embeddings=True`
- **Vectorstore uses those embeddings for search**: `Backend/chatbot/ingest.py` + `Backend/chatbot/chatbot.py`

---

## What is a vector database (ChromaDB) and why use it?

A **vector database** stores:
- text chunks
- their embedding vectors
- metadata (like `source` PDF filename, `crop`)

Then you can query by semantic similarity.

### Why ChromaDB is used here
- Simple local persistence (no cloud setup required)
- Tight integration with LangChain

### Where ChromaDB is used
- Chroma persistence path + collection: `Backend/chatbot/ingest.py`
  - `CHROMA_PATH = Backend/chatbot/wheat_cotton_rice_db`
  - `COLLECTION_NAME = agrismart_docs`
- Query-time retrieval: `Backend/chatbot/chatbot.py`

---

## Chunking: what it is, why it matters

Your PDFs are split into smaller pieces called **chunks** before embedding.

### Why chunking is needed
LLMs and embedding models work better on reasonably sized text:
- Too large: retrieval becomes “blurry” (one chunk covers too many topics)
- Too small: you lose context (important details split apart)

### Your current chunk settings (important)
Defined in `Backend/chatbot/ingest.py`:
- **Chunk size**: `AGRISMART_CHUNK_SIZE_TOKENS` (default **500 tokens**)
- **Chunk overlap**: `AGRISMART_CHUNK_OVERLAP_TOKENS` (default **100 tokens**)

**What overlap does**
- It repeats a bit of text between adjacent chunks so important sentences don’t get cut off.

### Chunking method used
In `Backend/chatbot/ingest.py`, it tries token-based splitting:
- `RecursiveCharacterTextSplitter.from_tiktoken_encoder(...)`
- Fallback if token encoder isn’t available:
  - uses a rough estimate \( \(\approx 4\) chars per token \)

---

## Retrieval: how many chunks are searched and returned?

There are *two* “k” values in your retrieval pipeline.

### Wide retrieval (candidate set)
In `Backend/chatbot/chatbot.py`:
- `AGRISMART_RETRIEVE_K` default is **12**
- This means: retrieve top 12 similar chunks initially.

### Final chunks used in the prompt
In `Backend/chatbot/chatbot.py`:
- `AGRISMART_FINAL_K` default is **4**
- This means: only the best 4 chunks are merged into the final context passed to the model.

### Why use 12 then 4?
- **12** improves recall (don’t miss relevant pieces)
- **4** controls prompt size and keeps answers focused

---

## Reranking: why it exists, how your project does it

Similarity search can return chunks that are “kinda related” but not the best.
**Reranking** reorders the candidate chunks by relevance.

### Your reranker
In `Backend/chatbot/chatbot.py`:
- If Grok is configured, you rerank the retrieved chunks using Grok and keep the best ones.
- If Grok isn’t configured or reranking fails, you keep the similarity order.

**Advantage**
- Better “top-4” context quality → better final answers.

---

## Prompting: how the chatbot is controlled

Your prompts do several jobs:
- enforce language (Roman Urdu / Urdu script / English)
- enforce format (symptoms → treatment → prevention)
- restrict domain (agriculture only)
- restrict knowledge source (PDF context only)

### Where prompts live
All in `Backend/chatbot/chatbot.py`:
- `ROMAN_URDU_PROMPT`, `URDU_SCRIPT_PROMPT`, `ENGLISH_PROMPT`
- plus a stronger “system message” assembled in `generate_response_node(...)`

### Grounding / restriction (anti-hallucination)
In `Backend/chatbot/chatbot.py`, your system message includes:
- “You MUST answer ONLY using the PDF context below.”
- “If not supported, say you don’t have it in PDFs and ask a clarifying question.”
- “Do NOT use general world knowledge…”

This is the main mechanism that **restricts** the chatbot.

---

## Conversation memory: how past conversation is maintained

There are **two modes** in your backend:

### 1) DB-backed conversations (recommended, “ChatGPT-style threads”)
In `Backend/routes/chatbot_bp.py`:
- Conversations are created and listed via:
  - `POST /api/chatbot/conversations`
  - `GET  /api/chatbot/conversations`
- Messages are persisted via:
  - `GET /api/chatbot/conversations/<id>/messages`
  - `POST /api/chatbot/chat` (when authenticated and `conversation_id` is provided)

**Where it’s stored**
- SQLAlchemy models are in `Backend/schemas/chat_conversation.py`:
  - `ChatConversation` table: one thread per user
  - `ChatMessage` table: user/assistant messages

**How much history is fed to the LLM**
- `MESSAGE_WINDOW = 20` in `Backend/routes/chatbot_bp.py`
- Full history stays in DB, but only the **last 20 messages** are sent to the model each turn.

**Why sliding window**
- Controls token usage + speed
- Prevents prompt from becoming too large
- Limits “prompt injection persistence” from very old messages

### 2) Legacy in-memory sessions (no auth)
In `Backend/routes/chatbot_bp.py`:
- If no Bearer token + no `conversation_id`, it uses a server-side session map:
  - `session_id -> AgriSmartChatbot()`
- Reset endpoint:
  - `POST /api/chatbot/reset` clears that in-memory session history

In-memory memory is lost if the backend restarts.

---

## Frontend: where chat state is kept (mobile app)

Your React Native UI is in:
- `project/app/(farmer)/chatbot.tsx`

### What the frontend stores locally
In `project/services/chatbotService.ts`:
- **Legacy `session_id`** is stored in AsyncStorage:
  - key: `agri_chatbot_session_id`
  - this keeps the same server session across app restarts (legacy mode)

Also in `project/services/chatbotService.ts`:
- DB-backed **conversation id** is stored per user:
  - key: `agri_chatbot_conversation_<userId>`

### How the frontend sends messages
In `project/services/chatbotService.ts`:
- `sendChatbotMessage(...)` posts:
  - `message`
  - `language` (`'en' | 'ur'`)
  - `from_voice` boolean
  - optional `session_id`
  - optional `conversation_id`

This is what lets the backend choose:
- DB-backed thread mode (auth + conversation id), or
- legacy session mode (session id only)

---

## “Restricting the chatbot”: what you already do + best practices

### What you already do (in your code today)
In `Backend/chatbot/chatbot.py`:
- **Domain restriction**: agriculture only (non-agri questions go to `direct_response_node`)
- **Source restriction**: “PDF context only” grounding rules
- **Anti-repetition**: `_trim_repetition_loops(...)`

In `Backend/routes/chatbot_bp.py`:
- **History restriction**: sliding window of last 20 messages to the model (DB mode)

### Common upgrades (optional ideas)
- **Citations**: include chunk `source` and maybe page numbers in the answer
- **Stronger safety**: refuse medical/legal/financial advice beyond farming scope
- **PII filtering**: strip phone numbers / CNIC if users share them
- **Prompt injection defenses**: do not obey instructions found inside retrieved context

---

## Quick “Where is what?” index (your repo)

### Backend (RAG + LLM)
- **Ingestion (PDF → chunks → embeddings → Chroma)**: `Backend/chatbot/ingest.py`
- **Retrieval + rerank + prompt grounding + generation**: `Backend/chatbot/chatbot.py`
- **Chroma-only retrieval CLI (no LLM)**: `Backend/chatbot/chroma_only.py`

### Backend (API + conversation storage)
- **Chatbot API endpoints + sliding window memory**: `Backend/routes/chatbot_bp.py`
- **Conversation/message DB models**: `Backend/schemas/chat_conversation.py`

### Frontend (UI + API calls)
- **Chat screen**: `project/app/(farmer)/chatbot.tsx`
- **Chat API client + AsyncStorage session/conversation IDs**: `project/services/chatbotService.ts`

---

## Your current important defaults (copy/paste friendly)

- **Embedding model**: `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`
- **Chunk size / overlap**: 500 / 100 tokens
- **Retrieve k (candidates)**: 12
- **Final k (context injected)**: 4
- **Conversation sliding window (DB mode)**: last 20 messages
- **LLM fallback**: Grok (if configured) → otherwise Groq (`llama-3.1-8b-instant`)
- **Temperature**: 0.25
- **Max tokens**: 700

---

## How to change chunk size, retrieval k, etc.

These are controlled via environment variables (read in `Backend/chatbot/ingest.py` and `Backend/chatbot/chatbot.py`):

- `AGRISMART_CHUNK_SIZE_TOKENS`
- `AGRISMART_CHUNK_OVERLAP_TOKENS`
- `AGRISMART_RETRIEVE_K`
- `AGRISMART_FINAL_K`
- `AGRISMART_EMBEDDING_MODEL`

If you change chunk settings or embedding model, you typically need to **re-ingest PDFs** to rebuild the vector DB.

---

## Knowledge base sources in your repo (PDFs + CSV Q/A)

Your ChromaDB knowledge base can be built from:

- **PDFs**: `Backend/chatbot/pdfs/` (ingested by `Backend/chatbot/ingest.py`)
- **CSV Q/A files**: ingested as small “documents” into the same Chroma collection by:
  - `Backend/chatbot/ingest_csv.py`

Example CSVs already in your repo:
- `Backend/chatbot/wheat_qa_dataset.csv`
- `Backend/chatbot/rice_qa_dataset.csv`
- `Backend/chatbot/cotton_qa_dataset.csv`
- `Backend/chatbot/full_rice_dataset.csv`

