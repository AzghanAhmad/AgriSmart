import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Mic, MicOff, Bot, User } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI farming assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { language } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateBotResponse(text.trim());
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('disease') || input.includes('pest') || input.includes('problem')) {
      return 'I can help you identify crop diseases! You can use the Disease Detection feature to scan your crops. For common issues:\n\n• Yellowing leaves often indicate nutrient deficiency\n• Brown spots may suggest fungal infection\n• Wilting could mean water stress\n\nWould you like specific advice for any crop?';
    }
    
    if (input.includes('fertilizer') || input.includes('nutrient')) {
      return 'For fertilizer recommendations:\n\n• Nitrogen (N): Promotes leaf growth\n• Phosphorus (P): Strengthens roots\n• Potassium (K): Improves disease resistance\n\nSoil testing is recommended before application. What crop are you growing?';
    }
    
    if (input.includes('weather') || input.includes('rain') || input.includes('irrigation')) {
      return 'Weather plays a crucial role in farming:\n\n• Check 7-day forecasts before planting\n• Avoid irrigation before expected rain\n• Protect crops during extreme weather\n\nCurrent conditions show sunny weather - good for most field activities!';
    }
    
    if (input.includes('wheat')) {
      return 'Wheat farming tips:\n\n• Best planting: November-December\n• Irrigation: 4-5 times during season\n• Common diseases: Rust, Smut\n• Harvest: April-May\n\nWhat specific wheat concern do you have?';
    }
    
    if (input.includes('rice')) {
      return 'Rice cultivation guidance:\n\n• Transplanting: June-July\n• Water management: Keep fields flooded\n• Watch for: Blast, Brown spot\n• Fertilizer: Split application recommended\n\nNeed help with any rice-related issue?';
    }

    if (input.includes('subsidy') || input.includes('loan') || input.includes('financial')) {
      return 'Financial support available:\n\n• Kisan Card: Up to PKR 50,000\n• Agricultural loans at 7% interest\n• Crop insurance programs\n• Equipment subsidies\n\nCheck the Subsidy Matcher for personalized recommendations!';
    }
    
    return 'I understand you need farming guidance. I can help with:\n\n• Crop disease identification\n• Fertilizer recommendations\n• Weather-based advice\n• Irrigation planning\n• Financial assistance info\n\nCould you be more specific about your question?';
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // Voice recording functionality would be implemented here
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setInputText('Mock voice input: How to treat wheat rust?');
      }, 2000);
    }
  };

  const quickQuestions = [
    'How to identify crop diseases?',
    'Best fertilizer for wheat',
    'When to irrigate rice?',
    'Available subsidies',
    'Weather impact on crops'
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
        <View>
          <Text style={styles.headerTitle}>AI Farming Assistant</Text>
          <Text style={styles.headerSubtitle}>
            {language === 'ur' ? 'اردو اور انگریزی میں دستیاب' : 'Available in English & Urdu'}
          </Text>
        </View>
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
              message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper
            ]}
          >
            <View style={styles.messageHeader}>
              <View style={[
                styles.messageIcon,
                message.isUser ? styles.userIcon : styles.botIcon
              ]}>
                {message.isUser ? (
                  <User color="white" size={16} />
                ) : (
                  <Bot color="white" size={16} />
                )}
              </View>
            </View>
            <View style={[
              styles.messageBubble,
              message.isUser ? styles.userMessage : styles.botMessage
            ]}>
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.botMessageText
              ]}>
                {message.text}
              </Text>
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={styles.botIcon}>
              <Bot color="white" size={16} />
            </View>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>AI is typing...</Text>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {/* Quick Questions */}
        {messages.length === 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
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
            placeholder="Ask about farming, diseases, weather..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.recordingButton]}
            onPress={handleVoiceInput}
          >
            {isRecording ? (
              <MicOff color="white" size={20} />
            ) : (
              <Mic color="#6B7280" size={20} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
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
    lineHeight: 20,
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
  dot1: {
    animationDelay: '0s',
  },
  dot2: {
    animationDelay: '0.2s',
  },
  dot3: {
    animationDelay: '0.4s',
  },
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