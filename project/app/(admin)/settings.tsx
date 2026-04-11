import React, { useState, useEffect } from 'react';
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
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save profile. Try again.';
      Alert.alert('Update failed', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    Alert.alert('Success', 'Password changed successfully');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleBackupData = () => {
    Alert.alert('Data Backup', 'Starting system backup. This may take a few minutes.');
  };

  const handleExportReports = () => {
    Alert.alert('Export Reports', 'Generating comprehensive system reports...');
  };

  const settingsGroups = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive notifications via email',
          value: settings.emailNotifications,
        },
        {
          key: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Receive mobile push notifications',
          value: settings.pushNotifications,
        },
        {
          key: 'smsNotifications',
          label: 'SMS Notifications',
          description: 'Receive critical alerts via SMS',
          value: settings.smsNotifications,
        },
      ]
    },
    {
      title: 'System Settings',
      icon: SettingsIcon,
      items: [
        {
          key: 'dataBackup',
          label: 'Automatic Backup',
          description: 'Auto-backup system data daily',
          value: settings.dataBackup,
        },
        {
          key: 'autoReports',
          label: 'Automatic Reports',
          description: 'Generate weekly system reports',
          value: settings.autoReports,
        },
        {
          key: 'systemMaintenance',
          label: 'Maintenance Mode',
          description: 'Enable system maintenance mode',
          value: settings.systemMaintenance,
        },
      ]
    },
    {
      title: 'Developer Settings',
      icon: Database,
      items: [
        {
          key: 'debugMode',
          label: 'Debug Mode',
          description: 'Enable detailed system logging',
          value: settings.debugMode,
        },
      ]
    },
  ];

  const ph = tc.textMuted;

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Admin Settings</Text>
        <View style={styles.headerSubtitle}>
          <Text style={[styles.subtitle, { color: tc.textMuted }]}>Manage system configuration and preferences</Text>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User color="#22C55E" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Profile Information</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your full name"
              placeholderTextColor={ph}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.textInput, { color: tc.textMuted, borderColor: tc.border, backgroundColor: tc.screenSecondary }]}
              value={profileData.email}
              editable={false}
              placeholder="Email"
              placeholderTextColor={ph}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              placeholderTextColor={ph}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
              value={profileData.location}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, location: text }))}
              placeholder="Enter your location"
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
            <Text style={styles.saveButtonText}>{savingProfile ? 'Saving…' : 'Save Profile'}</Text>
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
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Security Settings</Text>
          {showPasswordSection ? (
            <EyeOff color={tc.textMuted} size={16} />
          ) : (
            <Eye color={tc.textMuted} size={16} />
          )}
        </TouchableOpacity>
        
        {showPasswordSection && (
          <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Current Password</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                placeholder="Enter current password"
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>New Password</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                placeholder="Enter new password"
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: tc.textSecondary }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.textInput, { color: tc.text, borderColor: tc.border, backgroundColor: tc.inputBg }]}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                placeholder="Confirm new password"
                placeholderTextColor={ph}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.changePasswordButton} onPress={handleChangePassword}>
              <Shield color="white" size={16} />
              <Text style={styles.changePasswordButtonText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Globe color="#F59E0B" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Language & Region</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={[styles.settingItem, { borderBottomColor: tc.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>Application Language</Text>
              <Text style={[styles.settingDescription, { color: tc.textMuted }]}>
                Current: {language === 'en' ? 'English' : 'اردو'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toggleButton, { backgroundColor: tc.screenSecondary }]}
              onPress={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            >
              <Text style={[styles.toggleText, { color: tc.textSecondary }]}>
                {language === 'en' ? 'Switch to اردو' : 'Switch to English'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Moon color="#8B5CF6" size={20} />
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Appearance</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: tc.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: tc.textMuted }]}>
                Use dark backgrounds across the admin app
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
          <Text style={[styles.sectionTitle, { color: tc.text }]}>System Actions</Text>
        </View>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tc.screenSecondary }]} onPress={handleBackupData}>
            <Database color="#22C55E" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>Backup System Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: tc.screenSecondary }]} onPress={handleExportReports}>
            <Mail color="#3B82F6" size={16} />
            <Text style={[styles.actionButtonText, { color: tc.textSecondary }]}>Export System Reports</Text>
          </TouchableOpacity>
        
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="white" size={16} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: tc.textMuted }]}>AgriSmart Admin v1.0.0</Text>
        <Text style={[styles.buildText, { color: tc.textMuted }]}>Build 2024.01.15 - Admin Panel</Text>
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