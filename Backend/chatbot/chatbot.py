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
    language: str        # "roman_urdu" | "urdu_script" | "english"
    language_hint: str   # from app: "ur" | "en" | ""
    from_voice: bool     # True when message came from speech-to-text (mic)
    context: str
    response: str

# ── Load ChromaDB ─────────────────────────────────────────────────────
print("Loading ChromaDB...")
vectorstore = load_vectorstore()
retriever = vectorstore.as_retriever(
    search_type="similarity",
    # We'll retrieve a wider set, then rerank down to the final top-4.
    search_kwargs={"k": int(os.getenv("AGRISMART_RETRIEVE_K", "12"))}
)
print("ChromaDB ready!")

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

# ── Prompts ───────────────────────────────────────────────────────────
ROMAN_URDU_PROMPT = """<s>[INST] Aap AgriSmart hain, Pakistani kisan bhaion ke liye ek AI zari assistant.
Aap wheat (gandum), rice (chawal), aur cotton (kapas) ke expert hain.

ZAROORI RULES:
- HAMESHA Roman Urdu mein jawab do
- Simple aur kisan-friendly language use karo
- Disease puchne par: symptoms, dawaai, aur bachao tino batao
- Short aur clear jawab do, zyada lamba mat karo

Agriculture Documents se Maloomat:
{context}

Sawal: {query} [/INST]
Roman Urdu mein jawab:"""

ENGLISH_PROMPT = """<s>[INST] You are AgriSmart, an AI agricultural assistant for Pakistani farmers.
You specialize in wheat, rice, and cotton crops in Pakistan.

RULES:
- Answer in simple, clear English
- For disease questions: mention symptoms, treatment, and prevention
- Keep answers practical and farmer-friendly
- Use the context provided below

Context from Agricultural Documents:
{context}

Question: {query} [/INST]
Answer:"""

URDU_SCRIPT_PROMPT = """<s>[INST] آپ AgriSmart ہیں، پاکستانی کسانوں کے لیے ایک زرعی معاون۔
گندم، چاول اور کپاس کے ماہر ہیں۔

سیاق و سباق:
{context}

سوال: {query} [/INST]
جواب:"""

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
    hint = _normalize_lang_hint(state.get("language_hint") or "")
    from_voice = bool(state.get("from_voice"))

    # Full Arabic block (Urdu/Persian script)
    if re.search(r"[\u0600-\u06FF]", query):
        lang = "urdu_script"
    # Mic + Urdu UI: keep Urdu, but pick script vs roman based on actual characters.
    # If STT returns Urdu script, the Arabic-block check above already caught it.
    elif from_voice and hint == "ur":
        lang = "roman_urdu" if _looks_like_roman_urdu(query) else "urdu_script"
    elif hint == "ur":
        lang = "roman_urdu" if _looks_like_roman_urdu(query) else "urdu_script"
    elif hint == "en":
        if _looks_like_roman_urdu(query):
            lang = "roman_urdu"
        else:
            lang = "english"
    elif _looks_like_roman_urdu(query):
        lang = "roman_urdu"
    else:
        lang = "english"

    print(f"Language detected: {lang} (hint={hint!r}, from_voice={from_voice})")
    return {**state, "language": lang}


