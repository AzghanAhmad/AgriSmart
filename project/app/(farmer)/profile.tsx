import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { User, Mail, Phone, MapPin, Globe, Moon, Bell, Shield, LogOut, CreditCard as Edit3, Save, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });

  const handleSave = () => {
    // In a real app, this would call an API to update user profile
    Alert.alert('Success', 'Profile updated successfully');
    setIsEditing(false);
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

  const profileSections = [
    {
      title: 'Account Information',
      items: [
        {
          icon: User,
          label: 'Full Name',
          value: isEditing ? editData.name : user?.name,
          editable: true,
          key: 'name'
        },
        {
          icon: Mail,
          label: 'Email',
          value: user?.email,
          editable: false
        },
        {
          icon: Phone,
          label: 'Phone',
          value: isEditing ? editData.phone : user?.phone || 'Not provided',
          editable: true,
          key: 'phone'
        },
        {
          icon: MapPin,
          label: 'Location',
          value: isEditing ? editData.location : user?.location || 'Not provided',
          editable: true,
          key: 'location'
        }
      ]
    }
  ];

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        {
          icon: Globe,
          label: 'Language',
          value: language === 'en' ? 'English' : 'اردو',
          type: 'toggle',
          onPress: () => setLanguage(language === 'en' ? 'ur' : 'en')
        },
        {
          icon: Moon,
          label: 'Dark Mode',
          value: darkMode,
          type: 'switch',
          onPress: (value: boolean) => setDarkMode(value)
        },
        {
          icon: Bell,
          label: 'Notifications',
          value: notifications,
          type: 'switch',
          onPress: (value: boolean) => setNotifications(value)
        }
      ]
    },
    {
      title: 'Security & Support',
      items: [
        {
          icon: Shield,
          label: 'Privacy Settings',
          onPress: () => Alert.alert('Privacy Settings', 'Privacy settings would open here')
        },
        {
          icon: LogOut,
          label: 'Logout',
          onPress: handleLogout,
          danger: true
        }
      ]
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User color="white" size={32} />
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'farmer' ? 'Farmer' : 'Administrator'}
            </Text>
            <Text style={styles.userLocation}>{user?.location}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <X color="#6B7280" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Save color="white" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Edit3 color="#22C55E" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Farm Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12.5</Text>
          <Text style={styles.statLabel}>Acres Farmed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Crop Types</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>95%</Text>
          <Text style={styles.statLabel}>Health Score</Text>
        </View>
      </View>

      {/* Profile Information */}
      {profileSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <View key={itemIndex} style={styles.infoItem}>
                  <View style={styles.infoItemHeader}>
                    <IconComponent color="#6B7280" size={20} />
                    <Text style={styles.infoLabel}>{item.label}</Text>
                  </View>
                  
                  {isEditing && item.editable ? (
                    <TextInput
                      style={styles.editInput}
                      value={editData[item.key as keyof typeof editData]}
                      onChangeText={(text) => 
                        setEditData(prev => ({ ...prev, [item.key!]: text }))
                      }
                      placeholder={`Enter ${item.label.toLowerCase()}`}
                    />
                  ) : (
                    <Text style={styles.infoValue}>{item.value}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {/* Settings */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.settingsItem, item.danger && styles.dangerItem]}
                  onPress={() => {
                    if (item.type === 'switch') return;
                    item.onPress?.();
                  }}
                >
                  <View style={styles.settingsItemLeft}>
                    <IconComponent 
                      color={item.danger ? '#EF4444' : '#6B7280'} 
                      size={20} 
                    />
                    <Text style={[
                      styles.settingsLabel,
                      item.danger && styles.dangerLabel
                    ]}>
                      {item.label}
                    </Text>
                  </View>
                  
                  <View style={styles.settingsItemRight}>
                    {item.type === 'switch' ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={item.onPress}
                        trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
                        thumbColor="white"
                      />
                    ) : item.type === 'toggle' ? (
                      <TouchableOpacity style={styles.toggleButton} onPress={item.onPress}>
                        <Text style={styles.toggleText}>{item.value as string}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.settingsValue}>›</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>AgriSmart v1.0.0</Text>
        <Text style={styles.buildText}>Build 2024.01.15</Text>
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
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#22C55E',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 28,
  },
  editInput: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerItem: {
    backgroundColor: '#FEF2F2',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#374151',
  },
  dangerLabel: {
    color: '#EF4444',
  },
  settingsItemRight: {
    alignItems: 'center',
  },
  settingsValue: {
    fontSize: 16,
    color: '#9CA3AF',
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