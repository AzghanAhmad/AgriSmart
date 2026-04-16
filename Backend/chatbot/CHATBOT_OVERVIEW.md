# AgriSmart Chatbot – End‑to‑End Overview

This document explains how your AgriSmart chatbot works: data sources (PDF/CSV), embeddings + vector database (ChromaDB), LLM (Groq + LangGraph), backend APIs, and the mobile app integration.

---

## 1. High‑level architecture

- **Knowledge source**: agricultural PDFs (wheat, rice, cotton, pests, fertilizer) stored in `Backend/chatbot/pdfs/`.
- **Embeddings + vector DB**: documents are converted into text chunks, embedded using a multilingual transformer model, and stored in **ChromaDB** under `Backend/chatbot/chroma_db/`.
- **LLM + orchestration**:
  - LLM: `llama-3.1-8b-instant` via **Groq** (`ChatGroq`).
  - Orchestrator: **LangGraph** state machine (`AgriSmartChatbot` in `chatbot.py`) with explicit nodes for language detection, retrieval, and answer generation.
- **Backend API**:
  - Flask blueprint in `Backend/routes/chatbot_bp.py` exposes `/api/chatbot/*` routes.
  - Conversation threads and messages are stored in the DB tables `chat_conversations` and `chat_messages`.
- **Mobile app**:
  - React Native/Expo frontend under `project/app/(farmer)/chatbot.tsx`.
  - Uses `project/services/chatbotService.ts` to call the backend, handle auth, and restore conversation history.

---

## 2. Data ingestion – PDFs → ChromaDB

### 2.1 File locations

- **PDF input folder**: `Backend/chatbot/pdfs/`
  - You drop agronomy PDFs here (e.g. disease guides, pest management, fertilizer recommendations).
- **ChromaDB storage**: `Backend/chatbot/chroma_db/`
  - Created automatically after running the ingestion script.

### 2.2 Ingestion script: `ingest.py`

Key functions:

- **`load_all_pdfs()`**
  - Uses `PyMuPDFLoader` to load every `.pdf` in `pdfs/`.
  - Adds metadata to each page:
    - `source`: PDF filename
    - `crop`: detected via `detect_crop_from_filename()`

- **`detect_crop_from_filename(filename)`**
  - Simple keyword rules:
    - `["wheat", "gandum", "rust", "cimmyt"]` → `"wheat"`
    - `["rice", "chawal", "irri"]` → `"rice"`
    - `["cotton", "kapas"]` → `"cotton"`
    - `["pest", "keere"]` → `"pest"`
    - `["fertilizer", "khad"]` → `"fertilizer"`
    - otherwise → `"general"`

- **`split_documents(documents)`**
  - Uses `RecursiveCharacterTextSplitter` with:
    - `chunk_size=600`, `chunk_overlap=120`
  - Splits long pages into overlapping chunks while preserving readability.

