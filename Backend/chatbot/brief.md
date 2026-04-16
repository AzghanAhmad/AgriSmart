ehavior
Logged-in farmers: Each thread is a ChatGPT-style conversation stored in SQLite (chat_conversations, chat_messages).
Sliding window: The model only sees the last 20 LangChain messages (HumanMessage / AIMessage); all turns are still saved in the DB.
New chat (refresh icon): Creates a new conversation, saves it under the current user, and clears the on-screen messages (welcome only).
Logout: Clears the stored conversation id for that user so the next login starts a new thread (new “window”). Closing the app without logging out keeps the same thread.
Backend
Backend/schemas/chat_conversation.py — ChatConversation, ChatMessage.
Backend/migrate_db.py — creates the two tables when missing.
Backend/app.py — imports models so create_all knows them.
Backend/chatbot/chatbot.py — chat_with_prior(prior_messages, user_input) for DB-backed turns.
Backend/routes/chatbot_bp.py — MESSAGE_WINDOW = 20, plus:
POST /api/chatbot/conversations — create thread (Bearer auth).
GET /api/chatbot/conversations — list threads.
GET /api/chatbot/conversations/<id>/messages — full history for the UI.
POST /api/chatbot/chat — if Authorization + conversation_id, persist and use the window; otherwise legacy session_id (in-memory) still works.
Mobile
chatbotService.ts — createChatConversation, fetchChatMessages, per-user storage agri_chatbot_conversation_<userId>.
chatbot.tsx — loads or creates a conversation, restores messages from the API, sends conversation_id when the user is logged in.
AuthContext.tsx — on logout, removes agri_chatbot_conversation_<userId>.