import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  Mail,
  Phone,
  MapPin,
  Save,
  LogOut,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Moon,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { translate } from '@/utils/translations';
import { useAdminReports } from '@/hooks/useAdmin';
import { apiGet, apiPost } from '@/utils/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type AdminSettingsState = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  dataBackup: boolean;
  autoReports: boolean;
  systemMaintenance: boolean;
  debugMode: boolean;
};

const DEFAULT_SETTINGS: AdminSettingsState = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  dataBackup: true,
  autoReports: true,
  systemMaintenance: false,
  debugMode: false,
};

export default function SettingsScreen() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { language, setLanguage } = useApp();
  const { colors: tc, isDark, setDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const contentWidth = Math.min(width - 24, 860);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  const [settings, setSettings] = useState<AdminSettingsState>(DEFAULT_SETTINGS);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });

  useEffect(() => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
    });
  }, [user?.name, user?.email, user?.phone, user?.location]);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { items: reportItems, total: totalReports } = useAdminReports(1, 250, 'all', '');

  useEffect(() => {
    (async () => {
      try {
        setSettingsLoading(true);
        const resp = await apiGet<{ settings: Partial<AdminSettingsState> }>('/api/admin/system-settings');
        if (resp?.settings) {
          setSettings((prev) => ({ ...prev, ...resp.settings }));
        }
      } catch {
        // Keep defaults if settings endpoint fails.
      } finally {
        setSettingsLoading(false);
      }
    })();
  }, []);

  const handleSettingChange = (key: keyof AdminSettingsState, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    void (async () => {
      try {
        const resp = await apiPost<{ settings?: Partial<AdminSettingsState> }>('/api/admin/system-settings', {
          settings: { [key]: value },
        });
        if (resp?.settings) {
          setSettings((prev) => ({ ...prev, ...resp.settings }));
        }
      } catch (e: unknown) {
        setSettings((prev) => ({ ...prev, [key]: !value }));
        const msg = e instanceof Error ? e.message : 'Failed to update setting';
        Alert.alert('Update Failed', msg);
      }
    })();
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      Alert.alert(translate('error', language), translate('nameRequired', language));
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
      });
      Alert.alert(translate('success', language), translate('profileUpdatedBody', language));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : translate('couldNotSaveProfile', language);
      Alert.alert(translate('updateFailedTitle', language), msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword.trim()) {
      Alert.alert(translate('error', language), translate('enterCurrentPassword', language));
      return;
    }
    if (passwordData.newPassword.trim().length < 8) {
      Alert.alert(translate('error', language), translate('min8Chars', language));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert(translate('error', language), translate('newPasswordsNoMatch', language));
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      Alert.alert(translate('success', language), translate('passwordChangedSuccess', language));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordSection(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : translate('updateFailedTitle', language);
      Alert.alert(translate('updateFailedTitle', language), msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(translate('logoutConfirmTitle', language), translate('logoutConfirmBody', language), [
      { text: translate('cancel', language), style: 'cancel' },
      { text: translate('logoutNav', language), style: 'destructive', onPress: logout },
    ]);
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString();
  };

  const writeAndShareFile = async (filename: string, content: string, mimeType: string, title: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'File export is supported on Android/iOS.');
      return;
    }
    const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    if (!baseDirectory) {
      throw new Error('Export storage is unavailable on this device');
    }
    const uri = `${baseDirectory}${filename}`;
    const utf8Encoding = (FileSystem as any).EncodingType?.UTF8 ?? 'utf8';
    await FileSystem.writeAsStringAsync(uri, content, { encoding: utf8Encoding as any });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Saved', `File saved at: ${uri}`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: title,
    });
  };

  const handleBackupData = async () => {
    setIsProcessingAction(true);
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        adminId: user?.id ?? null,
        profile: {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          location: profileData.location,
        },
        preferences: settings,
        reportSnapshot: {
          totalReports,
          loadedReports: reportItems.length,
          items: reportItems,
        },
      };
      const filename = `agri-smart-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await writeAndShareFile(filename, JSON.stringify(backupData, null, 2), 'application/json', 'Backup Admin Data');
      Alert.alert(translate('success', language), translate('dataBackupAlertMsg', language));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to backup data';
      Alert.alert('Backup Failed', msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExportReports = async () => {
    setIsProcessingAction(true);
    try {
      if (!reportItems.length) {
        Alert.alert('No Data', 'There are no reports to export right now.');
        return;
      }

      const escapeCsv = (value: unknown) => {
        const raw = String(value ?? '');
        if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
          return `"${raw.replace(/"/g, '""')}"`;
        }
        return raw;
      };

      const headers = [
        'Detection ID',
        'Farmer Name',
        'Disease',
        'Crop Type',
        'Location',
        'Status',
        'Confidence',
        'Submitted At',
        'Reviewed At',
      ];

      const lines = reportItems.map((report) => ([
        report.detectionId,
        report.farmerName,
        report.diseaseName,
        report.cropType,
        report.location,
        report.status,
        `${report.confidence}%`,
        formatDate(report.submittedAt),
        formatDate(report.reviewedAt),
      ].map(escapeCsv).join(',')));
      const csv = [headers.join(','), ...lines].join('\n');
      const filename = `admin-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      await writeAndShareFile(filename, csv, 'text/csv', 'Export Disease Reports');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unable to export reports';
      Alert.alert('Export Failed', msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const settingsGroups = useMemo(
    () => [
      {
        title: translate('notificationsGroup', language),
        icon: Bell,
        items: [
          {
            key: 'emailNotifications',
            label: translate('settingsEmailNotif', language),
            description: translate('settingsEmailNotifDesc', language),
            value: settings.emailNotifications,
          },
          {
            key: 'pushNotifications',
            label: translate('settingsPushNotif', language),
            description: translate('settingsPushNotifDesc', language),
            value: settings.pushNotifications,
          },
          {
            key: 'smsNotifications',
            label: translate('settingsSmsNotif', language),
            description: translate('settingsSmsNotifDesc', language),
            value: settings.smsNotifications,
          },
        ],
      },
      {
        title: translate('systemSettingsGroup', language),
        icon: SettingsIcon,
        items: [
          {
            key: 'dataBackup',
            label: translate('settingsAutoBackup', language),
            description: translate('settingsAutoBackupDesc', language),
            value: settings.dataBackup,
          },
          {
            key: 'autoReports',
            label: translate('settingsAutoReports', language),
            description: translate('settingsAutoReportsDesc', language),
            value: settings.autoReports,
          },
          {
            key: 'systemMaintenance',
            label: translate('settingsMaintenance', language),
            description: translate('settingsMaintenanceDesc', language),
            value: settings.systemMaintenance,
          },
        ],
      },
      {
        title: translate('developerSettings', language),
        icon: Database,
        items: [
          {
            key: 'debugMode',
            label: translate('settingsDebug', language),
            description: translate('settingsDebugDesc', language),
            value: settings.debugMode,
          },
        ],
      },
    ],
    [language, settings],
  );

  const ph = tc.textMuted;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tc.screen }]}
      contentContainerStyle={[styles.content, { alignItems: 'center' }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.screenInner, { width: contentWidth }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>{translate('adminSettingsTitle', language)}</Text>
        <View style={styles.headerSubtitle}>
          <Text style={[styles.subtitle, { color: tc.textMuted }]}>{translate('adminSettingsSubtitle', language)}</Text>
        </View>
      </View>

      {/* Profile Section */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={styles.sectionHeader}>
          <User color="#22C55E" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('profileInformation', language)}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('name', language)}</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              placeholder={translate('enterFullName', language)}
              placeholderTextColor={ph}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('emailAddress', language)}</Text>
            <TextInput
              style={[styles.textInput, { color: tc.textMuted, borderColor: tc.border, backgroundColor: tc.screenSecondary }]}
              value={profileData.email}
              editable={false}
              placeholder={translate('email', language)}
              placeholderTextColor={ph}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('phone', language)}</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder={translate('enterPhone', language)}
              placeholderTextColor={ph}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('location', language)}</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.location}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, location: text }))}
              placeholder={translate('enterYourLocation', language)}
              placeholderTextColor={ph}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingProfile && { opacity: 0.7 }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Save color="white" size={16} />
            )}
            <Text style={styles.saveButtonText}>
              {savingProfile ? translate('saving', language) : translate('saveProfile', language)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Section */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setShowPasswordSection(!showPasswordSection)}
        >
          <Shield color="#3B82F6" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('securitySettings', language)}</Text>
          {showPasswordSection ? (
            <EyeOff color={tc.textMuted} size={16} />
          ) : (
            <Eye color={tc.textMuted} size={16} />
          )}
        </TouchableOpacity>
        
        {showPasswordSection && (
          <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('currentPassword', language)}</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                placeholder={translate('enterCurrentPassword', language)}
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('newPassword', language)}</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                placeholder={translate('enterNewPassword', language)}
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>{translate('confirmNewPassword', language)}</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                placeholder={translate('confirmNewPasswordPh', language)}
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.changePasswordButton, changingPassword && { opacity: 0.75 }]}
              onPress={() => void handleChangePassword()}
              disabled={changingPassword}
            >
              {changingPassword ? <ActivityIndicator color="white" size="small" /> : <Shield color="white" size={16} />}
              <Text style={styles.changePasswordButtonText}>
                {changingPassword ? translate('saving', language) : translate('changePassword', language)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Language Section */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={styles.sectionHeader}>
          <Globe color="#F59E0B" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('languageRegion', language)}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={[styles.settingItem, { borderBottomColor: tc.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>{translate('appLanguage', language)}</Text>
              <Text style={[styles.settingDescription, { color: tc.textMuted }]}>
                {translate('currentLanguage', language)}{' '}
                {language === 'en' ? translate('langEnglish', language) : translate('langUrdu', language)}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleButton, { backgroundColor: tc.screenSecondary }]}
              onPress={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            >
              <Text style={[styles.toggleText, { color: tc.textSecondary }]}>
                {language === 'en' ? translate('switchToUrdu', language) : translate('switchToEnglish', language)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={styles.sectionHeader}>
          <Moon color="#8B5CF6" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('appearance', language)}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>{translate('darkMode', language)}</Text>
              <Text style={[styles.settingDescription, { color: tc.textMuted }]}>
                {translate('darkModeAdminDesc', language)}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setDarkMode}
              trackColor={{ false: tc.border, true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* Settings Groups */}
      {settingsGroups.map((group, groupIndex) => {
        const GroupIcon = group.icon;
        return (
          <View key={groupIndex} style={[styles.section, isCompact && styles.sectionCompact]}>
            <View style={styles.sectionHeader}>
              <GroupIcon color={tc.textMuted} size={20} />
              <Text style={[styles.sectionTitle, { color: tc.text }]}>{group.title}</Text>
            </View>
            <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
              {group.items.map((item, itemIndex) => (
                <View
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: tc.border },
                  ]}
                >
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: tc.text }]}>{item.label}</Text>
                    <Text style={[styles.settingDescription, { color: tc.textMuted }]}>{item.description}</Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={(value) => handleSettingChange(item.key as keyof AdminSettingsState, value)}
                    disabled={settingsLoading}
                    trackColor={{ false: tc.border, true: '#22C55E' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {/* System Actions */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={styles.sectionHeader}>
          <Database color="#8B5CF6" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('systemActions', language)}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tc.screenSecondary }, isProcessingAction && { opacity: 0.7 }]}
            onPress={() => void handleBackupData()}
            disabled={isProcessingAction}
          >
            <Database color="#22C55E" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>{translate('backupSystemData', language)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: tc.screenSecondary }, isProcessingAction && { opacity: 0.7 }]}
            onPress={() => void handleExportReports()}
            disabled={isProcessingAction}
          >
            <Mail color="#3B82F6" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>{translate('exportSystemReports', language)}</Text>
          </TouchableOpacity>
        
        </View>
      </View>

      {/* Logout Section */}
      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="white" size={16} />
            <Text style={styles.logoutButtonText}>{translate('logoutNav', language)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: tc.textMuted }]}>{translate('adminVersionLine', language)}</Text>
        <Text style={[styles.buildText, { color: tc.textMuted }]}>{translate('adminBuildLine', language)}</Text>
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  screenInner: {
    width: '100%',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionCompact: {
    marginHorizontal: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  changePasswordButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  changePasswordButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  toggleText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  buildText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});