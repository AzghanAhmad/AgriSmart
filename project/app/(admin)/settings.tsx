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

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { language, setLanguage } = useApp();
  const { colors: tc, isDark, setDarkMode } = useTheme();
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    dataBackup: true,
    autoReports: true,
    systemMaintenance: false,
    debugMode: false,
  });

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

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert(translate('error', language), translate('newPasswordsNoMatch', language));
      return;
    }
    Alert.alert(translate('success', language), translate('passwordChangedSuccess', language));
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleLogout = () => {
    Alert.alert(translate('logoutConfirmTitle', language), translate('logoutConfirmBody', language), [
      { text: translate('cancel', language), style: 'cancel' },
      { text: translate('logoutNav', language), style: 'destructive', onPress: logout },
    ]);
  };

  const handleBackupData = () => {
    Alert.alert(translate('dataBackupAlertTitle', language), translate('dataBackupAlertMsg', language));
  };

  const handleExportReports = () => {
    Alert.alert(translate('exportReportsAlertTitle', language), translate('exportReportsAlertMsg', language));
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
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>{translate('adminSettingsTitle', language)}</Text>
        <View style={styles.headerSubtitle}>
          <Text style={[styles.subtitle, { color: tc.textMuted }]}>{translate('adminSettingsSubtitle', language)}</Text>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
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
      <View style={styles.section}>
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

            <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
              <Shield color="white" size={16} />
              <Text style={styles.changePasswordButtonText}>{translate('changePassword', language)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Language Section */}
      <View style={styles.section}>
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
      <View style={styles.section}>
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
          <View key={groupIndex} style={styles.section}>
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
                    onValueChange={(value) => handleSettingChange(item.key, value)}
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Database color="#8B5CF6" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('systemActions', language)}</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tc.screenSecondary }]} onPress={handleBackupData}>
            <Database color="#22C55E" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>{translate('backupSystemData', language)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tc.screenSecondary }]} onPress={handleExportReports}>
            <Mail color="#3B82F6" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>{translate('exportSystemReports', language)}</Text>
          </TouchableOpacity>
        
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
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