import importlib.util
import os
import sys
import threading
from collections import OrderedDict
from datetime import datetime

from flask import Flask, jsonify, request

try:
    from .config import get_chatbot_module_path, get_max_sessions, get_service_port
    from common.logging_utils import configure_logging
except ImportError:
    from config import get_chatbot_module_path, get_max_sessions, get_service_port
    from common.logging_utils import configure_logging

from langchain_core.messages import AIMessage, HumanMessage

app = Flask(__name__)
logger = configure_logging("chatbot-service")
_lock = threading.Lock()
_sessions: "OrderedDict[str, object]" = OrderedDict()
MAX_SESSIONS = get_max_sessions()
_graph_bot = None
_chatbot_module = None
_state_lock = threading.Lock()
_runtime_state = {
    "status": "initializing",  # initializing | ready | failed
    "error": None,
    "last_transition": datetime.utcnow().isoformat(),
}
_init_started = False


def _set_runtime_state(status: str, error: str | None = None) -> None:
    with _state_lock:
        _runtime_state["status"] = status
        _runtime_state["error"] = error
        _runtime_state["last_transition"] = datetime.utcnow().isoformat()


def _get_runtime_state() -> dict:
    with _state_lock:
        return dict(_runtime_state)


def _load_chatbot_module():
    global _chatbot_module
    if _chatbot_module is not None:
        return _chatbot_module

    module_path = os.path.abspath(get_chatbot_module_path())
    module_dir = os.path.dirname(module_path)
    if not os.path.exists(module_path):
        raise FileNotFoundError(f"Chatbot module not found: {module_path}")
    if module_dir not in sys.path:
        sys.path.insert(0, module_dir)

    spec = importlib.util.spec_from_file_location("agrismart_chatbot_engine", module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load chatbot module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["agrismart_chatbot_engine"] = module
    spec.loader.exec_module(module)
    _chatbot_module = module
    return module


def _new_bot():
    module = _load_chatbot_module()
    return module.AgriSmartChatbot()


def _validate_runtime_resources() -> None:
    module = _load_chatbot_module()

    # Model loaded check
    bot = _get_graph_bot()
    if not hasattr(bot, "graph") or bot.graph is None:
        raise RuntimeError("chatbot graph/model is not initialized")
    logger.info("Model load complete")

    # Vector DB initialized check
    vectorstore = getattr(module, "vectorstore", None)
    if vectorstore is None:
        raise RuntimeError("vector DB is not initialized")
    logger.info("ChromaDB ready")

    # Embeddings ready check
    embedder = getattr(vectorstore, "_embedding_function", None) or getattr(vectorstore, "embedding_function", None)
    if embedder is None:
        raise RuntimeError("embeddings are not initialized")
    logger.info("Embeddings initialized")


def _initialize_runtime():
    try:
        _set_runtime_state("initializing")
        _validate_runtime_resources()
        _set_runtime_state("ready")
        logger.info("Chatbot runtime ready")
    except Exception as exc:
        logger.exception("Chatbot runtime initialization failed: %s", exc)
        _set_runtime_state("failed", str(exc))


def _start_init_if_needed():
    global _init_started
    with _state_lock:
        if _init_started:
            return
        _init_started = True
    init_thread = threading.Thread(target=_initialize_runtime, daemon=True)
    init_thread.start()


def _get_session_bot(session_id: str):
    with _lock:
        if session_id in _sessions:
            _sessions.move_to_end(session_id)
            return _sessions[session_id]
        bot = _new_bot()
        _sessions[session_id] = bot
        while len(_sessions) > MAX_SESSIONS:
            _sessions.popitem(last=False)
        return bot


def _message_dicts_to_lc(items):
    lc = []
    for item in items or []:
        role = (item or {}).get("role")
        content = (item or {}).get("content", "")
        if role == "assistant":
            lc.append(AIMessage(content=content))
        else:
            lc.append(HumanMessage(content=content))
    return lc


def _get_graph_bot():
    global _graph_bot
    if _graph_bot is None:
        _graph_bot = _new_bot()
    return _graph_bot


@app.route("/health", methods=["GET"])
def health():
    _start_init_if_needed()
    return jsonify({"status": "healthy", "service": "chatbot-service"})


@app.route("/ready", methods=["GET"])
def ready():
    _start_init_if_needed()
    state = _get_runtime_state()
    payload = {
        "service": "chatbot-service",
        "status": state["status"],
        "last_transition": state["last_transition"],
    }
    if state.get("error"):
        payload["error"] = state["error"]
    return jsonify(payload), (200 if state["status"] == "ready" else 503)


@app.route("/warmup", methods=["GET"])
def warmup():
    _start_init_if_needed()
    state = _get_runtime_state()
    if state["status"] != "ready":
        _initialize_runtime()
        state = _get_runtime_state()
    return jsonify({
        "service": "chatbot-service",
        "status": state["status"],
        "chromadb": "loaded" if state["status"] == "ready" else "not-ready",
        "error": state.get("error"),
    }), (200 if state["status"] == "ready" else 503)


@app.route("/reset", methods=["POST"])
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


@app.route("/chat", methods=["POST"])
def chat():
    _start_init_if_needed()
    state = _get_runtime_state()
    if state["status"] != "ready":
        body = {"status": state["status"], "service": "chatbot-service"}
        if state.get("error"):
            body["error"] = state["error"]
        return jsonify(body), 503

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    session_id = (data.get("session_id") or "").strip() or "default"
    language_hint = (data.get("language_hint") or "").strip()
    from_voice = bool(data.get("from_voice", False))
    prior_messages = data.get("prior_messages") or []

    try:
        logger.info("Incoming request: /chat")
        if prior_messages:
            bot = _get_graph_bot()
            lc_prior = _message_dicts_to_lc(prior_messages)
            response_text = bot.chat_with_prior(lc_prior, message)
        else:
            bot = _get_session_bot(session_id)
            response_text = bot.chat(message, language_hint, from_voice)
        return jsonify({"response": response_text or "", "session_id": session_id})
    except Exception as exc:
        logger.exception("Chat error: %s", exc)
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    _start_init_if_needed()
    logger.info("Starting chatbot-service on port %s", get_service_port())
    app.run(host="0.0.0.0", port=get_service_port(), debug=False)
