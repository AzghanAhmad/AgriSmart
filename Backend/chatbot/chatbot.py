import os
import re
import sys
import warnings
warnings.filterwarnings("ignore")

from typing import TypedDict, List, Annotated, Any
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from ingest import load_vectorstore

_CHATBOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_CHATBOT_DIR, ".env"))
load_dotenv()

# ── Grok (xAI) client helpers ──────────────────────────────────────────
def _get_grok_client():
    """
    Uses OpenAI-compatible xAI Grok API if XAI_API_KEY is set.
    Falls back to None (we'll degrade gracefully).
    """
    api_key = (os.getenv("XAI_API_KEY") or "").strip()
    if not api_key:
        return None
    base_url = (os.getenv("XAI_BASE_URL") or "https://api.x.ai/v1").strip()
    try:
        from openai import OpenAI
    except Exception:
        return None
    return OpenAI(api_key=api_key, base_url=base_url)


def _grok_model_name() -> str:
    return (os.getenv("GROK_MODEL") or "grok-2-latest").strip()


def _grok_chat_completion(client, messages, temperature: float = 0.0, max_tokens: int = 350):
    return client.chat.completions.create(
        model=_grok_model_name(),
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def _lc_messages_to_openai(messages: List[Any]) -> list[dict]:
    """
    Convert LangChain message objects to OpenAI-compatible dicts.
    Unknown message types are treated as 'user' content.
    """
    out: list[dict] = []
    for m in messages or []:
        role = "user"
        try:
            # LangChain message classes
            if isinstance(m, HumanMessage):
                role = "user"
            elif isinstance(m, AIMessage):
                role = "assistant"
            elif isinstance(m, SystemMessage):
                role = "system"
        except Exception:
            role = "user"
        content = getattr(m, "content", None)
        if content is None:
            content = str(m)
        out.append({"role": role, "content": str(content)})
    return out


def _invoke_generation_model(system_text: str, lc_history_plus_user: List[Any], temperature: float, max_tokens: int) -> str:
    """
    Generation is done via Grok if configured; otherwise falls back to Groq (LangChain).
    """
    grok = _get_grok_client()
    if grok is not None:
        msgs = [{"role": "system", "content": system_text}] + _lc_messages_to_openai(lc_history_plus_user)
        out = _grok_chat_completion(grok, msgs, temperature=temperature, max_tokens=max_tokens)
        return (out.choices[0].message.content or "").strip()

    # Fallback: Groq (existing behavior)
    from langchain_core.messages import SystemMessage as SM
    resp = llm.invoke([SM(content=system_text)] + lc_history_plus_user)
    return (resp.content or "").strip()

# Print Chroma context to console before each LLM call (set AGRISMART_PRINT_CONTEXT=0 to disable)
def _should_print_context_to_console() -> bool:
    v = os.getenv("AGRISMART_PRINT_CONTEXT", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


# ── State ─────────────────────────────────────────────────────────────
class AgriState(TypedDict):
    messages: Annotated[List, add_messages]
    query: str
    language: str        # "english" | "urdu_script" (Roman Urdu input maps to urdu_script)
    language_hint: str   # from app: "ur" | "en" | ""
    from_voice: bool     # True when message came from speech-to-text (mic)
    # Output: "" = follow query; "en" / "english" → English; "urdu_script" / "ur" → Urdu script
    reply_language: str
    context: str
    response: str

# ── Load ChromaDB ─────────────────────────────────────────────────────
print("Loading ChromaDB...")
vectorstore = None
retriever = None
try:
    vectorstore = load_vectorstore()
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        # We'll retrieve a wider set, then rerank down to the final top-4.
        search_kwargs={"k": int(os.getenv("AGRISMART_RETRIEVE_K", "12"))}
    )
    print("ChromaDB ready!")
except Exception as e:
    print(f"WARNING: ChromaDB/embedding load failed; chatbot will run without PDF RAG. err={e}")

# ── Groq LLM (HF_TOKEN optional; only needed for some HuggingFace hub downloads)
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("WARNING: HF_TOKEN not set in .env (embeddings may still work for public models)")

# Slightly lower temperature reduces degenerate repetition loops.
# If answers look "incomplete", increase CHATBOT_MAX_TOKENS (default below).
_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
try:
    _CHATBOT_TEMP = float(os.getenv("CHATBOT_TEMPERATURE", "0.25"))
except ValueError:
    _CHATBOT_TEMP = 0.25
try:
    # 400 was frequently too small for "symptoms + treatment + prevention" answers.
    _CHATBOT_MAX_TOKENS = int(os.getenv("CHATBOT_MAX_TOKENS", "700"))
except ValueError:
    _CHATBOT_MAX_TOKENS = 700

llm = ChatGroq(
    model=_GROQ_MODEL,
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=_CHATBOT_TEMP,
    max_tokens=_CHATBOT_MAX_TOKENS,
)

# ── Language Detection ────────────────────────────────────────────────
ROMAN_URDU_WORDS = {
    "gandum", "gehun", "chawal", "kapas", "fasal", "bimari", "bemari", "keere", "keera",
    "paani", "pani", "khad", "beej", "zameen", "khet", "dawaai",
    "ilaj", "ilay", "achha", "acha", "theek", "kya", "hai", "hain", "ho", "mein", "main", "aur", "nahi", "nahin",
    "karo", "karein", "kab", "kaise", "kese", "kyun", "hua", "raha", "patta", "zang",
    "phool", "rog", "lagaya", "lagao", "batao", "bataen", "btay", "kisan", "kisaan", "faida",
    "nuqsan", "mosam", "mausam", "barish", "dhoop", "geela", "sukha", "spray",
    "dawai", "panwa", "tijarat", "munafa", "zyada", "ziyada", "kam", "achhi",
    "madad", "rehnumai", "rahnumai", "mashwara", "masla", "masail", "salam", "assalam",
    "alaikum", "bhai", "jan", "thori", "chhota", "mutabiq", "bare", "baray", "bary",
    "waqt", "bone", "boen", "kattai", "paidawar", "mun", "bag",
    "abpashi", "nehr", "barani", "ridges", "khaad", "foilar", "gober", "fym",
    "maloomat", "zalila", "nindaai", "jhariyon", "beej", "beejon",
}

# Common Roman Urdu function words / endings (Whisper STT often uses these; not in the small keyword set).
_ROMAN_URDU_PATTERN = re.compile(
    r"\b(?:"
    r"hai|hain|ho|hon|hoon|hun|kya|kyun|kar|karun|karein|karta|karti|karte|kiya|kiye|"
    r"ko|mein|main|se|par|aur|nahi|nahin|na|"
    r"aap|apna|apne|apko|mere|mera|meri|mujhe|hum|ham|"
    r"ki|ke|ka|wali|wala|walay|walon|"
    r"tha|thi|the|raha|rahi|rahe|"
    r"batao|bataen|btay|madad|rehnumai|mashwara|"
    r"salam|assalam|alaikum|wa|"
    r"zameen|khet|mausam|mosam|fasal|bimari|bemari|gandum|gehun|"
    r"chawal|kapas|khad|beej|pani|paani|ilaj|dawai|dawaai|rog|kisan|kisaan|"
    r"ji|haan|shukriya|acha|achha|kab|kaise|kese|hoga|hogi|hogay|"
    r"baray|bary|bare|mutabiq|sab|ziada|ziyada|thori|chhota|koi|bhi|bas|toh|"
    r"agar|lekin|warna|kyunki|isliye|jab|tab|phir|"
    r"poore|poora|kitna|kitni|kitne|kahan|kaun|kis|kisne"
    r")\b",
    re.IGNORECASE,
)


def _normalize_query_tokens(text: str) -> set[str]:
    """Split on whitespace; strip common punctuation so 'hai,' matches."""
    out: set[str] = set()
    for raw in re.split(r"\s+", text.lower()):
        w = raw.strip(".,;:!?\"'()[]{}«»،؟٫")
        if not w:
            continue
        out.add(w)
        if len(w) > 2 and w.endswith("'s"):
            out.add(w[:-2])
    return out


def _looks_like_roman_urdu(query: str) -> bool:
    if _ROMAN_URDU_PATTERN.search(query):
        return True
    if _normalize_query_tokens(query) & ROMAN_URDU_WORDS:
        return True
    return False

ROMAN_TO_ENGLISH = {
    "gandum": "wheat",
    "chawal": "rice",
    "kapas": "cotton",
    "keere": "pest insects",
    "keera": "pest",
    "bimari": "disease",
    "khad": "fertilizer",
    "paani": "irrigation water",
    "pani": "water",
    "beej": "seed",
    "fasal": "crop",
    "zang": "rust fungal disease",
    "patta": "leaf",
    "phool": "flower blight",
    "khet": "field farm",
    "ilaj": "treatment cure",
    "rog": "disease",
    "mosam": "weather season",
    "barish": "rainfall",
    "sukha": "drought dry",
    "dawaai": "pesticide medicine",
    "dawai": "medicine treatment"
}

AGRI_WORDS = [
    # English
    "crop", "wheat", "rice", "cotton", "disease", "pest", "soil",
    "fertilizer", "irrigation", "harvest", "seed", "yield", "farm",
    "fungus", "spray", "insect", "weed", "drought", "flood", "plant",
    "leaf", "root", "stem", "growth", "treatment", "pesticide",
    # Roman Urdu
    "gandum", "chawal", "kapas", "fasal", "bimari", "keere",
    "khad", "paani", "pani", "beej", "khet", "zang", "ilaj",
    "rog", "mosam", "barish", "patta", "phool", "kisan", "dawaai"
]

def _normalize_lang_hint(raw: str) -> str:
    """Map ur-PK, urdu, en-US → ur | en | ''."""
    h = (raw or "").strip().lower().replace("_", "-")
    if not h:
        return ""
    base = h.split("-")[0]
    if base in ("ur", "urdu"):
        return "ur"
    if base in ("en", "eng", "english"):
        return "en"
    return base


def _normalize_reply_language(raw: str) -> str:
    """
    Map client reply_language to '', 'english', or 'urdu_script'.
    Empty / auto / follow → '' (use query-based detection).
    Legacy 'roman_urdu' is treated as Urdu script (product: no Latin-script Urdu replies).
    """
    h = (raw or "").strip().lower().replace("-", "_")
    if not h or h in ("auto", "follow", "detect", "match"):
        return ""
    if h in ("en", "english", "eng"):
        return "english"
    if h in ("roman_urdu", "romanurdu", "ur_roman", "roman"):
        return "urdu_script"
    if h in ("urdu_script", "urdu", "ur_script", "script", "ur"):
        return "urdu_script"
    return ""


def _locked_reply_format_stanza(state: AgriState) -> str:
    """
    When the app sends a fixed reply_language, prior turns may still be in another script.
    Models often mirror recent assistant text; this block breaks that.
    """
    forced = _normalize_reply_language(state.get("reply_language") or "")
    if not forced:
        return ""
    if forced == "english":
        desc = "English only, using Latin letters"
    else:
        desc = "Urdu only, using Arabic script (Nastaliq)"
    return (
        "\n\nLOCKED REPLY FORMAT (the farmer chose this in the app):\n"
        f"- Your WHOLE answer must be in: {desc}.\n"
        "- Earlier assistant messages in this chat may be in a different language or script.\n"
        "- Ignore their script completely. Do NOT continue in the same script as the last assistant message.\n"
        "- Follow ONLY the language rules in this system message for this reply.\n"
    )


def _output_script_constraints(language: str) -> str:
    """
    PDF chunks and chat history often contain Roman Urdu; models echo it unless told not to.
    This block is appended last so it wins over noisy context.
    """
    if language == "urdu_script":
        return (
            "\n\nOUTPUT SCRIPT (mandatory — read last):\n"
            "- Write the entire answer in Urdu using Arabic script only (e.g. گندم، بیماری).\n"
            "- Do NOT use Roman Urdu (Urdu spelled with A–Z letters like gandum, ilaj, khet).\n"
            "- Do NOT answer in plain English only; mix is not allowed — Arabic-script Urdu for all explanatory text.\n"
            "- If the PDF lines below are in Roman Urdu or English, translate the meaning into Arabic-script Urdu.\n"
        )
    return (
        "\n\nOUTPUT SCRIPT (mandatory — read last):\n"
        "- Write the entire answer in normal English using the Latin alphabet only.\n"
        "- Do NOT use Roman Urdu (Urdu written with English letters, e.g. 'gandum mein zang').\n"
        "- Do NOT use Arabic script unless quoting a proper noun that must stay in Urdu.\n"
        "- If the PDF lines below are in Roman Urdu or Urdu script, translate the facts into clear English.\n"
    )


def _contains_urdu_script(text: str) -> bool:
    return bool(re.search(r"[\u0600-\u06FF]", text or ""))


def _forced_language_query(query: str, forced: str) -> str:
    if forced == "english":
        return (
            f"{query}\n\n"
            "[Reply language selected in the app: English. Answer this turn in English only. "
            "Do not use Urdu, Arabic script, or Roman Urdu.]"
        )
    if forced == "urdu_script":
        return (
            f"{query}\n\n"
            "[Reply language selected in the app: Urdu. Answer this turn only in Urdu written "
            "with Arabic script. Do not use English or Roman Urdu.]"
        )
    return query


def _history_for_generation(state: AgriState) -> List[Any]:
    forced = _normalize_reply_language(state.get("reply_language") or "")
    prior = list(state.get("messages") or [])
    if not forced:
        return prior + [HumanMessage(content=state["query"])]

    cleaned = []
    for message in prior:
        content = str(getattr(message, "content", "") or "")
        if isinstance(message, AIMessage):
            has_urdu_script = _contains_urdu_script(content)
            if forced == "english" and has_urdu_script:
                continue
            if forced == "urdu_script" and not has_urdu_script and re.search(r"[A-Za-z]", content):
                continue
        cleaned.append(message)

    return cleaned + [HumanMessage(content=_forced_language_query(state["query"], forced))]


def _violates_forced_script(response_text: str, language: str, forced: str) -> bool:
    if not forced or not response_text.strip():
        return False
    has_urdu_script = _contains_urdu_script(response_text)
    if language == "urdu_script":
        return not has_urdu_script
    return has_urdu_script


def _invoke_generation_with_language_lock(
    system_text: str,
    state: AgriState,
    temperature: float,
    max_tokens: int,
) -> str:
    forced = _normalize_reply_language(state.get("reply_language") or "")
    response_text = _invoke_generation_model(
        system_text=system_text,
        lc_history_plus_user=_history_for_generation(state),
        temperature=temperature,
        max_tokens=max_tokens,
    )
    response_text = _trim_repetition_loops(response_text)

    if _violates_forced_script(response_text, state["language"], forced):
        retry_system = (
            system_text
            + "\n\nRETRY LANGUAGE FIX:\n"
            + "The previous draft used the wrong language or script. Rewrite from scratch and obey the selected reply language exactly."
        )
        response_text = _invoke_generation_model(
            system_text=retry_system,
            lc_history_plus_user=[HumanMessage(content=_forced_language_query(state["query"], forced))],
            temperature=0.0,
            max_tokens=max_tokens,
        )
        response_text = _trim_repetition_loops(response_text)

    return response_text


def _trim_repetition_loops(text: str, min_repeat: int = 7) -> str:
    """
    LLMs sometimes degenerate into repeating the same short n-gram forever (e.g. 'ke pedon ke pedon ...').
    If we detect many consecutive repeats of the same 2–4 word phrase, keep only the first occurrence
    of that phrase and drop the tail.
    """
    if not text or not text.strip():
        return text
    words = text.split()
    if len(words) < min_repeat * 2:
        return text
    for n in (2, 3, 4):
        i = 0
        while i + n * min_repeat <= len(words):
            phrase = tuple(words[i : i + n])
            run = 1
            j = i + n
            while j + n <= len(words) and tuple(words[j : j + n]) == phrase:
                run += 1
                j += n
            if run >= min_repeat:
                trimmed = " ".join(words[: i + n]).strip()
                print(
                    f"WARNING: trimmed repetition loop (n={n}, repeats={run}); "
                    f"original_len={len(text)} trimmed_len={len(trimmed)}"
                )
                return trimmed
            i += 1
    return text


# ═══════════════════════════════════════════════════════════
# Multi-turn context (must be fed to the LLM, not only stored after the fact)
# ═══════════════════════════════════════════════════════════

def _prior_messages_plus_current_user(state: AgriState) -> List[Any]:
    """Prior conversation turns, then the current user message (query is not in prior yet)."""
    prior = list(state.get("messages") or [])
    return prior + [HumanMessage(content=state["query"])]


# ═══════════════════════════════════════════════════════════
# LANGGRAPH NODES
# ═══════════════════════════════════════════════════════════

def detect_language_node(state: AgriState) -> AgriState:
    query = state["query"]
    # Default: English for Latin queries; Urdu script for Arabic script or Roman Urdu input.
    if re.search(r"[\u0600-\u06FF]", query):
        detected = "urdu_script"
    elif _looks_like_roman_urdu(query):
        detected = "urdu_script"
    else:
        detected = "english"

    mode = _normalize_reply_language(state.get("reply_language") or "")
    if mode == "english":
        lang = "english"
    elif mode == "urdu_script":
        lang = "urdu_script"
    else:
        lang = detected

    hint = _normalize_lang_hint(state.get("language_hint") or "")
    from_voice = bool(state.get("from_voice"))
    print(
        f"Language: detected={detected} reply_mode={mode!r} final={lang} "
        f"(hint={hint!r}, from_voice={from_voice})"
    )
    return {**state, "language": lang}


def retrieve_context_node(state: AgriState) -> AgriState:
    query = state["query"]

    if retriever is None:
        return {
            **state,
            "context": "The PDF knowledge base is currently unavailable.",
        }

    # Stage 1 (pre-retrieval): rewrite/expand query with Grok (best-effort).
    # If Grok isn't configured, we fall back to a lightweight Roman Urdu → English rewrite.
    grok = _get_grok_client()
    rewritten = ""
    if grok is not None:
        try:
            sys_prompt = (
                "You rewrite user questions for semantic search over agricultural PDFs.\n"
                "Return ONLY a single rewritten query, no quotes, no extra text.\n"
                "Rules:\n"
                "- Keep original intent.\n"
                "- Expand acronyms/short forms.\n"
                "- Add missing context words (crop, disease/pest/fertilizer/irrigation, symptoms, treatment, prevention).\n"
                "- If the user uses Urdu or Roman Urdu, include BOTH Urdu/Roman terms and English equivalents in the rewritten query.\n"
            )
            out = _grok_chat_completion(
                grok,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": query},
                ],
                temperature=0.2,
                max_tokens=120,
            )
            rewritten = (out.choices[0].message.content or "").strip()
        except Exception as e:
            print(f"WARNING: Grok rewrite failed; falling back. err={e}")

    if not rewritten:
        # Fallback rewrite: Roman Urdu → English hints for retrieval only.
        rewritten = query.lower()
        for roman, english in ROMAN_TO_ENGLISH.items():
            rewritten = rewritten.replace(roman, english)

    search_query = rewritten
    print(f"Searching ChromaDB: {search_query[:120]}")

    # Stage 2: retrieve (wide)
    try:
        docs = retriever.invoke(search_query)
    except Exception as e:
        print(f"Retrieval error: {e}")
        docs = []

    if not docs:
        return {
            **state,
            "context": "No relevant PDF chunks were found in the knowledge base.",
        }

    # Stage 3: rerank with Grok (best-effort), then keep top-4 and merge into context.
    final_k = int(os.getenv("AGRISMART_FINAL_K", "4"))
    reranked = docs

    if grok is not None:
        try:
            # Provide compact chunk candidates to Grok for scoring.
            candidates = []
            for i, d in enumerate(docs):
                src = d.metadata.get("source", "Doc")
                crop = d.metadata.get("crop", "general")
                text = (d.page_content or "").strip()
                if len(text) > 900:
                    text = text[:900] + "…"
                candidates.append({"id": i, "source": src, "crop": crop, "text": text})

            sys_prompt = (
                "You are a reranker for retrieval-augmented generation.\n"
                "Given a user question and candidate PDF chunks, return JSON ONLY.\n"
                "Output schema:\n"
                "{ \"ranked_ids\": [int, ...] }\n"
                "Rules:\n"
                "- ranked_ids must list the best chunk ids from most relevant to least.\n"
                "- Prefer chunks that directly answer the question.\n"
                "- If two chunks are redundant, keep only the better one earlier.\n"
            )
            user_payload = {"question": query, "candidates": candidates, "top_k": final_k}
            out = _grok_chat_completion(
                grok,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": str(user_payload)},
                ],
                temperature=0.0,
                max_tokens=220,
            )
            raw = (out.choices[0].message.content or "").strip()
            import json

            data = json.loads(raw)
            ranked_ids = data.get("ranked_ids") or []
            ranked_ids = [i for i in ranked_ids if isinstance(i, int) and 0 <= i < len(docs)]
            if ranked_ids:
                reranked = [docs[i] for i in ranked_ids] + [d for j, d in enumerate(docs) if j not in set(ranked_ids)]
        except Exception as e:
            print(f"WARNING: Grok rerank failed; using similarity order. err={e}")

    top = reranked[: max(1, final_k)]
    context = "\n\n---\n\n".join(
        [
            f"[{doc.metadata.get('source', 'Doc')} | Crop: {doc.metadata.get('crop', 'general')}]\n{doc.page_content}"
            for doc in top
        ]
    )
    print(f"Retrieved {len(docs)} candidates; using top {len(top)} chunks")
    return {**state, "context": context}