def retrieve_context_node(state: AgriState) -> AgriState:
    query = state["query"]

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

    # Build system message based on language
    if language == "roman_urdu":
        system_msg = """Aap AgriSmart hain, Pakistani kisan bhaion ke liye ek AI zari assistant.
Aap wheat (gandum), rice (chawal), aur cotton (kapas) ke expert hain.
HAMESHA Roman Urdu mein jawab do — yaani Urdu words ko English letters mein likho.
Simple, short aur kisan-friendly jawab do.
Disease puchne par: symptoms, dawaai, aur bachao tino batao."""
        system_msg += "\n\nZAROORI: Kabhi bhi ek hi chhoti phrase (2–4 alfaaz) ko baar baar repeat mat karo. Jawab complete ho jaye to ruk jao; ghair zaroori repetition mat karo."

    elif language == "urdu_script":
        system_msg = """آپ AgriSmart ہیں، پاکستانی کسانوں کے لیے ایک زرعی معاون۔
گندم، چاول اور کپاس کے ماہر ہیں۔ اردو میں جواب دیں۔
ایک ہی مختصر جملے کو بار بار دہرائیں نہیں؛ جواب مکمل ہو جائے تو رک جائیں۔"""

    else:
        system_msg = """You are AgriSmart, an expert agricultural assistant for farmers in Pakistan.
Focus on wheat, rice, and cotton (local practices, seasons, and common problems).

Answer only in clear, simple English. Use short sentences and bullet points when listing steps.
Be practical: say what to do, roughly when, and what to watch for.
For diseases or pests: symptoms first, then treatment or spray options, then prevention.
If the farmer writes in Roman Urdu (Urdu in Latin letters), understand it and reply in Roman Urdu (same language style).
Stay concise; avoid jargon unless you explain it in one line."""
        system_msg += "\n\nNever repeat the same short phrase or sentence in a loop. When the answer is complete, stop."

    # Advanced RAG restriction: answer ONLY from provided PDF context.
    system_msg += (
        "\n\nIMPORTANT GROUNDING RULES:\n"
        "- You MUST answer ONLY using the PDF context below.\n"
        "- If the answer is not explicitly supported by the context, say you don't have it in the PDFs and ask a clarifying question.\n"
        "- Do NOT use general world knowledge, guesses, or training data.\n"
        "- If the user asks something unrelated to agriculture, politely refuse and ask an agriculture-related question.\n"
    )

    # Add context to system message
    system_msg += f"\n\nPDF Context (only source you may use):\n{context}"

    if _should_print_context_to_console():
        print("\n" + "=" * 72)
        print("CONTEXT (ChromaDB) → sent to model for full explanation")
        print("=" * 72)
        print(context)
        print("=" * 72 + "\n")

    try:
        response_text = _invoke_generation_model(
            system_text=system_msg,
            lc_history_plus_user=_prior_messages_plus_current_user(state),
            temperature=_CHATBOT_TEMP,
            max_tokens=_CHATBOT_MAX_TOKENS,
        )
        response_text = _trim_repetition_loops(response_text)

    except Exception as e:
        print(f"LLM Error: {e}")
        if language == "roman_urdu":
            response_text = "Maafi chahta hun, abhi jawab dene mein masla aa gaya. Thodi der baad dobara try karein."
        elif language == "urdu_script":
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
    query = state["query"].lower()
    if any(w in query for w in AGRI_WORDS):
        return "retrieve"
    return "direct"


def direct_response_node(state: AgriState) -> AgriState:
    lang  = state["language"]
    query = state["query"]

    if lang == "roman_urdu":
        system = (
            "Aap AgriSmart hain, Pakistani kisan bhaion ke liye ek zari assistant.\n"
            "Roman Urdu mein short, friendly jawab do.\n"
            "Agar sawal zaraat/farming se related NAHI hai, to politely refuse karo aur kaho ke main sirf zaraat se related sawalat ka jawab deta hun.\n"
            "Phir user ko guide karo ke wheat/rice/cotton, disease, keere, khad, paani/abpashi, ya soil ke bare mein puchein."
        )
    elif lang == "urdu_script":
        system = (
            "آپ AgriSmart ہیں۔ مختصر اور دوستانہ جواب دیں۔\n"
            "اگر سوال زراعت سے متعلق نہیں ہے تو مؤدبانہ انکار کریں اور بتائیں کہ آپ صرف زراعت سے متعلق سوالات کے جواب دیتے ہیں۔\n"
            "پھر صارف کو گندم/چاول/کپاس، بیماری، کیڑے، کھاد، آبپاشی، یا مٹی کے بارے میں سوال کرنے کو کہیں۔"
        )
    else:
        system = """You are AgriSmart, a farming assistant for Pakistan.
Reply only in clear English. Keep answers short.
If the question is not about agriculture, politely refuse and say you can only help with crops/soil/irrigation/pests/diseases/fertilizer.
Then ask the user to rephrase their question in that scope.
If the user message is Roman Urdu, understand it and answer in Roman Urdu (same language style)."""

    try:
        response_text = _invoke_generation_model(
            system_text=system,
            lc_history_plus_user=_prior_messages_plus_current_user(state),
            temperature=_CHATBOT_TEMP,
            max_tokens=_CHATBOT_MAX_TOKENS,
        )
        response_text = _trim_repetition_loops(response_text)
    except Exception as e:
        print(f"LLM Error: {e}")
        response_text = "Hello! Main AgriSmart hun. Apni fasal ke baare mein kuch puchein!"

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

    def chat(self, user_input: str, language_hint: str = "", from_voice: bool = False) -> str:
        state = AgriState(
            messages=self.history,
            query=user_input,
            language="english",
            language_hint=language_hint or "",
            from_voice=from_voice,
            context="",
            response="",
        )
        result       = self.graph.invoke(state)
        self.history = result["messages"]
        return result["response"]

    def chat_with_prior(self, prior_messages: List, user_input: str) -> str:
        """
        Run one turn using prior LangChain messages (caller trims to last N, e.g. 20).
        Does not mutate self.history — for DB-backed threads.
        """
        state = AgriState(
            messages=list(prior_messages),
            query=user_input,
            language="english",
            context="",
            response=""
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