- **`build_vectorstore(chunks)`**
  - Embedding model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` via `HuggingFaceEmbeddings`.
  - Vector store: `Chroma` with
    - `collection_name="agrismart_docs"`
    - `persist_directory=CHROMA_PATH` (`chroma_db/`)
  - Inserts chunks batch‑by‑batch to avoid memory spikes.

- **`load_vectorstore()`**
  - Re-opens the existing ChromaDB using the same embedding model and collection name.

### 2.3 How to (re)build the knowledge base

From `Backend/chatbot`:

```bash
cd Backend/chatbot
python ingest.py
```

This:
1. Reads `pdfs/`.
2. Splits pages into chunks.
3. Embeds and saves them into `chroma_db/`.

---

## 3. Chatbot core – `chatbot.py`

### 3.1 Initialization

- Loads environment:
  - `.env` in `Backend/chatbot/` (Groq API key etc.).
  - Project‑level `.env` via `dotenv`.
- Loads ChromaDB:
  - `vectorstore = load_vectorstore()`
  - `retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 4})`
- Configures Groq LLM:
  - `ChatGroq(model="llama-3.1-8b-instant", api_key=GROQ_API_KEY, temperature=0.3, max_tokens=512)`

### 3.2 State definition

`AgriState` fields:

- `messages`: full LangChain chat history (`HumanMessage` / `AIMessage`) used by LangGraph.
- `query`: current user input.
- `language`: detected language/script (`"roman_urdu" | "urdu_script" | "english"`).
- `context`: retrieved knowledge (from ChromaDB).
- `response`: final text answer.

### 3.3 Prompts and multilingual behavior

Three main instruction templates:

- **`ROMAN_URDU_PROMPT`**
  - Assistant persona: AgriSmart for Pakistani farmers.
  - Rules:
    - Answer **only in Roman Urdu** (Urdu words using English letters).
    - Be short, clear, and farmer‑friendly.
    - For disease questions: include symptoms, treatment, prevention.

- **`ENGLISH_PROMPT`**
  - Simple, clear English explanations.
  - Same disease rules as above.

- **`URDU_SCRIPT_PROMPT`**
  - Full Urdu script answers for users who type in Urdu script.

Language selection is done automatically via detection (see below), and the chosen prompt is embedded into the **system message** for the LLM.

### 3.4 Language detection and Roman Urdu handling

Key pieces:

- **`ROMAN_URDU_WORDS`**: common Roman‑Urdu agricultural words (`gandum`, `chawal`, `kapas`, `bimari`, `keere`, `khad`, etc.).
- **`URDU_SCRIPT_CHARS`**: set of letters that identify Urdu script.
- **`ROMAN_TO_ENGLISH`**: dictionary that maps Roman‑Urdu keywords to English equivalents (e.g. `"gandum" → "wheat"`). Used to improve retrieval quality.

Detection node:

- **`detect_language_node(state)`**
  - If the query contains any Urdu script character → `language = "urdu_script"`.
  - Else if it contains any word from `ROMAN_URDU_WORDS` → `language = "roman_urdu"`.
  - Otherwise → `language = "english"`.

### 3.5 Retrieval – connecting user query to PDFs

- **`retrieve_context_node(state)`**
  - Takes `state.query`.
  - If it looks like Roman Urdu, first replaces Roman keywords using `ROMAN_TO_ENGLISH` (e.g. `gandum` → `wheat`) to build a better `search_query`.
  - Calls:

    ```python
    docs = retriever.invoke(search_query)
    ```

  - Builds a textual `context` string:
    - Each chunk is tagged like:
      - `[source.pdf | Crop: wheat]`
      - followed by page content.
  - This `context` is merged into the system prompt so the LLM answers grounded in the ingested PDFs.

### 3.6 Answer generation – LangGraph node

- **`generate_response_node(state)`**
  - Selects a language‑specific system prompt (Roman Urdu / Urdu script / English).
  - Appends:

    ```text
    Context from Agricultural Documents:
    {context}
    ```

  - Builds a message list:

    ```python
    [SystemMessage(content=system_msg)] + _prior_messages_plus_current_user(state)
    ```

    where `_prior_messages_plus_current_user` appends the current `query` to the previous history, so follow‑ups like “from above” work.

  - Invokes the LLM:

    ```python
    response = llm.invoke(messages)
    response_text = response.content.strip()
    ```

  - Updates:
    - `state["response"]`
    - `state["messages"]` (adds both the human query and assistant reply).

  - In case of LLM error, returns language‑appropriate fallback messages (Roman Urdu / Urdu / English).

### 3.7 Graph wiring – LangGraph

- Graph builder: **`build_graph()`**.
- Nodes:
  - `"detect_language"` → `detect_language_node`
  - `"retrieve_context"` → `retrieve_context_node`
  - `"generate_response"` → `generate_response_node`
- Flow:

```text
detect_language → retrieve_context → generate_response → END
```

All user messages pass through this pipeline; history is carried in `state.messages`.

### 3.8 Public chatbot interface

`AgriSmartChatbot` class:

- **`chat(user_input: str) -> str`**
  - Uses internal `self.history` as `messages`.
  - Runs one LangGraph invocation and stores updated history.

- **`chat_with_prior(prior_messages: List, user_input: str) -> str`**
  - Stateless version for DB‑backed threads:
    - Accepts a list of existing LangChain messages (history window).
    - Runs LangGraph and returns `response` without mutating `self.history`.

- **`reset()`**
  - Clears `self.history` (used by `/api/chatbot/reset` for legacy `session_id` flows).

---

## 4. Backend HTTP API – `routes/chatbot_bp.py`

Blueprint: `chatbot_bp`, URL prefix: `/api/chatbot`.

### 4.1 Conversation storage

- DB models:
  - `ChatConversation`
  - `ChatMessage`
- Tables are created via `Backend/migrate_db.py` and imported in `Backend/app.py`.

### 4.2 Routes

- **`POST /api/chatbot/conversations`** (Bearer auth required)
  - Creates a new conversation row for the current user.
  - Returns: `{ conversation_id, title }`.

- **`GET /api/chatbot/conversations`** (Bearer auth)
  - Lists the user’s most recent conversations (up to 50).
  - For each: `id`, `title`, `created_at`, `updated_at`.

- **`GET /api/chatbot/conversations/<id>/messages`** (Bearer auth)
  - Returns the full ordered history:
    - `[{ id, role, content, created_at }]`.
  - Only accessible if the conversation belongs to the current user.

- **`POST /api/chatbot/chat`**
  - **Logged-in mode** (preferred):
    - Requires Bearer auth + `conversation_id` in the JSON body.
    - Loads full `ChatMessage` history for the conversation.
    - Converts DB rows to LangChain messages via `_rows_to_lc_messages`.
    - Passes the last `MESSAGE_WINDOW` messages (sliding window) into `chat_with_prior`.
    - Saves both user and assistant messages to DB.
  - **Legacy mode (no auth)**:
    - Uses `session_id` and an in‑memory `AgriSmartChatbot` instance stored in `_sessions`.
    - Suitable for anonymous users.

- **`POST /api/chatbot/reset`**
  - Legacy only: clears a session’s in‑memory `AgriSmartChatbot` history.

- **`GET /api/chatbot/health`**
  - Lightweight health check: `{ "status": "ok", "service": "chatbot" }`.

- **`POST|GET /api/chatbot/warmup`**
  - Forces the backend to load `chatbot.py` and ChromaDB before the first chat message, so the first response is not slow.

---

## 5. Mobile app integration

### 5.1 Service layer – `project/services/chatbotService.ts`

Responsibilities:

- Build API URLs using `getApiBaseUrl()`.
- Attach Bearer tokens using `AsyncStorage` (`authToken`).
- Manage persistent IDs:
  - `SESSION_KEY = 'agri_chatbot_session_id'` (legacy session).
  - `agri_chatbot_conversation_<userId>` (per‑user active conversation).

Key functions:

- **`warmupChatbot()`**
  - Calls `/api/chatbot/warmup` on app startup.

- **`createChatConversation(title?)`**
  - Calls `POST /api/chatbot/conversations`.
  - Returns `{ conversation_id }`.

- **`fetchChatMessages(conversationId)`**
  - Calls `GET /api/chatbot/conversations/:id/messages`.

- **`sendChatbotMessage(message, { conversationId?, sessionId? })`**
  - Calls `POST /api/chatbot/chat` with the right identifiers.
  - Returns `{ response, session_id, conversation_id? }`.

- **`resetChatbotServerSession(sessionId)`**
  - Calls `/api/chatbot/reset` for legacy sessions.

### 5.2 Chat screen – `project/app/(farmer)/chatbot.tsx`

Responsibilities:

- Shows the chat UI (messages, timestamps, typing indicator).
- Handles:
  - warmup state
  - session vs. conversation mode
  - restoring history from the server
  - starting a “New chat”

Key behaviors:

- On focus:
  - Calls `warmupChatbot()` to ensure `chatbot.py` and ChromaDB are ready.

- On mount (logged‑in user):
  - Loads stored `conversation_id` from AsyncStorage.
  - If exists, calls `fetchChatMessages` to restore previous messages from DB.
  - If not, calls `createChatConversation` and stores the new `conversation_id`.

- On mount (anonymous user):
  - Uses `session_id` from AsyncStorage and talks to `/api/chatbot/chat` in legacy mode.

- `sendMessage(text)`:
  - Adds the user message to local state.
  - Calls `sendChatbotMessage` with either `conversationId` or `sessionId`.
  - Appends the assistant’s response to the UI.

---

## 6. Datasets (CSV Q&A files)

In `Backend/chatbot/`:

- `wheat_qa_dataset.csv`
- `full_rice_dataset.csv`
- `cotton_qa_dataset.csv`

Typical usage patterns:

- These CSVs can be:
  - Ingested into Chroma by converting each Q/A row into a document.
  - Or used offline for evaluation, prompt tuning, or future RAG improvements.

Currently the production chatbot relies primarily on the **PDF → ChromaDB** flow; the CSVs serve as structured Q&A corpora for future enhancements.

---

## 7. How everything works together (summary)

1. **Data preparation**:
   - You place agri PDFs under `Backend/chatbot/pdfs/`.
   - You run `python ingest.py` to build/update `chroma_db/`.

2. **Backend startup**:
   - Flask app starts (`Backend/app.py`).
   - When `/api/chatbot/warmup` is called:
     - `chatbot.py` is imported.
     - ChromaDB and Groq LLM are initialized.

3. **User opens chat on mobile**:
   - App calls `warmupChatbot()`.
   - For logged‑in users:
     - Loads/creates a conversation via `createChatConversation`.
     - Restores old messages with `fetchChatMessages`.

4. **User sends a message**:
   - Frontend calls `sendChatbotMessage`.
   - Backend route:
     - Loads DB history (or in‑memory session).
     - Converts to LangChain messages and passes them into `AgriSmartChatbot.chat_with_prior`.

5. **LangGraph pipeline runs**:
   - Detect language → derive `language`.
   - Retrieve context from Chroma using embeddings.
   - Build a language‑appropriate system prompt + context.
   - Call Groq LLM → answer.

6. **Answer and persistence**:
   - Backend saves both user and assistant messages to DB (for logged‑in users).
   - Response text is returned to the mobile app and rendered in the chat UI.

This is your full AgriSmart chatbot stack: **PDFs/CSVs → embeddings → ChromaDB → LangGraph + Groq → Flask API → React Native chat UI**.

