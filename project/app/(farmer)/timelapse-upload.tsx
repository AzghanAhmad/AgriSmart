/**
 * Smart TimeLapse Upload Screen
 * 
 * Beautiful upload interface with camera/gallery support, AI detection preview,
 * and smooth animations. The hero feature of AgriSmart!
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Image as ImageIcon, Upload, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
// Use React Native's built-in Animated for Expo Go compatibility
import { Animated as RNAnimated } from 'react-native';

// Create compatible Animated components
const Animated = {
  View: RNAnimated.View,
  ScrollView: RNAnimated.ScrollView,
  Image: RNAnimated.Image,
  Text: RNAnimated.Text,
};

// Fallback animation helpers (no-op for now, can add RN Animated later if needed)
const useSharedValue = (initial: number) => ({ value: initial });
const useAnimatedStyle = (fn: () => any) => ({});
const withSpring = (value: any) => value;
const withTiming = (value: any) => value;
const withRepeat = (value: any) => value;
const withSequence = (...args: any[]) => args[0];
const FadeIn = { duration: () => ({}) };
const FadeOut = { duration: () => ({}) };
const SlideInDown = { delay: () => ({}) };
const ZoomIn = { springify: () => ({}), delay: () => ({}) };

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getApiBaseUrl } from '@/utils/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, shadows, typography } from '@/utils/designSystem';
import { ArrowLeft } from 'lucide-react-native';
import { TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

interface Crop {
  id: number;
  name: string;
  crop_type: string;
}

/** One selected image; date is set by the user 1 by 1 after picking */
export interface SelectedImageItem {
  uri: string;
  /** Unix timestamp (ms); null until user sets date for this image */
  createdAt: number | null;
  /** Display string e.g. "Jan 2025"; null until user sets date */
  monthYear: string | null;
}

