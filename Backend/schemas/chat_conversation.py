from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

try:
    from ..db import Base
except ImportError:
    from db import Base


class ChatConversation(Base):
    """One ChatGPT-style thread per user; messages stored in ChatMessage."""

    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(50), ForeignKey("Users.user_id"), nullable=False, index=True)
    title = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("chat_conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp())