def generate_response_node(state: AgriState) -> AgriState:
    query    = state["query"]
    context  = state["context"]
    language = state["language"]

    # Build system message: English or Urdu script only (no Roman Urdu replies).
    if language == "urdu_script":
        system_msg = """آپ AgriSmart ہیں، پاکستانی کسانوں کے لیے ایک زرعی معاون۔
گندم، چاول اور کپاس کے ماہر ہیں۔
پورا جواب اردو رسم الخط (عربی حروف) میں دیں — رومن اردو (انگریزی حروف) میں نہ لکھیں۔
ایک ہی مختصر جملے کو بار بار دہرائیں نہیں؛ جواب مکمل ہو جائے تو رک جائیں۔"""

    else:
        system_msg = """You are AgriSmart, an expert agricultural assistant for farmers in Pakistan.
Focus on wheat, rice, and cotton (local practices, seasons, and common problems).

Answer only in clear, simple English using standard Latin letters.
Do NOT answer in Roman Urdu (Urdu spelled with English letters).
Use short sentences and bullet points when listing steps.
Be practical: say what to do, roughly when, and what to watch for.
For diseases or pests: symptoms first, then treatment or spray options, then prevention.
Stay concise; avoid jargon unless you explain it in one line."""
        system_msg += "\n\nNever repeat the same short phrase or sentence in a loop. When the answer is complete, stop."

    # Advanced RAG restriction: answer ONLY from provided PDF context.
    system_msg += (
        "\n\nIMPORTANT GROUNDING RULES:\n"
        "- You MUST answer ONLY using the PDF context below.\n"
        "- If the answer is not explicitly supported by the context, say you don't have it in the PDFs and ask a clarifying question.\n"
        "- Do NOT use general world knowledge, guesses, or training data.\n"
        "- If the user asks something unrelated to agriculture, politely refuse and ask an agriculture-related question.\n"
        "- The PDF text may be in English, Urdu script, or Roman Urdu; still follow OUTPUT SCRIPT rules — do not copy Roman Urdu style when English is required, and do not answer in Roman Urdu when Urdu script is required.\n"
    )

    # Add context to system message
    system_msg += f"\n\nPDF Context (only source you may use):\n{context}"
    system_msg += _locked_reply_format_stanza(state)
    system_msg += _output_script_constraints(language)

    if _should_print_context_to_console():
        print("\n" + "=" * 72)
        print("CONTEXT (ChromaDB) → sent to model for full explanation")
        print("=" * 72)
        print(context)
        print("=" * 72 + "\n")

    try:
        response_text = _invoke_generation_with_language_lock(
            system_text=system_msg,
            state=state,
            temperature=_CHATBOT_TEMP,
            max_tokens=_CHATBOT_MAX_TOKENS,
        )

    except Exception as e:
        print(f"LLM Error: {e}")
        if language == "urdu_script":
            response_text = "معذرت، ابھی جواب دینے میں مسئلہ آگیا۔ دوبارہ کوشش کریں۔"
        else:
            response_text = "Sorry, I encountered an error. Please try again."

    messages = list(state.get("messages", []))
    updated_messages = messages + [
        HumanMessage(content=query),
        AIMessage(content=response_text)
    ]

    return {**state, "response": response_text, "messages": updated_messages}


