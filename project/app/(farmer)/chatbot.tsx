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
  Switch,
} from 'react-native';
import { Send, Mic, MicOff, Bot, User, RotateCcw } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { useHybridVoice, speakBotResponse, type VoiceLocale } from '@/services/voiceService';
import {
  getStoredChatbotSessionId,
  saveChatbotSessionId,
  clearStoredChatbotSessionId,
  sendChatbotMessage,
  resetChatbotServerSession,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  /** Chat API in-flight only (mic phases handled in voiceService hook). */
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  /** Explicit mic mode: ON => Urdu STT, OFF => English STT. */
  const [useUrduVoice, setUseUrduVoice] = useState(language === 'ur');
  const scrollViewRef = useRef<ScrollView>(null);

  const voiceLocale: VoiceLocale = useUrduVoice ? 'ur-PK' : 'en-US';

  useEffect(() => {
    setUseUrduVoice(language === 'ur');
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredChatbotSessionId();
      if (!cancelled) {
        setSessionId(stored);
        setMessages([
          {
            id: 'welcome',
            text: welcomeText(language),
            isUser: false,
            timestamp: new Date(),
          },
        ]);
        setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, opts?: { fromVoice?: boolean }) => {
      if (!text.trim() || !sessionReady) {
        return;
      }

      setIsAwaitingReply(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');

      try {
        const chatLang: 'en' | 'ur' =
          opts?.fromVoice ? (useUrduVoice ? 'ur' : 'en') : language === 'ur' ? 'ur' : 'en';
        const { response, session_id } = await sendChatbotMessage(
          text.trim(),
          sessionId,
          chatLang,
          { fromVoice: opts?.fromVoice }
        );
        setSessionId(session_id);
        await saveChatbotSessionId(session_id);

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);

        const loc: VoiceLocale = useUrduVoice ? 'ur-PK' : 'en-US';
        try {
          await speakBotResponse(response, loc);
        } catch (e) {
          console.warn('[chatbot] speakBotResponse (native TTS + backend fallback):', e);
        }
      } catch (e: any) {
        const msg =
          e?.message ||
          translate('networkError', language);
        Alert.alert(translate('error', language), msg);
      } finally {
        setIsAwaitingReply(false);
      }
    },
    [sessionId, sessionReady, language, useUrduVoice]
  );

  const submitVoiceTranscript = useCallback(
    (text: string) => {
      void sendMessage(text, { fromVoice: true });
    },
    [sendMessage]
  );

  const {
    phase: voicePhase,
    liveTranscript,
    errorMessage: voiceErrorMessage,
    toggleMic,
    resetError: resetVoiceError,
  } = useHybridVoice({
    locale: voiceLocale,
    onFinalText: submitVoiceTranscript,
    canInteract: sessionReady && !isAwaitingReply,
  });

  useEffect(() => {
    if (!voiceErrorMessage) return;
    Alert.alert(
      language === 'ur' ? 'آواز' : 'Voice',
      voiceErrorMessage,
      [{ text: 'OK', onPress: resetVoiceError }]
    );
  }, [voiceErrorMessage, language, resetVoiceError]);

  const handleNewChat = useCallback(async () => {
    try {
      if (sessionId) {
        await resetChatbotServerSession(sessionId);
      }
    } catch {
      // Still clear local session if server reset fails
    }
    await clearStoredChatbotSessionId();
    setSessionId(null);
    setMessages([
      {
        id: 'welcome',
        text: welcomeText(language),
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [sessionId, language]);

  const isVoiceBusy =
    voicePhase === 'listening' || voicePhase === 'recording' || voicePhase === 'processing';

  const handleVoiceInput = useCallback(() => {
    toggleMic();
  }, [toggleMic]);

  const quickQuestions = [
    'How to treat wheat rust disease?',
    'gandum mein zang lag gayi hai kya karein',
    'Best time to irrigate rice?',
    'kapas mein keere zyada ho gaye hain',
    'When to apply fertilizer to wheat?',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bot color="#22C55E" size={24} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>AgriSmart</Text>
          <Text style={styles.headerSubtitle}>
            {language === 'ur' ? 'ذریعی معاون — بیک اینڈ سے منسلک' : 'Farming assistant — connected to backend'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
          accessibilityLabel="New chat"
        >
          <RotateCcw color="#22C55E" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.voiceLangRow}>
        <Text style={styles.voiceLangLabel}>
          {useUrduVoice ? 'Urdu voice mode' : 'English voice mode'}
        </Text>
        <Switch
          value={useUrduVoice}
          onValueChange={setUseUrduVoice}
          trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
          thumbColor={useUrduVoice ? '#22C55E' : '#F3F4F6'}
          accessibilityLabel="Toggle Urdu microphone speech recognition"
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
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
                message.isUser ? styles.userMessage : styles.botMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userMessageText : styles.botMessageText,
                ]}
              >
                {message.text}
              </Text>
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}

        {isAwaitingReply && (
          <View style={styles.typingIndicator}>
            <View style={styles.botIconWrap}>
              <Bot color="white" size={16} />
            </View>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>
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

        {messages.length === 1 && !isAwaitingReply && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>
              {language === 'ur' ? 'فوری سوالات:' : 'Quick questions:'}
            </Text>
            {quickQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestionButton}
                onPress={() => sendMessage(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={
              language === 'ur'
                ? 'فصل، بیماری، کھاد، آبپاشی…'
                : 'Ask about crops, disease, fertilizer, irrigation…'
            }
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isAwaitingReply}
          />

          <TouchableOpacity
            style={[styles.voiceButton, isVoiceBusy && styles.recordingButton]}
            onPress={handleVoiceInput}
            accessibilityLabel="Voice input"
          >
            {isVoiceBusy ? (
              <MicOff color="white" size={20} />
            ) : (
              <Mic color="#6B7280" size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
            onPress={() => {
              sendMessage(inputText);
            }}
            disabled={!inputText.trim() || isAwaitingReply || isVoiceBusy}
          >
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Hybrid voice: status + live/final transcript */}
        {isVoiceBusy && (
          <View style={styles.listeningIndicator}>
            <Text style={styles.listeningText}>
              {voicePhase === 'recording'
                ? 'Recording… tap mic again to send'
                : voicePhase === 'processing'
                  ? 'Transcribing…'
                  : 'Listening…'}
            </Text>
            {liveTranscript ? (
              <Text style={styles.transcriptText} numberOfLines={3}>
                {liveTranscript}
              </Text>
            ) : null}
          </View>
        )}
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
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  voiceLangLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    paddingRight: 12,
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
  // Newly added: minimal listening feedback
  listeningIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  listeningText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  transcriptText: {
    marginTop: 6,
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 8,
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