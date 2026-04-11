/**
 * Help & Support Page
 * FAQ accordion, contact support form, and report a problem.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Bug,
  Upload,
  X,
  ArrowLeft,
  MessageCircle,
  BookOpen,
  Camera,
  Leaf,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { spacing, borderRadius, shadows } from '@/utils/designSystem';
import { apiPost, apiPostMultipart } from '@/utils/api';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I scan crops?',
    answer:
      'Navigate to the "Scan Crop" tab in the bottom navigation. You can either take a photo with your camera or select one from your gallery. The AI will analyze the leaf image and detect any diseases within seconds.',
  },
  {
    question: 'How do I read disease results?',
    answer:
      'After scanning, you\'ll see the detected disease name, severity level (Low, Medium, High), confidence score, and recommended treatments. Green indicates healthy, yellow indicates caution, and red indicates high severity.',
  },
  {
    question: 'How do I view my schedule?',
    answer:
      'Go to the "Schedule" tab in the bottom navigation. You\'ll see your personalized farming tasks organized by date. You can add new tasks, set reminders, and mark tasks as complete.',
  },
  {
    question: 'How to contact support?',
    answer:
      'You can reach our support team through the "Contact Support" form below. Messages are delivered to our support inbox (i222667@nu.edu.pk). We typically respond within 24 hours.',
  },
  {
    question: 'How does the disease heatmap work?',
    answer:
      'The disease heatmap shows geotagged disease reports from farmers in your area. Red zones indicate high disease concentration. This helps you take preventive measures for your crops.',
  },
  {
    question: 'Can I use the app offline?',
    answer:
      'Some features like viewing previously scanned results and schedules work offline. However, scanning new crops and the AI assistant require an internet connection.',
  },
];

export default function HelpSupportScreen() {
  const { colors: tc, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Report bug modal
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugScreenshot, setBugScreenshot] = useState<string | null>(null);
  const [bugError, setBugError] = useState('');
  const [bugSuccess, setBugSuccess] = useState(false);
  const [bugLoading, setBugLoading] = useState(false);

  const toggleFaq = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleContactSubmit = async () => {
    setContactError('');
    setContactSuccess(false);

    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMessage.trim()) {
      setContactError('All fields are required');
      return;
    }
    if (!validateEmail(contactEmail)) {
      setContactError('Invalid email format');
      return;
    }

    setContactLoading(true);
    try {
      await apiPost('/api/support/contact', {
        name: contactName.trim(),
        email: contactEmail.trim(),
        subject: contactSubject.trim(),
        message: contactMessage.trim(),
      });
      setContactSuccess(true);
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
    } catch (e) {
      setContactError((e as Error).message || 'Failed to send message');
    } finally {
      setContactLoading(false);
    }
  };

  const handleBugScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to upload screenshots.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setBugScreenshot(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleBugSubmit = async () => {
    setBugError('');
    setBugSuccess(false);

    if (!bugDescription.trim()) {
      setBugError('Please describe the problem');
      return;
    }

    setBugLoading(true);
    try {
      const form = new FormData();
      form.append('description', bugDescription.trim());
      if (user?.email) {
        form.append('email', user.email);
      }
      if (bugScreenshot) {
        form.append(
          'screenshot',
          { uri: bugScreenshot, name: 'screenshot.jpg', type: 'image/jpeg' } as any,
        );
      }
      await apiPostMultipart('/api/support/report-bug', form);
      setBugSuccess(true);
      setBugDescription('');
      setBugScreenshot(null);
      setTimeout(() => {
        setBugModalVisible(false);
        setBugSuccess(false);
      }, 2000);
    } catch (e) {
      setBugError((e as Error).message || 'Failed to submit report');
    } finally {
      setBugLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={['#22C55E', '#16A34A', '#15803D']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerPattern}>
            <HelpCircle color="rgba(255,255,255,0.08)" size={100} style={styles.bgIcon} />
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(farmer)/profile')}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <HelpCircle color="white" size={32} />
            <Text style={styles.headerTitle}>Help & Support</Text>
            <Text style={styles.headerSubtitle}>
              Find answers, get help, and report issues
            </Text>
          </View>
        </LinearGradient>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <BookOpen color={tc.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>
              Frequently Asked Questions
            </Text>
          </View>
          <View style={[styles.faqCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            {FAQ_DATA.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <View key={index}>
                  <TouchableOpacity
                    style={[
                      styles.faqItem,
                      index < FAQ_DATA.length - 1 && { borderBottomWidth: 1, borderBottomColor: tc.border },
                      isExpanded && { backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : '#F0FDF4' },
                    ]}
                    onPress={() => toggleFaq(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <View style={[styles.faqNumber, { backgroundColor: isExpanded ? '#22C55E' : (isDark ? tc.cardElevated : '#F3F4F6') }]}>
                        <Text style={[styles.faqNumberText, { color: isExpanded ? 'white' : tc.textMuted }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={[styles.faqQuestion, { color: tc.text }, isExpanded && { color: '#22C55E' }]}>
                        {faq.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp color="#22C55E" size={20} />
                      ) : (
                        <ChevronDown color={tc.textMuted} size={20} />
                      )}
                    </View>
                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={[styles.faqAnswer, { color: tc.textSecondary }]}>{faq.answer}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Contact Support Form */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MessageCircle color={tc.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Contact Support</Text>
          </View>
          <View style={[styles.formCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            {contactSuccess && (
              <View style={styles.successBox}>
                <CheckCircle color="#22C55E" size={18} />
                <Text style={styles.successText}>Your message has been sent successfully.</Text>
              </View>
            )}

            {contactError !== '' && (
              <View style={styles.errorBox}>
                <AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{contactError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Your full name"
                placeholderTextColor={tc.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={tc.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Subject *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                value={contactSubject}
                onChangeText={setContactSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor={tc.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Message *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                value={contactMessage}
                onChangeText={setContactMessage}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={tc.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, contactLoading && { opacity: 0.7 }]}
              onPress={handleContactSubmit}
              disabled={contactLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.submitBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Send color="white" size={18} />
                <Text style={styles.submitBtnText}>
                  {contactLoading ? 'Sending...' : 'Send Support Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report a Problem */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionTitleRow}>
            <Bug color={tc.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Report a Problem</Text>
          </View>
          <View style={[styles.reportCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Text style={[styles.reportDesc, { color: tc.textSecondary }]}>
              Found a bug or something not working correctly? Let us know and we'll fix it as soon as possible.
            </Text>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => setBugModalVisible(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.reportBtnGradient}
              >
                <Bug color="white" size={18} />
                <Text style={styles.reportBtnText}>Report Bug</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Report Bug Modal */}
      <Modal visible={bugModalVisible} transparent animationType="fade" onRequestClose={() => setBugModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.modal, { backgroundColor: tc.card }]}>
            <View style={styles.modalHeader}>
              <Bug color="#F59E0B" size={24} />
              <Text style={[styles.modalTitle, { color: tc.text }]}>Report a Bug</Text>
              <TouchableOpacity onPress={() => { setBugModalVisible(false); setBugError(''); setBugSuccess(false); }} style={styles.modalClose}>
                <X color={tc.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            {bugSuccess && (
              <View style={styles.successBox}>
                <CheckCircle color="#22C55E" size={18} />
                <Text style={styles.successText}>Bug report submitted successfully!</Text>
              </View>
            )}

            {bugError !== '' && (
              <View style={styles.errorBox}>
                <AlertCircle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{bugError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Description *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: tc.inputBg, borderColor: tc.border, color: tc.text }]}
                value={bugDescription}
                onChangeText={setBugDescription}
                placeholder="Describe the bug you encountered..."
                placeholderTextColor={tc.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.screenshotBtn, { borderColor: tc.border, backgroundColor: tc.inputBg }]}
              onPress={handleBugScreenshot}
              activeOpacity={0.7}
            >
              {bugScreenshot ? (
                <View style={styles.screenshotDone}>
                  <CheckCircle color="#22C55E" size={18} />
                  <Text style={[styles.screenshotText, { color: '#22C55E' }]}>Screenshot attached</Text>
                </View>
              ) : (
                <View style={styles.screenshotContent}>
                  <Upload color={tc.textMuted} size={20} />
                  <Text style={[styles.screenshotText, { color: tc.textMuted }]}>Upload Screenshot (optional)</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: tc.border }]}
                onPress={() => { setBugModalVisible(false); setBugError(''); setBugSuccess(false); }}
              >
                <Text style={[styles.modalBtnCancelText, { color: tc.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSubmit, bugLoading && { opacity: 0.7 }]}
                onPress={handleBugSubmit}
                disabled={bugLoading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.modalBtnGradient}>
                  <Text style={styles.modalBtnSubmitText}>
                    {bugLoading ? 'Submitting…' : 'Submit Report'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
  },
  headerPattern: { ...StyleSheet.absoluteFillObject },
  bgIcon: {
    position: 'absolute',
    right: -10,
    top: 20,
    transform: [{ rotate: '15deg' }],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: { alignItems: 'center', gap: 8 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: spacing.base,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // FAQ
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.md,
  },
  faqItem: {
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: 12,
    marginLeft: 40,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#22C55E',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Form Card
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    ...shadows.md,
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 15,
    minHeight: 100,
  },

  // Submit button
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Success & Error
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  successText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Report card
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    ...shadows.md,
  },
  reportDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  reportBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  reportBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  reportBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnSubmit: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnSubmitText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Screenshot
  screenshotBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
  },
  screenshotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenshotDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenshotText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