def is_agri_related(state: AgriState) -> str:
    if retriever is None:
        return "direct"
    query = state["query"].lower()
    if any(w in query for w in AGRI_WORDS):
        return "retrieve"
    return "direct"


def direct_response_node(state: AgriState) -> AgriState:
    lang  = state["language"]
    query = state["query"]

    if lang == "urdu_script":
        system = (
            "آپ AgriSmart ہیں۔ مختصر اور دوستانہ جواب دیں۔\n"
            "صرف اردو رسم الخط میں لکھیں — رومن اردو استعمال نہ کریں۔\n"
            "اگر سوال زراعت سے متعلق نہیں ہے تو مؤدبانہ انکار کریں اور بتائیں کہ آپ صرف زراعت سے متعلق سوالات کے جواب دیتے ہیں۔\n"
            "پھر صارف کو گندم/چاول/کپاس، بیماری، کیڑے، کھاد، آبپاشی، یا مٹی کے بارے میں سوال کرنے کو کہیں۔"
        )
    else:
        system = """You are AgriSmart, a farming assistant for Pakistan.
Reply only in clear English (Latin letters). Do not use Roman Urdu. Keep answers short.
If the question is not about agriculture, politely refuse and say you can only help with crops/soil/irrigation/pests/diseases/fertilizer.
Then ask the user to rephrase their question in that scope.
"""

    system += _locked_reply_format_stanza(state)
    system += _output_script_constraints(lang)

    try:
        response_text = _invoke_generation_with_language_lock(
            system_text=system,
            state=state,
            temperature=_CHATBOT_TEMP,
            max_tokens=_CHATBOT_MAX_TOKENS,
        )
    except Exception as e:
        print(f"LLM Error: {e}")
        if lang == "urdu_script":
            response_text = "سلام! میں AgriSmart ہوں — فصل کے بارے میں پوچھیں۔"
        else:
            response_text = "Hello! I'm AgriSmart — ask me about your crops."

    messages = list(state.get("messages", []))
    updated = messages + [
        HumanMessage(content=query),
        AIMessage(content=response_text)
    ]
    return {**state, "context": "", "response": response_text, "messages": updated}

