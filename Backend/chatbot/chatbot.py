import os
import sys
import warnings
warnings.filterwarnings("ignore")

from typing import TypedDict, List, Annotated
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from ingest import load_vectorstore

_CHATBOT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_CHATBOT_DIR, ".env"))
load_dotenv()

# Print Chroma context to console before each LLM call (set AGRISMART_PRINT_CONTEXT=0 to disable)
def _should_print_context_to_console() -> bool:
    v = os.getenv("AGRISMART_PRINT_CONTEXT", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


# ── State ─────────────────────────────────────────────────────────────
class AgriState(TypedDict):
    messages: Annotated[List, add_messages]
    query: str
    language: str        # "roman_urdu" | "urdu_script" | "english"
    context: str
    response: str

# ── Load ChromaDB ─────────────────────────────────────────────────────
print("Loading ChromaDB...")
vectorstore = load_vectorstore()
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 4}
)
print("ChromaDB ready!")

# ── Groq LLM (HF_TOKEN optional; only needed for some HuggingFace hub downloads)
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("WARNING: HF_TOKEN not set in .env (embeddings may still work for public models)")

llm = ChatGroq(
    model="llama-3.1-8b-instant",   # free, fast, multilingual
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.3,
    max_tokens=512
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
    "gandum", "chawal", "kapas", "fasal", "bimari", "keere", "keera",
    "paani", "pani", "khad", "beej", "zameen", "khet", "dawaai",
    "ilaj", "achha", "theek", "kya", "hai", "mein", "aur", "nahi",
    "karo", "kab", "kaise", "kyun", "hua", "raha", "patta", "zang",
    "phool", "rog", "lagaya", "lagao", "batao", "kisan", "faida",
    "nuqsan", "mosam", "barish", "dhoop", "geela", "sukha", "spray",
    "dawai", "panwa", "tijarat", "munafa", "zyada", "kam", "achhi"
}

URDU_SCRIPT_CHARS = set("ابتثجحخدذرزسشصضطظعغفقکلمنوہیءآاةپچژگڈڑں")

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

# ═══════════════════════════════════════════════════════════
# LANGGRAPH NODES
# ═══════════════════════════════════════════════════════════

def detect_language_node(state: AgriState) -> AgriState:
    query = state["query"]

    # Check Urdu script characters
    if any(c in URDU_SCRIPT_CHARS for c in query):
        lang = "urdu_script"
    else:
        # Check Roman Urdu keywords
        words_in_query = set(query.lower().split())
        hits = words_in_query.intersection(ROMAN_URDU_WORDS)
        lang = "roman_urdu" if hits else "english"

    print(f"Language detected: {lang}")
    return {**state, "language": lang}


def retrieve_context_node(state: AgriState) -> AgriState:
    query = state["query"]

    # Translate Roman Urdu → English for better ChromaDB search
    search_query = query.lower()
    for roman, english in ROMAN_TO_ENGLISH.items():
        search_query = search_query.replace(roman, english)

    print(f"Searching ChromaDB: {search_query[:80]}")

    try:
        docs = retriever.invoke(search_query)
        if docs:
            context = "\n\n---\n\n".join([
                f"[{doc.metadata.get('source', 'Doc')} | Crop: {doc.metadata.get('crop', 'general')}]\n{doc.page_content}"
                for doc in docs
            ])
            print(f"Retrieved {len(docs)} chunks")
        else:
            context = "No specific document found. Using general agricultural knowledge."
            print("No chunks found")
    except Exception as e:
        context = "Error retrieving context. Using general knowledge."
        print(f"Retrieval error: {e}")

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

    elif language == "urdu_script":
        system_msg = """آپ AgriSmart ہیں، پاکستانی کسانوں کے لیے ایک زرعی معاون۔
گندم، چاول اور کپاس کے ماہر ہیں۔ اردو میں جواب دیں۔"""

    else:
        system_msg = """You are AgriSmart, an AI agricultural assistant for Pakistani farmers.
You specialize in wheat, rice, and cotton crops in Pakistan.
Answer in simple, clear English. For disease questions mention symptoms, treatment and prevention.
Keep answers practical and farmer-friendly."""

    # Add context to system message
    system_msg += f"\n\nContext from Agricultural Documents:\n{context}"

    if _should_print_context_to_console():
        print("\n" + "=" * 72)
        print("CONTEXT (ChromaDB) → sent to model for full explanation")
        print("=" * 72)
        print(context)
        print("=" * 72 + "\n")

    try:
        from langchain_core.messages import SystemMessage as SM, HumanMessage as HM
        response = llm.invoke([
            SM(content=system_msg),
            HM(content=query)
        ])
        response_text = response.content.strip()

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
        system = "Aap AgriSmart hain, Pakistani kisan bhaion ke liye ek zari assistant. Roman Urdu mein friendly jawab do. Agar farming se related nahi hai toh politely farming ki taraf guide karo."
    elif lang == "urdu_script":
        system = "آپ AgriSmart ہیں۔ مختصر اور دوستانہ جواب دیں۔ زراعت کی طرف رہنمائی کریں۔"
    else:
        system = "You are AgriSmart, an agricultural assistant for Pakistani farmers. Be friendly. If not agriculture related, politely guide back to farming topics."

    try:
        from langchain_core.messages import SystemMessage as SM, HumanMessage as HM
        response = llm.invoke([
            SM(content=system),
            HM(content=query)
        ])
        response_text = response.content.strip()
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

    def chat(self, user_input: str) -> str:
        state = AgriState(
            messages=self.history,
            query=user_input,
            language="english",
            context="",
            response=""
        )
        result       = self.graph.invoke(state)
        self.history = result["messages"]
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