const ORDINALS = ['1st', '2nd', '3rd'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Fixed crops for timelapse: Wheat, Rice, Cotton only */
const CROP_TYPES = ['wheat', 'rice', 'cotton'] as const;
const CROP_NAMES: Record<(typeof CROP_TYPES)[number], string> = { wheat: 'Wheat', rice: 'Rice', cotton: 'Cotton' };

function formatMonthYear(monthIndex: number, year: number): string {
  return `${MONTHS[monthIndex]} ${year}`;
}

function monthYearToTimestamp(monthIndex: number, year: number): number {
  return new Date(year, monthIndex, 1).getTime();
}

interface DetectionResult {
  disease: string;
  severity: string;
  confidence: number;
  weather: {
    temp: number | null;
    humidity: number | null;
  };
}

export default function TimeLapseUploadScreen() {
  const router = useRouter();
  const { cropId } = useLocalSearchParams<{ cropId?: string }>();
  const { user } = useAuth();
  const { colors: tc, isDark } = useTheme();
  
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery'>('camera');
  /** Which image index is having its date set; null = date picker closed */
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  
  // Animation values
  const sparkleRotation = useSharedValue(0);
  const uploadProgress = useSharedValue(0);
  const successScale = useSharedValue(0);

  // Load user crops
  useEffect(() => {
    loadCrops();
  }, []);

  // Auto-select crop if passed via params
  useEffect(() => {
    if (cropId && crops.length > 0) {
      const crop = crops.find(c => c.id.toString() === cropId);
      if (crop) setSelectedCrop(crop);
    }
  }, [cropId, crops]);

  // Animated sparkle rotation
  useEffect(() => {
    try {
      sparkleRotation.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );
    } catch (error) {
      console.warn('Reanimated animation error:', error);
      // Fallback: set static value
      sparkleRotation.value = 0;
    }
  }, []);

  const loadCrops = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/crops`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to load crops:', response.status, errorText);
        Alert.alert('Error', 'Failed to load crops. Please try again.');
        return;
      }

      const data = await response.json();
      let list: Crop[] = data.crops || [];

      // Ensure we have exactly one crop per type (Wheat, Rice, Cotton); create any missing
      for (const type of CROP_TYPES) {
        if (!list.some((c: Crop) => (c.crop_type || '').toLowerCase() === type)) {
          try {
            const createRes = await fetch(`${getApiBaseUrl()}/api/timelapse/crops`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ name: CROP_NAMES[type], crop_type: type }),
            });
            if (createRes.ok) {
              const created = await createRes.json();
              list = [...list, created];
            }
          } catch (e) {
            console.warn('Could not create crop for', type, e);
          }
        }
      }

      // Display exactly 3 crops in fixed order: Wheat, Rice, Cotton
      const threeCrops: Crop[] = CROP_TYPES.map((type) =>
        list.find((c: Crop) => (c.crop_type || '').toLowerCase() === type)
      ).filter(Boolean) as Crop[];
      setCrops(threeCrops);
    } catch (error: any) {
      console.error('❌ Failed to load crops:', error);
      Alert.alert('Error', `Failed to load crops: ${error.message || 'Network error'}`);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll access');
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera access is required');
        return;
      }
    }

    setShowCamera(true);
  };

  const capturePhoto = async (camera: any) => {
    if (!camera) return;

    try {
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        const newItem: SelectedImageItem = {
          uri: photo.uri,
          createdAt: null,
          monthYear: null,
        };
        setSelectedImages(prev => [...prev, newItem].slice(0, 3));
        setShowCamera(false);
        setActiveTab('gallery');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 3 - selectedImages.length,
      });

      if (!result.canceled && result.assets) {
        const newItems: SelectedImageItem[] = result.assets.map((asset) => ({
          uri: asset.uri,
          createdAt: null,
          monthYear: null,
        }));
        setSelectedImages(prev => [...prev, ...newItems].slice(0, 3));
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (datePickerIndex === index) setDatePickerIndex(null);
    else if (datePickerIndex !== null && datePickerIndex > index) setDatePickerIndex(datePickerIndex - 1);
  };

  const openDatePickerFor = (index: number) => {
    const item = selectedImages[index];
    if (item?.createdAt != null) {
      const d = new Date(item.createdAt);
      setTempMonth(d.getMonth());
      setTempYear(d.getFullYear());
    } else {
      const d = new Date();
      setTempMonth(d.getMonth());
      setTempYear(d.getFullYear());
    }
    setDatePickerIndex(index);
  };

  const confirmDatePicker = () => {
    if (datePickerIndex === null) return;
    const createdAt = monthYearToTimestamp(tempMonth, tempYear);
    const monthYear = formatMonthYear(tempMonth, tempYear);
    setSelectedImages(prev =>
      prev.map((it, i) =>
        i === datePickerIndex ? { ...it, createdAt, monthYear } : it
      )
    );
    setDatePickerIndex(null);
  };

  const uploadPhotos = async () => {
    if (!selectedCrop) {
      Alert.alert('Select Crop', 'Please select a crop first');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo');
      return;
    }

    const missingDateIndex = selectedImages.findIndex((item) => item.createdAt == null || item.monthYear == null);
    if (missingDateIndex !== -1) {
      Alert.alert(
        'Set date for each image',
        `Please set the capture date for the ${ORDINALS[missingDateIndex]} image. Tap on it to pick month and year.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setUploading(true);
    uploadProgress.value = 0;

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Please login again');
      }

      const formData = new FormData();

      // Add photos and per-image capture dates (user-set 1 by 1)
      selectedImages.forEach((item, index) => {
        const uri = item.uri;
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('files[]', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type: type,
        } as any);
        const d = new Date(item.createdAt!);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        formData.append('dates[]', dateStr);
      });

      formData.append('crop_id', selectedCrop.id.toString());
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      console.log('📤 Uploading:', {
        crop_id: selectedCrop.id,
        imageCount: selectedImages.length,
        hasNotes: !!notes.trim(),
      });

      uploadProgress.value = withTiming(0.3, { duration: 500 });

      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // DO NOT set Content-Type - FormData sets it automatically with boundary
        },
        body: formData,
      });

      uploadProgress.value = withTiming(0.7, { duration: 500 });

      const responseText = await response.text();
      console.log('📥 Response status:', response.status);
      console.log('📥 Response:', responseText.substring(0, 200));

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      uploadProgress.value = withTiming(1, { duration: 300 });

      console.log('✅ Upload success:', data);

      // Show detection result
      if (data.detection) {
        setDetectionResult({
          disease: data.detection.disease || 'Unknown',
          severity: data.detection.severity || 'None',
          confidence: data.detection.confidence || 0,
          weather: data.detection.weather || { temp: null, humidity: null },
        });
        successScale.value = withSequence(
          withSpring(1.2, { damping: 8 }),
          withSpring(1, { damping: 8 })
        );
      }

      // Reset form and redirect directly to timelapse view
      setSelectedImages([]);
      setNotes('');
      setDetectionResult(null);
      successScale.value = 0;
      router.push(`/(farmer)/timelapse-view?cropId=${selectedCrop.id}`);

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('Error details:', error.message, error.stack);
      Alert.alert(
        'Upload Failed',
        error.message || 'Please check your connection and try again',
        [{ text: 'OK' }]
      );
    } finally {
      setUploading(false);
      uploadProgress.value = 0;
    }
  };

  // Animated styles (with error handling)
  const sparkleStyle = useAnimatedStyle(() => {
    try {
      return {
        transform: [{ rotate: `${sparkleRotation.value}deg` }],
      };
    } catch {
      return { transform: [{ rotate: '0deg' }] };
    }
  });

  const progressStyle = useAnimatedStyle(() => {
    try {
      return {
        width: `${uploadProgress.value * 100}%`,
      };
    } catch {
      return { width: '0%' };
    }
  });

  const successStyle = useAnimatedStyle(() => {
    try {
      return {
        transform: [{ scale: successScale.value }],
      };
    } catch {
      return { transform: [{ scale: 1 }] };
    }
  });

  if (showCamera && cameraPermission?.granted) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          ref={(ref) => {
            if (ref) {
              setTimeout(() => capturePhoto(ref), 100);
            }
          }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cameraOverlay}
          >
            <TouchableOpacity
              style={styles.closeCameraButton}
              onPress={() => setShowCamera(false)}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.cameraInstructions}>
              <Text style={styles.cameraInstructionText}>
                Position leaf in center
              </Text>
            </View>
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      {/* Header with Green Gradient */}
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Sparkles size={28} color="#FFD700" />
          <Text style={styles.title}>Smart TimeLapse</Text>
          <Text style={styles.subtitle}>Track disease progression over time</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: tc.screen }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Three crops at top: Wheat, Rice, Cotton – user just selects one */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Select Crop</Text>
          <View style={styles.threeCropsRow}>
            {CROP_TYPES.map((type) => {
              const crop = crops.find((c) => (c.crop_type || '').toLowerCase() === type);
              const isSelected = selectedCrop?.crop_type?.toLowerCase() === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.cropCard,
                    {
                      backgroundColor: tc.card,
                      borderColor: isSelected ? tc.primary : tc.border,
                    },
                    isSelected && styles.cropCardSelected,
                  ]}
                  onPress={() => crop && setSelectedCrop(crop)}
                  activeOpacity={0.7}
                  disabled={!crop}
                >
                  <View
                    style={[
                      styles.cropCardContent,
                      isSelected && { backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : colors.primaryBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cropName,
                        { color: tc.text },
                        isSelected && { color: tc.primary },
                      ]}
                    >
                      {CROP_NAMES[type]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Upload Tabs */}
        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <View style={[styles.tabContainer, { backgroundColor: tc.screenSecondary }]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'camera' && [styles.tabActive, { backgroundColor: tc.card }]]}
                onPress={() => setActiveTab('camera')}
              >
                <Camera size={20} color={activeTab === 'camera' ? colors.primary : tc.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: tc.textMuted },
                    activeTab === 'camera' && { color: colors.primary },
                  ]}
                >
                  Camera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'gallery' && [styles.tabActive, { backgroundColor: tc.card }]]}
                onPress={() => setActiveTab('gallery')}
              >
                <ImageIcon size={20} color={activeTab === 'gallery' ? colors.primary : tc.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: tc.textMuted },
                    activeTab === 'gallery' && { color: colors.primary },
                  ]}
                >
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {activeTab === 'camera' ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={takePhoto}
                  disabled={selectedImages.length >= 3}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.actionButtonGradient}
                  >
                    <Camera size={24} color="white" />
                    <Text style={styles.actionButtonText}>Take Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={pickFromGallery}
                  disabled={selectedImages.length >= 3}
                >
                  <LinearGradient
                    colors={[colors.info, '#1976D2']}
                    style={styles.actionButtonGradient}
                  >
                    <ImageIcon size={24} color="white" />
                    <Text style={styles.actionButtonText}>Pick from Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Selected Images with date (month/year) per image */}
            {selectedImages.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={[styles.imagesTitle, { color: tc.text }]}>
                  Selected ({selectedImages.length}/3)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((item, index) => (
                    <View key={`${item.uri}-${index}`} style={styles.imageWrapper}>
                      <Image source={{ uri: item.uri }} style={[styles.selectedImage, { backgroundColor: tc.screenSecondary }]} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.imageMeta}
                        onPress={() => openDatePickerFor(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.imageOrdinal, { color: tc.text }]}>
                          {ORDINALS[index]} image
                        </Text>
                        <Text
                          style={
                            item.monthYear
                              ? styles.imageDateSet
                              : [styles.imageDatePlaceholder, { color: tc.textMuted }]
                          }
                        >
                          {item.monthYear ?? 'Tap to set date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tc.text }]}>Notes (Optional)</Text>
          <View style={[styles.card, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: tc.inputBg,
                  color: tc.text,
                  borderWidth: 1,
                  borderColor: tc.border,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                },
              ]}
              multiline
              numberOfLines={4}
              placeholder="e.g., Sprayed today, noticed yellowing..."
              placeholderTextColor={tc.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Detection Result Popup */}
        {detectionResult && (
          <View style={styles.section}>
            <View style={[styles.card, styles.detectionCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.detectionGradient}
              >
                <CheckCircle2 size={32} color="white" />
                <Text style={styles.detectionTitle}>AI Detection Complete!</Text>
                <Text style={styles.detectionDisease}>
                  {detectionResult.disease}
                </Text>
                <View style={styles.detectionDetails}>
                  <View style={styles.detectionDetail}>
                    <Text style={styles.detectionLabel}>Severity:</Text>
                    <Text style={styles.detectionValue}>
                      {detectionResult.severity}
                    </Text>
                  </View>
                  <View style={styles.detectionDetail}>
                    <Text style={styles.detectionLabel}>Confidence:</Text>
                    <Text style={styles.detectionValue}>
                      {detectionResult.confidence}%
                    </Text>
                  </View>
                  {detectionResult.weather.humidity && (
                    <View style={styles.detectionDetail}>
                      <Text style={styles.detectionLabel}>Humidity:</Text>
                      <Text style={styles.detectionValue}>
                        {detectionResult.weather.humidity}%
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Upload Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.uploadButton, (uploading || !selectedCrop || selectedImages.length === 0) && styles.uploadButtonDisabled]}
            onPress={() => {
              console.log('🔘 Upload button pressed', {
                uploading,
                hasCrop: !!selectedCrop,
                imageCount: selectedImages.length,
              });
              if (!uploading && selectedCrop && selectedImages.length > 0) {
                uploadPhotos();
              } else {
                if (!selectedCrop) Alert.alert('Select Crop', 'Please select a crop first');
                else if (selectedImages.length === 0) Alert.alert('No Photos', 'Please select at least one photo');
              }
            }}
            disabled={uploading}
          >
            <LinearGradient
              colors={
                uploading || !selectedCrop || selectedImages.length === 0
                  ? isDark
                    ? [tc.border, tc.textMuted]
                    : [colors.text.tertiary, colors.text.secondary]
                  : [colors.primary, colors.primaryDark]
              }
              style={styles.uploadButtonGradient}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text style={styles.uploadButtonText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Upload size={24} color="white" />
                  <Text style={styles.uploadButtonText}>Upload & Analyze</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Progress Bar */}
          {uploading && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: tc.border }]}>
                <View style={[styles.progressBar, { width: `${uploadProgress.value * 100}%` }]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date picker modal: set capture date (month & year) for each image 1 by 1 */}
      <Modal
        visible={datePickerIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerIndex(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.datePickerModalContent, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
            <Text style={[styles.datePickerModalTitle, { color: tc.text }]}>
              {datePickerIndex !== null ? `${ORDINALS[datePickerIndex]} image – set date` : 'Set date'}
            </Text>
            <Text style={[styles.datePickerModalSubtitle, { color: tc.textMuted }]}>Month & year when this photo was taken</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerHalf}>
                <Text style={[styles.datePickerLabel, { color: tc.textSecondary }]}>Month</Text>
                <Picker
                  selectedValue={tempMonth}
                  onValueChange={(v) => setTempMonth(v)}
                  style={[styles.picker, { backgroundColor: tc.inputBg, color: tc.text }]}
                  itemStyle={Platform.OS === 'ios' ? { fontSize: 18, color: isDark ? '#F9FAFB' : '#111' } : undefined}
                >
                  {MONTHS.map((m, i) => (
                    <Picker.Item key={m} label={m} value={i} />
                  ))}
                </Picker>
              </View>
              <View style={styles.datePickerHalf}>
                <Text style={[styles.datePickerLabel, { color: tc.textSecondary }]}>Year</Text>
                <Picker
                  selectedValue={tempYear}
                  onValueChange={(v) => setTempYear(v)}
                  style={[styles.picker, { backgroundColor: tc.inputBg, color: tc.text }]}
                  itemStyle={Platform.OS === 'ios' ? { fontSize: 18, color: isDark ? '#F9FAFB' : '#111' } : undefined}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: tc.border, backgroundColor: tc.screenSecondary }]}
                onPress={() => setDatePickerIndex(null)}
              >
                <Text style={[styles.modalButtonTextCancel, { color: tc.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={confirmDatePicker}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonTextCreate}>Set date</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  createCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  createCropButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600' as const,
    color: 'white',
  },
  card: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.md,
  },
  cropScroll: {
    marginHorizontal: -spacing.base,
    paddingHorizontal: spacing.base,
  },
  cropCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bg.primary,
    borderWidth: 2,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cropCardSelected: {
    borderColor: colors.primary,
    ...shadows.lg,
  },
  cropCardContent: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropCardContentSelected: {
    backgroundColor: colors.primaryBg,
  },
  cropName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  cropNameSelected: {
    color: colors.primary,
  },
  cropType: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  cropTypeSelected: {
    color: colors.primaryDark,
  },
  emptyCropCard: {
    padding: spacing.xl,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: width - spacing.base * 4,
    ...shadows.sm,
  },
  emptyCropText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  createCropButtonInline: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
    ...shadows.md,
  },
  createCropButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  createCropButtonTextInline: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.bg.primary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  actionButtons: {
    marginBottom: spacing.base,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    gap: spacing.md,
  },
  actionButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: 'white',
  },
  imagesContainer: {
    marginTop: spacing.base,
  },
  imagesTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  imageWrapper: {
    marginRight: spacing.md,
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bg.tertiary,
  },
  imageMeta: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  imageOrdinal: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  imageDateSet: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600' as const,
  },
  imageDatePlaceholder: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  detectionCard: {
    overflow: 'hidden',
  },
  detectionGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  detectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700' as const,
    color: 'white',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  detectionDisease: {
    fontSize: typography.fontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.base,
    fontWeight: '600' as const,
  },
  detectionDetails: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  detectionDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  detectionLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  detectionValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600' as const,
    color: 'white',
  },
  uploadButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700' as const,
    color: 'white',
  },
  progressBarContainer: {
    marginTop: spacing.md,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  closeCameraButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInstructions: {
    alignItems: 'center',
    paddingBottom: spacing['2xl'],
  },
  cameraInstructionText: {
    color: 'white',
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContent: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows['2xl'],
  },
  modalTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.bg.secondary,
  },
  cropTypeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cropTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
  },
  cropTypeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  cropTypeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.secondary,
  },
  cropTypeButtonTextSelected: {
    color: colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.bg.primary,
  },
  modalButtonCreate: {
    ...shadows.md,
  },
  modalButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  modalButtonTextCreate: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: 'white',
  },
  datePickerModalContent: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows['2xl'],
  },
  datePickerModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  datePickerModalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  datePickerHalf: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  picker: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    ...(Platform.OS === 'android' && { height: 100 }),
  },
  threeCropsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});

