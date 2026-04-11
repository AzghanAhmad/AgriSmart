import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from '@/utils/api';

const SESSION_KEY = 'agri_chatbot_session_id';

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

export type ChatbotChatResponse = {
  response: string;
  session_id: string;
};

/**
 * Sends a message to the Flask /api/chatbot/chat endpoint (LangGraph + Chroma + Groq).
 */
export async function sendChatbotMessage(
  message: string,
  sessionId?: string | null
): Promise<ChatbotChatResponse> {
  const body: { message: string; session_id?: string } = { message };
  if (sessionId) {
    body.session_id = sessionId;
  }
  return apiPost<ChatbotChatResponse>('/api/chatbot/chat', body);
}

/**
 * Clears server-side conversation memory for this session.
 */
export async function resetChatbotServerSession(sessionId: string): Promise<void> {
  await apiPost('/api/chatbot/reset', { session_id: sessionId });
}
