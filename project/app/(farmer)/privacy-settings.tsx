/**
 * Privacy Settings Page
 * Account security and data management.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Shield,
  BarChart3,
  Lock,
  LogOut,
  Download,
  Trash2,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { spacing, shadows } from '@/utils/designSystem';
import { downloadAndShareFarmerPdf } from '@/utils/exportData';
import { useRouter } from 'expo-router';

export default function PrivacySettingsScreen() {
  const { colors: tc } = useTheme();
  const { changePassword, logoutAllDevices, deleteAccount } = useAuth();
  const router = useRouter();

  // Modals
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Delete confirmation
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password too short (minimum 8 characters)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setChangePwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPasswordError((e as Error).message || 'Could not change password');
    } finally {
      setChangePwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteAccount();
      setDeleteAccountModal(false);
      setDeleteConfirmText('');
      Alert.alert('Account deleted', 'Your account has been permanently removed.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Could not delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Logout From All Devices',
      'This will sign you out everywhere, including this device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            setLogoutAllLoading(true);
            try {
              await logoutAllDevices();
            } catch (e) {
              Alert.alert('Error', (e as Error).message || 'Request failed');
            } finally {
              setLogoutAllLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDownloadData = async () => {
    setDownloadLoading(true);
    try {
      await downloadAndShareFarmerPdf();
    } catch (e) {
      Alert.alert('Download failed', (e as Error).message);
    } finally {
      setDownloadLoading(false);
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
            <Shield color="rgba(255,255,255,0.08)" size={100} style={styles.bgIcon} />
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(farmer)/profile')}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Shield color="white" size={32} />
            <Text style={styles.headerTitle}>Privacy & Security</Text>
            <Text style={styles.headerSubtitle}>
              Manage your account security and personal data
            </Text>
          </View>
        </LinearGradient>

        {/* Section: Account Security */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Shield color={tc.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Account Security</Text>
          </View>
          <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: tc.border }]}
              onPress={() => setChangePasswordModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.toggleIconBg, { backgroundColor: '#F59E0B20' }]}>
                  <Lock color="#F59E0B" size={18} />
                </View>
                <Text style={[styles.actionLabel, { color: tc.text }]}>Change Password</Text>
              </View>
              <ChevronRight color={tc.textMuted} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItemLast}
              onPress={handleLogoutAll}
              disabled={logoutAllLoading}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.toggleIconBg, { backgroundColor: '#EF444420' }]}>
                  <LogOut color="#EF4444" size={18} />
                </View>
                <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Logout from All Devices</Text>
              </View>
              <ChevronRight color={tc.textMuted} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Data Management */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionTitleRow}>
            <BarChart3 color={tc.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Data Management</Text>
          </View>
          <View style={[styles.card, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: tc.border }]}
              onPress={handleDownloadData}
              disabled={downloadLoading}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.toggleIconBg, { backgroundColor: '#22C55E20' }]}>
                  {downloadLoading ? (
                    <ActivityIndicator color="#22C55E" />
                  ) : (
                    <Download color="#22C55E" size={18} />
                  )}
                </View>
                <View>
                  <Text style={[styles.actionLabel, { color: tc.text }]}>
                    {downloadLoading ? 'Preparing PDF…' : 'Download My Data'}
                  </Text>
                  <Text style={[styles.actionDesc, { color: tc.textMuted }]}>
                    PDF of your scans and timelapse progress
                  </Text>
                </View>
              </View>
              <ChevronRight color={tc.textMuted} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItemLast}
              onPress={() => setDeleteAccountModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.toggleIconBg, { backgroundColor: '#EF444420' }]}>
                  <Trash2 color="#EF4444" size={18} />
                </View>
                <View>
                  <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Delete My Account</Text>
                  <Text style={[styles.actionDesc, { color: tc.textMuted }]}>
                    Permanently delete your account
                  </Text>
                </View>
              </View>
              <ChevronRight color={tc.textMuted} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={changePasswordModal} transparent animationType="fade" onRequestClose={() => setChangePasswordModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.modal, { backgroundColor: tc.card }]}>
            <View style={styles.modalHeader}>
              <Lock color={tc.primary} size={24} />
              <Text style={[styles.modalTitle, { color: tc.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => { setChangePasswordModal(false); setPasswordError(''); }} style={styles.modalClose}>
                <X color={tc.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            {passwordError !== '' && (
              <View style={styles.errorBox}>
                <AlertTriangle color="#EF4444" size={16} />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Current Password</Text>
              <View style={[styles.inputRow, { backgroundColor: tc.inputBg, borderColor: tc.border }]}>
                <TextInput
                  style={[styles.input, { color: tc.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPw}
                  placeholder="Enter current password"
                  placeholderTextColor={tc.textMuted}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                  {showCurrentPw ? <EyeOff color={tc.textMuted} size={20} /> : <Eye color={tc.textMuted} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: tc.inputBg, borderColor: tc.border }]}>
                <TextInput
                  style={[styles.input, { color: tc.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPw}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={tc.textMuted}
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff color={tc.textMuted} size={20} /> : <Eye color={tc.textMuted} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputRow, { backgroundColor: tc.inputBg, borderColor: tc.border }]}>
                <TextInput
                  style={[styles.input, { color: tc.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPw}
                  placeholder="Re-enter new password"
                  placeholderTextColor={tc.textMuted}
                />
                <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)}>
                  {showConfirmPw ? <EyeOff color={tc.textMuted} size={20} /> : <Eye color={tc.textMuted} size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: tc.border }]}
                onPress={() => { setChangePasswordModal(false); setPasswordError(''); }}
              >
                <Text style={[styles.modalBtnCancelText, { color: tc.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, changePwLoading && { opacity: 0.75 }]}
                onPress={handleChangePassword}
                disabled={changePwLoading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.modalBtnGradient}>
                  {changePwLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Update Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={deleteAccountModal} transparent animationType="fade" onRequestClose={() => setDeleteAccountModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.modal, { backgroundColor: tc.card }]}>
            <View style={styles.modalHeader}>
              <AlertTriangle color="#EF4444" size={24} />
              <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteAccountModal(false)} style={styles.modalClose}>
                <X color={tc.textMuted} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle color="#EF4444" size={20} />
              <Text style={styles.warningText}>
                This action is irreversible. All your data, crop scans, schedules, and account information will be permanently deleted.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>
                Type <Text style={{ fontWeight: '800', color: '#EF4444' }}>DELETE</Text> to confirm
              </Text>
              <View style={[styles.inputRow, { backgroundColor: tc.inputBg, borderColor: deleteConfirmText === 'DELETE' ? '#22C55E' : tc.border }]}>
                <TextInput
                  style={[styles.input, { color: tc.text }]}
                  value={deleteConfirmText}
                  onChangeText={setDeleteConfirmText}
                  placeholder="Type DELETE here"
                  placeholderTextColor={tc.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: tc.border }]}
                onPress={() => { setDeleteAccountModal(false); setDeleteConfirmText(''); }}
              >
                <Text style={[styles.modalBtnCancelText, { color: tc.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  (deleteConfirmText !== 'DELETE' || deleteLoading) && { opacity: 0.5 },
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                activeOpacity={0.8}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete Account</Text>
                )}
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

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.md,
  },

  toggleIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action Items
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  actionItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 12,
    marginTop: 2,
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
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Error box
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

  // Warning box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningText: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Delete button
  deleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
