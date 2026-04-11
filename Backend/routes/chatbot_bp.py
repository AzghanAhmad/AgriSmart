"""
HTTP API for the LangGraph + Chroma + Groq chatbot (Backend/chatbot/chatbot.py).
Lazy-loads the chatbot on first request so Flask can start without loading embeddings.
"""
import importlib.util
import os
import sys
import threading
import uuid
from collections import OrderedDict

from flask import Blueprint, jsonify, request

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")

_lock = threading.Lock()
_module = None
# session_id -> AgriSmartChatbot (conversation memory per session)
_sessions: "OrderedDict[str, object]" = OrderedDict()
MAX_SESSIONS = 150


def _load_chatbot_module():
    """Load chatbot.py from Backend/chatbot (paths in ingest.py are __file__-relative)."""
    global _module
    if _module is not None:
        return _module

    chatbot_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "chatbot"))
    if not os.path.isdir(chatbot_dir):
        raise FileNotFoundError(f"Chatbot directory not found: {chatbot_dir}")

    if chatbot_dir not in sys.path:
        sys.path.insert(0, chatbot_dir)

    path = os.path.join(chatbot_dir, "chatbot.py")
    spec = importlib.util.spec_from_file_location("agrismart_langgraph_chatbot", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load chatbot module from {path}")

    mod = importlib.util.module_from_spec(spec)
    sys.modules["agrismart_langgraph_chatbot"] = mod
    spec.loader.exec_module(mod)
    _module = mod
    return mod


def _get_bot_for_session(session_id: str):
    with _lock:
        if session_id in _sessions:
            _sessions.move_to_end(session_id)
            return _sessions[session_id]

        mod = _load_chatbot_module()
        bot = mod.AgriSmartChatbot()
        _sessions[session_id] = bot
        while len(_sessions) > MAX_SESSIONS:
            _sessions.popitem(last=False)
        return bot


@chatbot_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    session_id = (data.get("session_id") or "").strip() or str(uuid.uuid4())

    try:
        bot = _get_bot_for_session(session_id)
        response_text = bot.chat(message)
        return jsonify({"response": response_text, "session_id": session_id})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@chatbot_bp.route("/reset", methods=["POST"])
def reset():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    with _lock:
        bot = _sessions.pop(session_id, None)
        if bot is not None and hasattr(bot, "reset"):
            try:
                bot.reset()
            except Exception:
                pass

    return jsonify({"ok": True, "session_id": session_id})


@chatbot_bp.route("/health", methods=["GET"])
def chatbot_health():
    """Lightweight check that the route is registered (does not load Chroma)."""
    return jsonify({"status": "ok", "service": "chatbot"})
