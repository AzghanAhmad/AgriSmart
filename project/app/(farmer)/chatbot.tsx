import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Send, Mic, MicOff, Bot, User, RotateCcw } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { translate } from '@/utils/translations';
import {
  getStoredChatbotSessionId,
  saveChatbotSessionId,
  clearStoredChatbotSessionId,
  getStoredConversationId,
  saveConversationId,
  clearConversationId,
  createChatConversation,
  fetchChatMessages,
  sendChatbotMessage,
  resetChatbotServerSession,
  warmupChatbot,
  isConversationsApiMissing,
} from '@/services/chatbotService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

function welcomeText(language: 'en' | 'ur'): string {
  if (language === 'ur') {
    return 'السلام علیکم! میں AgriSmart ہوں — گندم، چاول اور کپاس کے بارے میں پوچھ سکتے ہیں۔';
  }
  return "Hello! I'm AgriSmart — ask me about wheat, rice, cotton, pests, or farming in Pakistan.";
}

export default function ChatbotScreen() {
  const { language } = useApp();
  const { colors: tc } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [chromaReady, setChromaReady] = useState(false);
  const [warmupError, setWarmupError] = useState<string | null>(null);
  /** False when backend has no `/api/chatbot/conversations` routes (old server) — use session_id chat only. */
  const [useServerConversations, setUseServerConversations] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const canUseChat = sessionReady && chromaReady && historyReady;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setWarmupError(null);
      (async () => {
        try {
          await warmupChatbot();
          if (!cancelled) setChromaReady(true);
        } catch (e: any) {
          if (!cancelled) {
            setChromaReady(false);
            setWarmupError(e?.message || translate('networkError', language));
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const retryWarmup = useCallback(() => {
    setWarmupError(null);
    setChromaReady(false);
    (async () => {
      try {
        await warmupChatbot();
        setChromaReady(true);
      } catch (e: any) {
        setChromaReady(false);
        setWarmupError(e?.message || translate('networkError', language));
      }
    })();
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const welcomeMsg = (): Message => ({
      id: 'welcome',
      text: welcomeText(language),
      isUser: false,
      timestamp: new Date(),
    });

    (async () => {
      setHistoryReady(false);
      setSessionReady(false);

      if (!user?.id) {
        const stored = await getStoredChatbotSessionId();
        if (!cancelled) {
          setSessionId(stored);
          setConversationId(null);
          setUseServerConversations(false);
          setMessages([welcomeMsg()]);
          setSessionReady(true);
          setHistoryReady(true);
        }
        return;
      }

      const runLegacyOnly = async () => {
        const stored = await getStoredChatbotSessionId();
        if (cancelled) return;
        setUseServerConversations(false);
        setConversationId(null);
        setSessionId(stored);
        setMessages([welcomeMsg()]);
      };

      try {
        let cid = await getStoredConversationId(user.id);
        let rows: { id: string; role: string; content: string; created_at: string | null }[] = [];

        if (cid) {
          try {
            const r = await fetchChatMessages(cid);
            rows = r.messages;
          } catch (e) {
            if (isConversationsApiMissing(e)) {
              await runLegacyOnly();
              return;
            }
            await clearConversationId(user.id);
            cid = null;
          }
        }

        if (!cid) {
          try {
            const created = await createChatConversation();
            cid = created.conversation_id;
            await saveConversationId(user.id, cid);
          } catch (e) {
            if (isConversationsApiMissing(e)) {
              await runLegacyOnly();
              return;
            }
            throw e;
          }
        }

        if (cancelled) return;

        setConversationId(cid);

        if (rows.length === 0) {
          setMessages([welcomeMsg()]);
        } else {
          setMessages(
            rows.map((m) => ({
              id: m.id,
              text: m.content,
              isUser: m.role === 'user',
              timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled && isConversationsApiMissing(e)) {
          await runLegacyOnly();
          return;
        }
        if (!cancelled) {
          Alert.alert(translate('error', language), e?.message || 'Chat load failed');
          setMessages([welcomeMsg()]);
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
          setHistoryReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, language]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !canUseChat) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const withoutWelcome = prev.filter((m) => m.id !== 'welcome');
        return [...withoutWelcome, userMessage];
      });
      setInputText('');
      setIsTyping(true);

      try {
        const { response, session_id, conversation_id: convReturned } = await sendChatbotMessage(
          text.trim(),
          {
            conversationId: user?.id && useServerConversations ? conversationId : null,
            sessionId: !user?.id || !useServerConversations ? sessionId : null,
          }
        );
        if (convReturned) setConversationId(convReturned);
        if (session_id) {
          setSessionId(session_id);
          await saveChatbotSessionId(session_id);
        }

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } catch (e: any) {
        const msg = e?.message || translate('networkError', language);
        Alert.alert(translate('error', language), msg);
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, conversationId, user?.id, useServerConversations, canUseChat, language]
  );

  const handleNewChat = useCallback(async () => {
    if (user?.id && useServerConversations) {
      try {
        await clearConversationId(user.id);
        const { conversation_id } = await createChatConversation();
        await saveConversationId(user.id, conversation_id);
        setConversationId(conversation_id);
      } catch (e) {
        if (isConversationsApiMissing(e)) {
          setUseServerConversations(false);
          try {
            if (sessionId) await resetChatbotServerSession(sessionId);
          } catch {
            /* ignore */
          }
          await clearStoredChatbotSessionId();
          setSessionId(null);
        } else {
          Alert.alert(
            translate('error', language),
            language === 'ur' ? 'نئی گفتگو شروع نہیں ہو سکی' : 'Could not start a new conversation'
          );
          return;
        }
      }
    } else {
      try {
        if (sessionId) {
          await resetChatbotServerSession(sessionId);
        }
      } catch {
        /* ignore */
      }
      await clearStoredChatbotSessionId();
      setSessionId(null);
    }
    setMessages([
      {
        id: 'welcome',
        text: welcomeText(language),
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [sessionId, user?.id, useServerConversations, language]);

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInputText('Mock voice input: How to treat wheat rust?');
      }, 2000);
    }
  };

  const quickQuestions = [
    'How to treat wheat rust disease?',
    'gandum mein zang lag gayi hai kya karein',
    'Best time to irrigate rice?',
    'kapas mein keere zyada ho gaye hain',
    'When to apply fertilizer to wheat?',
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: tc.screen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: tc.screenSecondary }]}>
          <Bot color="#22C55E" size={24} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={[styles.headerTitle, { color: tc.text }]}>AgriSmart</Text>
          {!chromaReady && !warmupError ? (
            <View style={styles.warmupRow}>
              <ActivityIndicator size="small" color="#22C55E" />
              <Text style={[styles.headerSubtitle, { color: tc.textMuted }]}>
                {language === 'ur'
                  ? 'علم کا ذخیرہ لوڈ ہو رہا ہے…'
                  : 'Loading knowledge base…'}
              </Text>
            </View>
          ) : warmupError ? (
            <View style={styles.warmupRow}>
              <Text style={styles.warmupErrorText} numberOfLines={2}>
                {warmupError}
              </Text>
              <TouchableOpacity onPress={retryWarmup} style={styles.retryChip}>
                <Text style={styles.retryChipText}>
                  {language === 'ur' ? 'دوبارہ' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.headerSubtitle, { color: tc.textMuted }]}>
              {language === 'ur' ? 'ذریعی معاون — بیک اینڈ سے منسلک' : 'Farming assistant — connected to backend'}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
          accessibilityLabel="New chat"
        >
          <RotateCcw color="#22C55E" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.messagesContainer, { backgroundColor: tc.screen }]}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
            ]}
          >
            <View style={styles.messageHeader}>
              <View
                style={[
                  styles.messageIcon,
                  message.isUser ? styles.userIcon : styles.botIcon,
                ]}
              >
                {message.isUser ? (
                  <User color="white" size={16} />
                ) : (
                  <Bot color="white" size={16} />
                )}
              </View>
            </View>
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : [styles.botMessage, { backgroundColor: tc.card, borderColor: tc.border }],
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : [styles.botMessageText, { color: tc.text }],
                ]}
              >
                {message.text}
              </Text>
              <Text style={[styles.messageTime, { color: message.isUser ? 'rgba(255,255,255,0.8)' : tc.textMuted }]}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.botIconWrap}>
              <Bot color="white" size={16} />
            </View>
            <View style={[styles.typingBubble, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={[styles.typingText, { color: tc.textMuted }]}>
                {language === 'ur' ? 'جواب تیار ہو رہا ہے…' : 'Thinking…'}
              </Text>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {canUseChat && messages.length === 1 && messages[0]?.id === 'welcome' && !isTyping && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={[styles.quickQuestionsTitle, { color: tc.textSecondary }]}>
              {language === 'ur' ? 'فوری سوالات:' : 'Quick questions:'}
            </Text>
            {quickQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickQuestionButton, { backgroundColor: tc.card, borderColor: tc.border }]}
                onPress={() => sendMessage(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: tc.headerBg, borderTopColor: tc.border }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text },
              !canUseChat && styles.textInputDisabled,
            ]}
            placeholder={
              !chromaReady
                ? language === 'ur'
                  ? 'لوڈ ہونے کا انتظار…'
                  : 'Waiting for assistant to load…'
                : !historyReady
                  ? language === 'ur'
                    ? 'گفتگو لوڈ ہو رہی ہے…'
                    : 'Loading conversation…'
                  : language === 'ur'
                    ? 'فصل، بیماری، کھاد، آبپاشی…'
                    : 'Ask about crops, disease, fertilizer, irrigation…'
            }
            placeholderTextColor={tc.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={canUseChat}
          />

          <TouchableOpacity
            style={[styles.voiceButton, { backgroundColor: tc.screenSecondary }, isRecording && styles.recordingButton]}
            onPress={handleVoiceInput}
            disabled={!canUseChat}
          >
            {isRecording ? (
              <MicOff color="white" size={20} />
            ) : (
              <Mic color={tc.textMuted} size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !canUseChat) && styles.disabledButton,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || !canUseChat}
          >
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  warmupErrorText: {
    fontSize: 11,
    color: '#B45309',
    flex: 1,
    minWidth: 120,
  },
  retryChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageHeader: {
    width: 32,
  },
  messageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIcon: {
    backgroundColor: '#3B82F6',
  },
  botIcon: {
    backgroundColor: '#22C55E',
  },
  botIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#3B82F6',
  },
  botMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#374151',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  dot1: {},
  dot2: {},
  dot3: {},
  quickQuestionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  quickQuestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  quickQuestionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  quickQuestionText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  textInputDisabled: {
    opacity: 0.75,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
});
