import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/utils/env';
import { apiPost } from '@/utils/api';

const SESSION_KEY = 'agri_chatbot_session_id';

/** Thrown when GET/POST /api/chatbot/conversations* returns HTML 404 (old backend without these routes). */
export class ConversationsApiMissingError extends Error {
  constructor() {
    super('CONVERSATIONS_API_MISSING');
    this.name = 'ConversationsApiMissingError';
    Object.setPrototypeOf(this, ConversationsApiMissingError.prototype);
  }
}

export function isConversationsApiMissing(e: unknown): boolean {
  return (
    e instanceof ConversationsApiMissingError ||
    (typeof (e as Error)?.message === 'string' &&
      (e as Error).message === 'CONVERSATIONS_API_MISSING')
  );
}

/** Per-user active thread (ChatGPT-style); full history lives on server. */
export function conversationStorageKey(userId: string): string {
  return `agri_chatbot_conversation_${userId}`;
}

async function bearerHeaders(jsonBody: boolean): Promise<Record<string, string>> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (jsonBody) h['Content-Type'] = 'application/json';
  const token = await AsyncStorage.getItem('authToken');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function looksLikeFlaskHtml404(text: string): boolean {
  const t = text.trim().slice(0, 80).toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('<title>404');
}

export async function getStoredChatbotSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function saveChatbotSessionId(id: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, id);
}

export async function clearStoredChatbotSessionId(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getStoredConversationId(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(conversationStorageKey(userId));
  } catch {
    return null;
  }
}

export async function saveConversationId(userId: string, id: string): Promise<void> {
  await AsyncStorage.setItem(conversationStorageKey(userId), id);
}

export async function clearConversationId(userId: string): Promise<void> {
  await AsyncStorage.removeItem(conversationStorageKey(userId));
}

export type ChatbotChatResponse = {
  response: string;
  session_id: string;
  conversation_id?: string;
};

export type ChatbotWarmupResponse = {
  status: string;
  chromadb?: string;
};

export type ChatMessageDto = {
  id: string;
  role: string;
  content: string;
  created_at: string | null;
};

export type ChatbotSendOptions = {
  /** True when text came from speech-to-text so backend can treat it as voice-originated */
  fromVoice?: boolean;
  /** Optional DB-backed conversation id for authenticated mode */
  conversationId?: string | null;
};

/**
 * Preloads chatbot.py (ChromaDB + embeddings).
 * If the backend has no `/api/chatbot/warmup` route (404), returns skipped without throwing.
 */
export async function warmupChatbot(): Promise<ChatbotWarmupResponse> {
  const base = getApiBaseUrl();
  const headers = await bearerHeaders(true);

  const res = await fetch(`${base}/api/chatbot/warmup`, {
    method: 'POST',
    headers,
    body: '{}',
  });

  if (res.status === 404) {
    return { status: 'skipped', chromadb: 'warmup_route_missing' };
  }

  const text = await res.text();
  const trimmed = text.trim();
  let data: Record<string, unknown> = {};
  try {
    if (trimmed) data = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    if (!res.ok) {
      throw new Error(`Warmup failed (HTTP ${res.status})`);
    }
    throw new Error('Warmup: server returned non-JSON');
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string' ? data.error : `Warmup failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (typeof data.error === 'string' && data.error) {
    throw new Error(data.error);
  }
  return data as unknown as ChatbotWarmupResponse;
}

export async function createChatConversation(title?: string): Promise<{ conversation_id: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/chatbot/conversations`, {
    method: 'POST',
    headers: await bearerHeaders(true),
    body: JSON.stringify(title ? { title } : {}),
  });
  const text = await res.text();

  if (res.status === 404 || (res.status >= 400 && looksLikeFlaskHtml404(text))) {
    throw new ConversationsApiMissingError();
  }

  let data: Record<string, unknown> = {};
  try {
    if (text.trim()) data = JSON.parse(text.trim()) as Record<string, unknown>;
  } catch {
    if (!res.ok) throw new ConversationsApiMissingError();
    throw new Error('Invalid response from server');
  }

  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const cid = data.conversation_id;
  if (typeof cid !== 'string' || !cid) {
    throw new Error('Invalid response: missing conversation_id');
  }
  return { conversation_id: cid };
}

export async function fetchChatMessages(
  conversationId: string
): Promise<{ messages: ChatMessageDto[] }> {
  const base = getApiBaseUrl();
  const url = `${base}/api/chatbot/conversations/${encodeURIComponent(conversationId)}/messages`;
  const res = await fetch(url, {
    method: 'GET',
    headers: await bearerHeaders(false),
  });
  const text = await res.text();

  if (res.status === 404) {
    let parsed: { error?: string } | null = null;
    try {
      parsed = text.trim() ? (JSON.parse(text.trim()) as { error?: string }) : null;
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error);
    }
    if (looksLikeFlaskHtml404(text) || !text.trim()) {
      throw new ConversationsApiMissingError();
    }
    throw new ConversationsApiMissingError();
  }

  let data: { messages?: ChatMessageDto[] } = {};
  try {
    if (text.trim()) data = JSON.parse(text.trim()) as { messages?: ChatMessageDto[] };
  } catch {
    if (!res.ok) throw new ConversationsApiMissingError();
    throw new Error('Invalid JSON from server');
  }

  if (!res.ok) {
    const err = (data as { error?: string }).error;
    throw new Error(typeof err === 'string' ? err : `HTTP ${res.status}`);
  }

  return { messages: Array.isArray(data.messages) ? data.messages : [] };
}

/**
 * Sends a message to the Flask /api/chatbot/chat endpoint.
 * Always sends language + from_voice fields for robust backend detection.
 */
export async function sendChatbotMessage(
  message: string,
  sessionId?: string | null,
  language: 'en' | 'ur' = 'en',
  options?: ChatbotSendOptions
): Promise<ChatbotChatResponse> {
  const body: {
    message: string;
    language: 'en' | 'ur';
    from_voice: boolean;
    session_id?: string;
    conversation_id?: string;
  } = {
    message,
    language: language === 'ur' ? 'ur' : 'en',
    from_voice: options?.fromVoice === true,
  };
  if (sessionId) {
    body.session_id = sessionId;
  }
  if (options?.conversationId) {
    body.conversation_id = options.conversationId;
  }
  return apiPost<ChatbotChatResponse>('/api/chatbot/chat', body);
}

/** Legacy: clear in-memory LangGraph session (no DB thread). */
export async function resetChatbotServerSession(sessionId: string): Promise<void> {
  await apiPost('/api/chatbot/reset', { session_id: sessionId });
}
