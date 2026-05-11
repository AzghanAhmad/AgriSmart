import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { User, Mail, Phone, MapPin, Globe, Moon, Bell, Shield, LogOut, Camera, CircleHelp, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, shadows } from '@/utils/designSystem';
import { apiGet } from '@/utils/api';
import { geocodeLocationInPakistan, isInPakistan } from '@/utils/pakistanGeocode';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useFocusEffect, useRouter } from 'expo-router';
import { translate } from '@/utils/translations';

const HEADER_FIELD_BG = require('@/assets/crops/background.jpg');

type ProfileStatsResponse = {
  acresFarmed: number | null;
  cropTypesCount: number | null;
  healthScorePercent: number | null;
  monthlyRevenue: number | null;
  totalScans: number;
};

export default function ProfileScreen() {
  const { user, logout, updateProfile, uploadProfileImage } = useAuth();
  const { language, setLanguage } = useApp();
  const { colors: tc, isDark, setDarkMode } = useTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  /** When user picks a point on the Pakistan map, used on next Save (overrides geocode). */
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);

  const loadProfileStats = useCallback(async () => {
    if (!user?.id) {
      setProfileStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const data = await apiGet<ProfileStatsResponse>(
        `/api/farmer/stats/profile?farmerId=${encodeURIComponent(user.id)}`
      );
      setProfileStats(data);
    } catch {
      setProfileStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadProfileStats();
  }, [loadProfileStats]);

  useFocusEffect(
    useCallback(() => {
      void loadProfileStats();
    }, [loadProfileStats]),
  );

  const [editData, setEditData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    farmAcres: user?.farmAcres != null ? String(user.farmAcres) : '',
    farmCropTypes: user?.farmCropTypes != null ? String(user.farmCropTypes) : '',
    farmHealthScore: user?.farmHealthScore != null ? String(user.farmHealthScore) : '',
    farmMonthlyRevenue: user?.farmMonthlyRevenue != null ? String(user.farmMonthlyRevenue) : '',
  });

  useEffect(() => {
    setEditData({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      farmAcres: user?.farmAcres != null ? String(user.farmAcres) : '',
      farmCropTypes: user?.farmCropTypes != null ? String(user.farmCropTypes) : '',
      farmHealthScore: user?.farmHealthScore != null ? String(user.farmHealthScore) : '',
      farmMonthlyRevenue: user?.farmMonthlyRevenue != null ? String(user.farmMonthlyRevenue) : '',
    });
  }, [user?.name, user?.phone, user?.location, user?.farmAcres, user?.farmCropTypes, user?.farmHealthScore, user?.farmMonthlyRevenue]);

  const handleSave = async () => {
    if (!editData.name.trim()) {
      Alert.alert(translate('error', language), translate('nameRequired', language));
      return;
    }
    const locTrim = (editData.location || '').trim();
    const parseOptionalNumber = (value: string): number | null => {
      const v = (value || '').trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const farmAcres = parseOptionalNumber(editData.farmAcres);
    const farmCropTypes = parseOptionalNumber(editData.farmCropTypes);
    const farmHealthScore = parseOptionalNumber(editData.farmHealthScore);
    const farmMonthlyRevenue = parseOptionalNumber(editData.farmMonthlyRevenue);
    if (
      Number.isNaN(farmAcres) ||
      Number.isNaN(farmCropTypes) ||
      Number.isNaN(farmHealthScore) ||
      Number.isNaN(farmMonthlyRevenue)
    ) {
      Alert.alert(translate('error', language), translate('farmFieldsMustBeNumbers', language));
      return;
    }
    setSaving(true);
    try {
      let latitude: number | null | undefined = undefined;
      let longitude: number | null | undefined = undefined;
      let geocoded = false;

      if (locTrim) {
        if (manualCoords && isInPakistan(manualCoords.lat, manualCoords.lng)) {
          latitude = manualCoords.lat;
          longitude = manualCoords.lng;
          geocoded = true;
        } else {
          const g = await geocodeLocationInPakistan(locTrim);
          if (g) {
            latitude = g.lat;
            longitude = g.lng;
            geocoded = true;
          }
        }
      } else {
        latitude = null;
        longitude = null;
      }

      await updateProfile({
        name: editData.name,
        phone: editData.phone,
        location: locTrim || undefined,
        latitude,
        longitude,
        farmAcres,
        farmMonthlyRevenue,
      });
      await loadProfileStats();
      if (geocoded) {
        setManualCoords(null);
      }

      if (locTrim && !geocoded) {
        Alert.alert(
          translate('locationNotPinnedTitle', language),
          translate('locationNotPinnedMsg', language),
          [
            { text: translate('setOnMap', language), onPress: () => setMapPickerOpen(true) },
            { text: translate('ok', language), style: 'cancel', onPress: () => setIsEditing(false) },
          ],
        );
      } else {
        Alert.alert(translate('profileUpdatedTitle', language), translate('profileUpdatedBody', language));
        setIsEditing(false);
      }
    } catch (e: any) {
      Alert.alert(
        translate('updateFailedTitle', language),
        e?.message || translate('couldNotSaveProfile', language),
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = useCallback(() => {
    setEditData({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      farmAcres: user?.farmAcres != null ? String(user.farmAcres) : '',
      farmCropTypes: user?.farmCropTypes != null ? String(user.farmCropTypes) : '',
      farmHealthScore: user?.farmHealthScore != null ? String(user.farmHealthScore) : '',
      farmMonthlyRevenue: user?.farmMonthlyRevenue != null ? String(user.farmMonthlyRevenue) : '',
    });
    setManualCoords(null);
    setIsEditing(false);
  }, [user?.name, user?.phone, user?.location, user?.farmAcres, user?.farmCropTypes, user?.farmHealthScore, user?.farmMonthlyRevenue]);

  const startEdit = useCallback(() => {
    setEditData({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      farmAcres: user?.farmAcres != null ? String(user.farmAcres) : '',
      farmCropTypes: user?.farmCropTypes != null ? String(user.farmCropTypes) : '',
      farmHealthScore: user?.farmHealthScore != null ? String(user.farmHealthScore) : '',
      farmMonthlyRevenue: user?.farmMonthlyRevenue != null ? String(user.farmMonthlyRevenue) : '',
    });
    setManualCoords(null);
    setIsEditing(true);
  }, [user?.name, user?.phone, user?.location, user?.farmAcres, user?.farmCropTypes, user?.farmHealthScore, user?.farmMonthlyRevenue]);

  const handlePickedAvatar = async (uri: string | undefined) => {
    if (!uri) return;
    setPhotoUploading(true);
    try {
      await uploadProfileImage(uri);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : translate('couldNotUploadPhoto', language);
      Alert.alert(translate('uploadFailedTitle', language), msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  const openAvatarCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(translate('permissionNeeded', language), translate('cameraRequiredPhoto', language));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await handlePickedAvatar(result.assets[0].uri);
    }
  };

  const openAvatarLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(translate('permissionNeeded', language), translate('photoLibraryRequired', language));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await handlePickedAvatar(result.assets[0].uri);
    }
  };

  const pickAvatar = () => {
    Alert.alert(translate('profilePhoto', language), translate('chooseSource', language), [
      { text: translate('takePhoto', language), onPress: () => void openAvatarCamera() },
      { text: translate('chooseFromLibrary', language), onPress: () => void openAvatarLibrary() },
      { text: translate('cancel', language), style: 'cancel' },
    ]);
  };

  const handleLogout = useCallback(() => {
    Alert.alert(translate('logoutConfirmTitle', language), translate('logoutConfirmBody', language), [
      { text: translate('cancel', language), style: 'cancel' },
      { text: translate('logoutNav', language), style: 'destructive', onPress: logout },
    ]);
  }, [language, logout]);

  const profileSections = useMemo(
    () => [
      {
        title: translate('accountInformation', language),
        items: [
          { icon: User, label: translate('name', language), value: isEditing ? editData.name : user?.name, editable: true, key: 'name' },
          { icon: Mail, label: translate('email', language), value: user?.email, editable: false },
          {
            icon: Phone,
            label: translate('phoneShort', language),
            value: isEditing ? editData.phone : user?.phone || translate('notProvided', language),
            editable: true,
            key: 'phone',
          },
          {
            icon: MapPin,
            label: translate('location', language),
            value: isEditing ? editData.location : user?.location || translate('notProvided', language),
            editable: true,
            key: 'location',
          },
        ],
      },
    ],
    [language, isEditing, editData.name, editData.phone, editData.location, user?.name, user?.email, user?.phone, user?.location],
  );

  const statCards = useMemo(() => {
    const dash = '—';
    const loading = statsLoading;
    const acres =
      loading ? '…' : profileStats?.acresFarmed != null ? String(profileStats.acresFarmed) : dash;
    const crops =
      loading ? '…' : profileStats?.cropTypesCount != null ? String(profileStats.cropTypesCount) : dash;
    const health =
      loading
        ? '…'
        : profileStats?.healthScorePercent != null
          ? `${Math.round(profileStats.healthScorePercent)}%`
          : dash;
    const revenue =
      loading
        ? '…'
        : profileStats?.monthlyRevenue != null
          ? `Rs ${Math.round(profileStats.monthlyRevenue).toLocaleString()}`
          : dash;
    return [
      { v: acres, l: translate('acresFarmed', language) },
      { v: crops, l: translate('cropTypes', language) },
      { v: health, l: translate('statHealthScore', language) },
      { v: revenue, l: translate('monthlyRevenueLabel', language) },
    ];
  }, [profileStats, statsLoading, language]);

  const settingsSections = useMemo(
    () => [
      {
        title: translate('preferences', language),
        items: [
          {
            icon: Globe,
            label: translate('language', language),
            value: language === 'en' ? translate('langEnglish', language) : translate('langUrdu', language),
            type: 'toggle' as const,
            onPress: () => setLanguage(language === 'en' ? 'ur' : 'en'),
          },
          {
            icon: Moon,
            label: translate('darkMode', language),
            value: isDark,
            type: 'switch' as const,
            onPress: (value: boolean) => setDarkMode(value),
          },
          {
            icon: Bell,
            label: translate('notifications', language),
            value: notifications,
            type: 'switch' as const,
            onPress: (value: boolean) => setNotifications(value),
          },
        ],
      },
      {
        title: translate('securitySupport', language),
        items: [
          {
            icon: Shield,
            label: translate('privacySettingsNav', language),
            onPress: () => router.push('/(farmer)/privacy-settings' as any),
          },
          {
            icon: CircleHelp,
            label: translate('helpSupportNav', language),
            onPress: () => router.push('/(farmer)/help-support' as any),
          },
          {
            icon: Briefcase,
            label: translate('viewAvailableSubsidiesNav', language),
            onPress: () => router.push('/(farmer)/subsidies' as any),
          },
          { icon: LogOut, label: translate('logoutNav', language), onPress: handleLogout, danger: true },
        ],
      },
    ],
    [language, isDark, notifications, router, setLanguage, setDarkMode, handleLogout],
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      <ImageBackground source={HEADER_FIELD_BG} style={styles.header} resizeMode="cover" imageStyle={styles.headerImage}>
        <View style={styles.headerOverlay} pointerEvents="none" />
        <View style={styles.headerContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {user?.profileImageUrl ? (
                  <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
                ) : (
                  <User color="white" size={40} />
                )}
                {photoUploading && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color="white" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.cameraButton, photoUploading && { opacity: 0.6 }]}
                onPress={pickAvatar}
                disabled={photoUploading}
                accessibilityLabel="Change profile photo"
              >
                <Camera color="white" size={16} />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>
                {user?.role === 'farmer' ? translate('farmerBadge', language) : translate('adminBadge', language)}
              </Text>
              <Text style={styles.userLocation}>📍 {user?.location || '—'}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isEditing ? (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.headerTextBtn} onPress={cancelEdit} disabled={saving}>
                  <Text style={styles.headerTextBtnLabelMuted}>{translate('cancel', language)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerTextBtnPrimary, saving && { opacity: 0.75 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#15803d" size="small" />
                  ) : (
                    <Text style={styles.headerTextBtnLabelPrimary}>{translate('saveChanges', language)}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: tc.primary }]}
                onPress={startEdit}
              >
                <Text style={{ color: tc.primaryDark, fontWeight: '700', fontSize: 15 }}>{translate('edit', language)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ImageBackground>

      <View style={styles.statsContainer}>
        {isEditing
          ? [
              { key: 'farmAcres', label: translate('acresFarmed', language), editable: true },
              { key: 'farmCropTypes', label: translate('cropTypes', language), editable: false },
              { key: 'farmHealthScore', label: translate('healthScorePercent', language), editable: false },
              { key: 'farmMonthlyRevenue', label: translate('monthlyRevenueLabel', language), editable: true },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
                {s.editable ? (
                  <TextInput
                    style={[styles.statInput, { color: tc.primary, borderBottomColor: tc.border }]}
                    value={editData[s.key as keyof typeof editData]}
                    onChangeText={(text) => setEditData((prev) => ({ ...prev, [s.key]: text }))}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={tc.textMuted}
                  />
                ) : (
                  <Text style={[styles.statValue, { color: tc.primary }]}>
                    {s.key === 'farmCropTypes'
                      ? (user?.farmCropTypes != null ? String(user.farmCropTypes) : '—')
                      : (user?.farmHealthScore != null ? `${Math.round(user.farmHealthScore)}%` : '—')}
                  </Text>
                )}
                <Text style={[styles.statLabel, { color: tc.textMuted }]}>{s.label}</Text>
              </View>
            ))
          : statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
                <Text style={[styles.statValue, { color: tc.primary }]}>{s.v}</Text>
                <Text style={[styles.statLabel, { color: tc.textMuted }]}>{s.l}</Text>
              </View>
            ))}
      </View>

      {profileSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{section.title}</Text>
          <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              return (
                <View key={itemIndex} style={[styles.infoItem, { borderBottomColor: tc.border }]}>
                  <View style={styles.infoItemHeader}>
                    <IconComponent color={tc.textMuted} size={20} />
                    <Text style={[styles.infoLabel, { color: tc.textSecondary }]}>{item.label}</Text>
                  </View>

                  {isEditing && item.editable ? (
                    <View style={{ marginLeft: 28 }}>
                      <TextInput
                        style={[styles.editInput, { color: tc.text, borderBottomColor: tc.border, marginLeft: 0 }]}
                        value={editData[item.key as keyof typeof editData]}
                        keyboardType={
                          item.key === 'farmAcres' ||
                          item.key === 'farmCropTypes' ||
                          item.key === 'farmHealthScore' ||
                          item.key === 'farmMonthlyRevenue'
                            ? 'numeric'
                            : 'default'
                        }
                        onChangeText={(text) => {
                          setEditData((prev) => ({ ...prev, [item.key!]: text }));
                          if (item.key === 'location') setManualCoords(null);
                        }}
                        placeholder={
                          item.key === 'location'
                            ? translate('locationPlaceholderCity', language)
                            : translate('enterFieldHint', language)
                        }
                        placeholderTextColor={tc.textMuted}
                      />
                      {item.key === 'location' && (
                        <TouchableOpacity
                          style={[styles.mapPickerLink, { borderColor: tc.border }]}
                          onPress={() => setMapPickerOpen(true)}
                          activeOpacity={0.7}
                        >
                          <MapPin color={tc.primary} size={18} />
                          <Text style={[styles.mapPickerLinkText, { color: tc.primary }]}>
                            {translate('setPinManual', language)}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.infoValue, { color: tc.text }]}>{item.value}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>{section.title}</Text>
          <View style={[styles.sectionContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            {section.items.map((item, itemIndex) => {
              const IconComponent = item.icon;
              const hasDanger = 'danger' in item && item.danger;
              const isSwitch = 'type' in item && item.type === 'switch';
              const isToggle = 'type' in item && item.type === 'toggle';
              const hasValue = 'value' in item;

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingsItem,
                    { borderBottomColor: tc.border },
                    hasDanger && { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' },
                  ]}
                  onPress={() => {
                    if (isSwitch) return;
                    if ('onPress' in item && typeof item.onPress === 'function' && !isSwitch) {
                      (item.onPress as () => void)();
                    }
                  }}
                >
                  <View style={styles.settingsItemLeft}>
                    <IconComponent color={hasDanger ? '#EF4444' : tc.textMuted} size={20} />
                    <Text style={[styles.settingsLabel, { color: hasDanger ? '#EF4444' : tc.textSecondary }]}>{item.label}</Text>
                  </View>

                  <View style={styles.settingsItemRight}>
                    {isSwitch && hasValue ? (
                      <Switch
                        value={item.value as boolean}
                        onValueChange={(value: boolean) => {
                          if ('onPress' in item && typeof item.onPress === 'function') {
                            (item.onPress as (value: boolean) => void)(value);
                          }
                        }}
                        trackColor={{ false: tc.border, true: tc.primary }}
                        thumbColor="#fff"
                      />
                    ) : isToggle && hasValue ? (
                      <TouchableOpacity
                        style={[styles.toggleButton, { backgroundColor: tc.screenSecondary }]}
                        onPress={() => {
                          if ('onPress' in item && typeof item.onPress === 'function') {
                            (item.onPress as () => void)();
                          }
                        }}
                      >
                        <Text style={[styles.toggleText, { color: tc.textSecondary }]}>{item.value as string}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[styles.settingsValue, { color: tc.textMuted }]}>›</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: tc.textMuted }]}>{translate('agriSmartVersion', language)}</Text>
        <Text style={[styles.buildText, { color: tc.textMuted }]}>{translate('buildDate', language)}</Text>
      </View>

      <LocationPickerModal
        visible={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        constrainToPakistan
        title={translate('mapPickerTitlePK', language)}
        initialLocation={
          manualCoords
            ? { latitude: manualCoords.lat, longitude: manualCoords.lng }
            : user?.latitude != null && user?.longitude != null
              ? { latitude: user.latitude, longitude: user.longitude }
              : undefined
        }
        onSelect={({ latitude, longitude, address }) => {
          setManualCoords({ lat: latitude, lng: longitude });
          if (address && address.trim() && address !== 'Selected Location') {
            setEditData((prev) => ({ ...prev, location: address }));
          }
          setMapPickerOpen(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing['2xl'] },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  headerImage: {
    borderRadius: 0,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 101, 52, 0.45)',
  },
  headerContent: { alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: spacing.base },
  avatarContainer: { position: 'relative', marginBottom: spacing.base },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    ...shadows.md,
  },
  userInfo: { alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  userRole: { fontSize: 16, color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', marginBottom: 4 },
  userLocation: { fontSize: 15, color: 'rgba(255, 255, 255, 0.85)' },
  headerActions: { position: 'absolute', top: 20, right: 0 },
  editActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  headerTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  headerTextBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBtnLabelMuted: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
    fontSize: 15,
  },
  headerTextBtnLabelPrimary: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 15,
  },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { width: '48%', borderRadius: 12, padding: 16, alignItems: 'center', ...shadows.sm },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  statLabel: { fontSize: 12, textAlign: 'center' },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  sectionContent: { borderRadius: 12, ...shadows.md },
  infoItem: { padding: 16, borderBottomWidth: 1 },
  infoItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 16, marginLeft: 28 },
  editInput: { fontSize: 16, borderBottomWidth: 1, paddingVertical: 4 },
  mapPickerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  mapPickerLinkText: { fontSize: 14, fontWeight: '600', flex: 1 },
  settingsItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  settingsItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsLabel: { fontSize: 16 },
  settingsItemRight: { alignItems: 'center' },
  settingsValue: { fontSize: 16 },
  toggleButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleText: { fontSize: 14, fontWeight: '500' },
  versionContainer: { alignItems: 'center', padding: 24, marginTop: 16 },
  versionText: { fontSize: 14, fontWeight: '500' },
  buildText: { fontSize: 12, marginTop: 2 },
});