# ═══════════════════════════════════════════════════════════
# BUILD LANGGRAPH
# ═══════════════════════════════════════════════════════════

def build_graph():
    g = StateGraph(AgriState)

    g.add_node("detect_language",   detect_language_node)
    g.add_node("retrieve_context",  retrieve_context_node)
    g.add_node("generate_response", generate_response_node)
    g.add_node("direct_response",   direct_response_node)

    g.set_entry_point("detect_language")

    g.add_conditional_edges(
        "detect_language",
        is_agri_related,
        {
            "retrieve": "retrieve_context",
            "direct":   "direct_response"
        }
    )

    g.add_edge("retrieve_context",  "generate_response")
    g.add_edge("generate_response", END)
    g.add_edge("direct_response",   END)

    return g.compile()


# ── Chatbot Class ─────────────────────────────────────────────────────
class AgriSmartChatbot:
    def __init__(self):
        self.graph   = build_graph()
        self.history = []

    def chat(
        self,
        user_input: str,
        language_hint: str = "",
        from_voice: bool = False,
        reply_language: str = "",
    ) -> str:
        state = AgriState(
            messages=self.history,
            query=user_input,
            language="english",
            language_hint=language_hint or "",
            from_voice=from_voice,
            reply_language=reply_language or "",
            context="",
            response="",
        )
        result       = self.graph.invoke(state)
        self.history = result["messages"]
        return result["response"]

    def chat_with_prior(
        self,
        prior_messages: List,
        user_input: str,
        language_hint: str = "",
        from_voice: bool = False,
        reply_language: str = "",
    ) -> str:
        """
        Run one turn using prior LangChain messages (caller trims to last N, e.g. 20).
        Does not mutate self.history — for DB-backed threads.
        """
        state = AgriState(
            messages=list(prior_messages),
            query=user_input,
            language="english",
            language_hint=language_hint or "",
            from_voice=from_voice,
            reply_language=reply_language or "",
            context="",
            response="",
        )
        result = self.graph.invoke(state)
        return result["response"]

    def reset(self):
        self.history = []
        print("Conversation reset.")


# ── Terminal Test ─────────────────────────────────────────────────────
if __name__ == "__main__":
    bot = AgriSmartChatbot()
    print("\nAgriSmart Chatbot Ready!")
    print("Try: 'gandum mein zang lag gayi hai'")
    print("Try: 'wheat rust disease treatment'")
    print("Type 'quit' to exit\n")

    while True:
        try:
            user = input("Aap: ").strip()
            if user.lower() == "quit":
                break
            if user:
                print("\nAgriSmart: ", end="", flush=True)
                response = bot.chat(user)
                print(f"{response}\n")
                print("-" * 50)
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break