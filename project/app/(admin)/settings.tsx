import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
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
  EyeOff
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useApp();
  
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

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    Alert.alert('Success', 'Profile updated successfully');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Settings</Text>
        <View style={styles.headerSubtitle}>
          <Text style={styles.subtitle}>Manage system configuration and preferences</Text>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User color="#22C55E" size={20} />
          <Text style={styles.sectionTitle}>Profile Information</Text>
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.name}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.email}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.location}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, location: text }))}
              placeholder="Enter your location"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Save color="white" size={16} />
            <Text style={styles.saveButtonText}>Save Profile</Text>
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
          <Text style={styles.sectionTitle}>Security Settings</Text>
          {showPasswordSection ? (
            <EyeOff color="#6B7280" size={16} />
          ) : (
            <Eye color="#6B7280" size={16} />
          )}
        </TouchableOpacity>
        
        {showPasswordSection && (
          <View style={styles.sectionContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                placeholder="Confirm new password"
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
          <Text style={styles.sectionTitle}>Language & Region</Text>
        </View>
        <View style={styles.sectionContent}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Application Language</Text>
              <Text style={styles.settingDescription}>
                Current: {language === 'en' ? 'English' : 'اردو'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setLanguage(language === 'en' ? 'ur' : 'en')}
            >
              <Text style={styles.toggleText}>
                {language === 'en' ? 'Switch to اردو' : 'Switch to English'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Settings Groups */}
      {settingsGroups.map((group, groupIndex) => {
        const GroupIcon = group.icon;
        return (
          <View key={groupIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <GroupIcon color="#6B7280" size={20} />
              <Text style={styles.sectionTitle}>{group.title}</Text>
            </View>
            <View style={styles.sectionContent}>
              {group.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingDescription}>{item.description}</Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={(value) => handleSettingChange(item.key, value)}
                    trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
                    thumbColor="white"
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
          <Text style={styles.sectionTitle}>System Actions</Text>
        </View>
        <View style={styles.sectionContent}>
          <TouchableOpacity style={styles.actionButton} onPress={handleBackupData}>
            <Database color="#22C55E" size={16} />
            <Text style={styles.actionButtonText}>Backup System Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportReports}>
            <Mail color="#3B82F6" size={16} />
            <Text style={styles.actionButtonText}>Export System Reports</Text>
          </TouchableOpacity>
        
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="white" size={16} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>AgriSmart Admin v1.0.0</Text>
        <Text style={styles.buildText}>Build 2024.01.15 - Admin Panel</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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