"""
HTTP API for the LangGraph + Chroma + Groq chatbot (Backend/chatbot/chatbot.py).

- Authenticated requests with `conversation_id`: messages persisted in DB; model uses a
  sliding window of the last MESSAGE_WINDOW messages (ChatGPT-style).
- Legacy: `session_id` only (no Bearer token) keeps in-memory bot sessions.
"""
import importlib.util
import os
import sys
import threading
import uuid
from collections import OrderedDict
from datetime import datetime

from flask import Blueprint, jsonify, request

try:
    from ..db import SessionLocal
    from ..schemas.chat_conversation import ChatConversation, ChatMessage
except ImportError:
    from db import SessionLocal
    from schemas.chat_conversation import ChatConversation, ChatMessage

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")

_lock = threading.Lock()
_module_load_lock = threading.Lock()
_module = None
_graph_bot = None
# session_id -> AgriSmartChatbot (legacy, no DB)
_sessions: "OrderedDict[str, object]" = OrderedDict()
MAX_SESSIONS = 150

# Last N LangChain messages passed into the graph (full history stays in DB)
MESSAGE_WINDOW = 20


def _load_chatbot_module():
    """Load chatbot.py from Backend/chatbot (paths in ingest.py are __file__-relative)."""
    global _module
    if _module is not None:
        return _module

    with _module_load_lock:
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


def _get_graph_bot():
    """Single compiled graph instance; no per-thread history (DB supplies prior messages)."""
    global _graph_bot
    mod = _load_chatbot_module()
    if _graph_bot is None:
        _graph_bot = mod.AgriSmartChatbot()
    return _graph_bot


def _bearer_uid():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.replace("Bearer ", "", 1).strip()
    try:
        try:
            from ..routes.auth import _decode_token
        except ImportError:
            from routes.auth import _decode_token

        payload = _decode_token(token)
        return payload.get("uid")
    except Exception:
        return None


def _rows_to_lc_messages(rows):
    from langchain_core.messages import AIMessage, HumanMessage

    lc = []
    for r in rows:
        if r.role == "user":
            lc.append(HumanMessage(content=r.content))
        elif r.role == "assistant":
            lc.append(AIMessage(content=r.content))
    return lc


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


@chatbot_bp.route("/conversations", methods=["POST"])
def create_conversation():
    uid = _bearer_uid()
    if not uid:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip() or None

    cid = str(uuid.uuid4())
    db = SessionLocal()
    try:
        conv = ChatConversation(id=cid, user_id=uid, title=title)
        db.add(conv)
        db.commit()
        return jsonify({"conversation_id": cid, "title": title}), 201
    finally:
        db.close()


@chatbot_bp.route("/conversations", methods=["GET"])
def list_conversations():
    uid = _bearer_uid()
    if not uid:
        return jsonify({"error": "Authentication required"}), 401

    db = SessionLocal()
    try:
        rows = (
            db.query(ChatConversation)
            .filter(ChatConversation.user_id == uid)
            .order_by(ChatConversation.updated_at.desc())
            .limit(50)
            .all()
        )
        out = []
        for c in rows:
            out.append(
                {
                    "id": c.id,
                    "title": c.title,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                }
            )
        return jsonify({"conversations": out})
    finally:
        db.close()


@chatbot_bp.route("/conversations/<conv_id>/messages", methods=["GET"])
def get_messages(conv_id: str):
    uid = _bearer_uid()
    if not uid:
        return jsonify({"error": "Authentication required"}), 401

    db = SessionLocal()
    try:
        conv = (
            db.query(ChatConversation)
            .filter(ChatConversation.id == conv_id, ChatConversation.user_id == uid)
            .first()
        )
        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        rows = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conv_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        messages = [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in rows
        ]
        return jsonify({"conversation_id": conv_id, "messages": messages})
    finally:
        db.close()


@chatbot_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    uid = _bearer_uid()
    conversation_id = (data.get("conversation_id") or "").strip()
    session_id = (data.get("session_id") or "").strip() or str(uuid.uuid4())

    # —— DB-backed thread (logged-in farmer, ChatGPT-style) ——
    if uid and conversation_id:
        db = SessionLocal()
        try:
            conv = (
                db.query(ChatConversation)
                .filter(ChatConversation.id == conversation_id, ChatConversation.user_id == uid)
                .first()
            )
            if not conv:
                return jsonify({"error": "Conversation not found"}), 404

            rows = (
                db.query(ChatMessage)
                .filter(ChatMessage.conversation_id == conversation_id)
                .order_by(ChatMessage.created_at.asc())
                .all()
            )
            lc_full = _rows_to_lc_messages(rows)
            window = lc_full[-MESSAGE_WINDOW:] if len(lc_full) > MESSAGE_WINDOW else lc_full

            bot = _get_graph_bot()
            response_text = bot.chat_with_prior(window, message)
            if response_text is None:
                response_text = ""
            elif not isinstance(response_text, str):
                response_text = str(response_text)

            um = ChatMessage(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                role="user",
                content=message,
            )
            am = ChatMessage(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                role="assistant",
                content=response_text,
            )
            db.add(um)
            db.add(am)
            conv.updated_at = datetime.utcnow()
            if not (conv.title and conv.title.strip()):
                conv.title = (message[:80] + "…") if len(message) > 80 else message
            db.commit()

            return jsonify(
                {
                    "response": response_text,
                    "conversation_id": conversation_id,
                    "session_id": session_id,
                }
            )
        except Exception as e:
            import traceback

            traceback.print_exc()
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            db.close()

    # —— Legacy in-memory session (no auth / no conversation_id) ——
    try:
        bot = _get_bot_for_session(session_id)
        response_text = bot.chat(message)
        if response_text is None:
            response_text = ""
        elif not isinstance(response_text, str):
            response_text = str(response_text)
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


@chatbot_bp.route("/warmup", methods=["POST", "GET"])
def warmup():
    """
    Load chatbot.py (ChromaDB + LangGraph). Call when opening the chat UI so the first
    /chat message does not pay the full load cost.
    """
    try:
        _load_chatbot_module()
        return jsonify({"status": "ready", "chromadb": "loaded"})
    except Exception as e:
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
