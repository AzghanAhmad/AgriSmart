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
import { Camera, Image as ImageIcon, Upload, X, Sparkles, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react-native';
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
const withSpring = (value: any, _config?: any) => value;
const withTiming = (value: any, _config?: any) => value;
const withRepeat = (value: any, _count?: number, _reverse?: boolean) => value;
const withSequence = (...args: any[]) => args[0];
const FadeIn = { duration: (_duration?: number) => ({}) };
const FadeOut = { duration: (_duration?: number) => ({}) };
const SlideInDown = { delay: (_delay?: number) => ({}) };
const ZoomIn = { springify: (_springify?: boolean) => ({}), delay: (_delay?: number) => ({}) };

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/utils/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius, shadows, typography } from '@/utils/designSystem';
import { ArrowLeft } from 'lucide-react-native';
import { TextInput } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Crop {
  id: number;
  name: string;
  crop_type: string;
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
  
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery'>('camera');
  const [showCreateCropModal, setShowCreateCropModal] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropType, setNewCropType] = useState<'wheat' | 'rice' | 'cotton' | ''>('');
  
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

      console.log('🌾 Loading crops from:', `${getApiBaseUrl()}/api/timelapse/crops`);
      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/crops`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('📥 Crops response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Crops loaded:', data.crops?.length || 0, 'crops');
        setCrops(data.crops || []);
        
        // If no crops and we have a cropId param, try to create a default crop
        if ((data.crops || []).length === 0) {
          console.log('⚠️ No crops found. User needs to create a crop first.');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load crops:', response.status, errorText);
        Alert.alert('Error', 'Failed to load crops. Please try again.');
      }
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
        setSelectedImages(prev => [...prev, photo.uri].slice(0, 3));
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
        const newUris = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newUris].slice(0, 3));
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const createNewCrop = () => {
    console.log('🔘 Create crop button pressed');
    setNewCropName('');
    setNewCropType('');
    setShowCreateCropModal(true);
    console.log('✅ Modal state set to true');
  };

  const handleCreateCrop = async () => {
    if (!newCropName.trim()) {
      Alert.alert('Error', 'Please enter a crop name');
      return;
    }
    if (!newCropType) {
      Alert.alert('Error', 'Please select a crop type');
      return;
    }

    await createCropWithType(newCropName.trim(), newCropType);
    setShowCreateCropModal(false);
    setNewCropName('');
    setNewCropType('');
  };

  const createCropWithType = async (name: string, cropType: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      console.log('🌾 Creating crop:', name, cropType);

      const response = await fetch(`${getApiBaseUrl()}/api/timelapse/crops`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          crop_type: cropType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Crop created:', data);
        
        // Reload crops and select the new one
        await loadCrops();
        setSelectedCrop(data);
        
        Alert.alert('Success', `Crop "${name}" created successfully!`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create crop' }));
        throw new Error(errorData.error || 'Failed to create crop');
      }
    } catch (error: any) {
      console.error('❌ Failed to create crop:', error);
      Alert.alert('Error', error.message || 'Failed to create crop. Please try again.');
    }
  };

  const deleteCrop = async (cropId: number, cropName: string) => {
    Alert.alert(
      'Delete Crop',
      `Are you sure you want to delete "${cropName}"? This will also delete all associated timelapse entries. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
              }

              console.log('🗑️ Deleting crop:', cropId);

              const response = await fetch(`${getApiBaseUrl()}/api/timelapse/crops/${cropId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                },
              });

              const responseText = await response.text();
              console.log('📥 Delete response status:', response.status);
              console.log('📥 Delete response:', responseText);

              if (response.ok) {
                let data;
                try {
                  data = JSON.parse(responseText);
                } catch {
                  data = { success: true, message: 'Crop deleted successfully' };
                }
                console.log('✅ Crop deleted:', data);
                
                // Clear selection if deleted crop was selected
                if (selectedCrop?.id === cropId) {
                  setSelectedCrop(null);
                }
                
                // Reload crops
                await loadCrops();
                
                Alert.alert('Success', data.message || `Crop "${cropName}" deleted successfully!`);
              } else {
                let errorMessage = 'Failed to delete crop';
                try {
                  const errorData = JSON.parse(responseText);
                  errorMessage = errorData.error || errorMessage;
                } catch {
                  errorMessage = responseText || errorMessage;
                }
                console.error('❌ Delete failed:', response.status, errorMessage);
                throw new Error(errorMessage);
              }
            } catch (error: any) {
              console.error('❌ Failed to delete crop:', error);
              Alert.alert('Error', error.message || 'Failed to delete crop. Please try again.');
            }
          },
        },
      ]
    );
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

    setUploading(true);
    uploadProgress.value = 0;

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Please login again');
      }

      const formData = new FormData();

      // Add photos - React Native FormData format
      selectedImages.forEach((uri, index) => {
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // React Native FormData format
        formData.append('files[]', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type: type,
        } as any);
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

      // Success animation
      setTimeout(() => {
        successScale.value = 0;
        Alert.alert(
          'Upload Successful!',
          `${data.entries?.length || 0} photo(s) uploaded with AI analysis`,
          [
            { 
              text: 'View TimeLapse', 
              onPress: () => {
                // Reset and navigate to timelapse view
                setSelectedImages([]);
                setNotes('');
                setDetectionResult(null);
                router.push(`/(farmer)/timelapse-view?cropId=${selectedCrop.id}`);
              },
              style: 'default'
            },
            { 
              text: 'OK', 
              onPress: () => {
                // Reset and navigate
                setSelectedImages([]);
                setNotes('');
                setDetectionResult(null);
                router.back();
              }
            }
          ]
        );
      }, 2000);

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
    <View style={styles.container}>
      {/* Header with Green Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, '#15803D']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerOverlay} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={styles.backButtonGradient}
          >
            <ArrowLeft size={22} color="white" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.sparkleContainer}>
            <Sparkles size={32} color="#FFD700" />
            <View style={styles.sparkleGlow} />
          </View>
          <Text style={styles.title}>Smart TimeLapse</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Track disease progression over time</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Crop Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Crop</Text>
            <TouchableOpacity
              style={styles.createCropButton}
              onPress={() => {
                console.log('🔘 Header Create Crop button pressed');
                createNewCrop();
              }}
              activeOpacity={0.7}
            >
              <Plus size={16} color="white" />
              <Text style={styles.createCropButtonText}>Add Crop</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropScroll}>
            {crops.length === 0 ? (
              <View style={styles.emptyCropCard}>
                <Text style={styles.emptyCropText}>No crops available</Text>
                <TouchableOpacity
                  style={styles.createCropButtonInline}
                  onPress={() => {
                    console.log('🔘 Inline Create Crop button pressed');
                    createNewCrop();
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.createCropButtonGradient}
                  >
                    <Plus size={20} color="white" />
                    <Text style={styles.createCropButtonTextInline}>Create Your First Crop</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              crops.map((crop) => (
                <View
                  key={crop.id}
                  style={[
                    styles.cropCard,
                    selectedCrop?.id === crop.id && styles.cropCardSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cropCardTouchable}
                    onPress={() => {
                      console.log('🌾 Crop selected:', crop.id, crop.name);
                      setSelectedCrop(crop);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.cropCardContent,
                      selectedCrop?.id === crop.id && styles.cropCardContentSelected
                    ]}>
                      <Text style={[
                        styles.cropName,
                        selectedCrop?.id === crop.id && styles.cropNameSelected
                      ]} numberOfLines={1}>
                        {crop.name}
                      </Text>
                      <Text style={[
                        styles.cropType,
                        selectedCrop?.id === crop.id && styles.cropTypeSelected
                      ]}>
                        {crop.crop_type}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteCropButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteCrop(crop.id, crop.name);
                    }}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Upload Tabs */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'camera' && styles.tabActive]}
                onPress={() => setActiveTab('camera')}
              >
                <Camera size={20} color={activeTab === 'camera' ? colors.primary : colors.text.secondary} />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'camera' && styles.tabTextActive,
                  ]}
                >
                  Camera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'gallery' && styles.tabActive]}
                onPress={() => setActiveTab('gallery')}
              >
                <ImageIcon size={20} color={activeTab === 'gallery' ? colors.primary : colors.text.secondary} />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'gallery' && styles.tabTextActive,
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

            {/* Selected Images */}
            {selectedImages.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={styles.imagesTitle}>
                  Selected ({selectedImages.length}/3)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <X size={16} color="white" />
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
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="e.g., Sprayed today, noticed yellowing..."
              placeholderTextColor={colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Detection Result Popup */}
        {detectionResult && (
          <View style={styles.section}>
            <View style={[styles.card, styles.detectionCard]}>
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
                  ? [colors.text.tertiary, colors.text.secondary]
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
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBar, { width: `${uploadProgress.value * 100}%` }]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Crop Modal */}
      <Modal
        visible={showCreateCropModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateCropModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Crop</Text>
            
            <Text style={styles.modalLabel}>Crop Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Wheat Field A"
              placeholderTextColor={colors.text.tertiary}
              value={newCropName}
              onChangeText={setNewCropName}
              autoFocus
            />

            <Text style={styles.modalLabel}>Crop Type</Text>
            <View style={styles.cropTypeButtons}>
              {(['wheat', 'rice', 'cotton'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.cropTypeButton,
                    newCropType === type && styles.cropTypeButtonSelected,
                  ]}
                  onPress={() => setNewCropType(type)}
                >
                  <Text
                    style={[
                      styles.cropTypeButtonText,
                      newCropType === type && styles.cropTypeButtonTextSelected,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateCropModal(false);
                  setNewCropName('');
                  setNewCropType('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreateCrop}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonTextCreate}>Create</Text>
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
    position: 'relative',
    overflow: 'hidden',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.base,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    ...shadows.md,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.md,
    zIndex: 1,
  },
  sparkleContainer: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  sparkleGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 20,
    opacity: 0.6,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700' as const,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginTop: spacing.xs,
  },
  headerBadgeText: {
    fontSize: typography.fontSize.sm,
    color: 'white',
    fontWeight: typography.fontWeight.semibold as any,
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
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  cropScroll: {
    marginHorizontal: -spacing.base,
    paddingHorizontal: spacing.base,
  },
  cropCard: {
    marginRight: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.bg.primary,
    borderWidth: 2.5,
    borderColor: colors.border.light,
    minWidth: 150,
    position: 'relative',
    ...shadows.md,
    overflow: 'hidden',
  },
  cropCardSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
    ...shadows.xl,
    backgroundColor: colors.primaryBg,
  },
  cropCardTouchable: {
    flex: 1,
  },
  cropCardContent: {
    padding: spacing.base,
    paddingRight: spacing.xl + spacing.sm, // Make room for delete button
    alignItems: 'center',
  },
  deleteCropButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
  },
  selectedImage: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 2,
    borderColor: colors.border.light,
    ...shadows.md,
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
    borderRadius: borderRadius.xl,
    ...shadows.xl,
  },
  detectionGradient: {
    padding: spacing['2xl'],
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    position: 'relative',
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
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
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
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    ...shadows['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border.light,
    position: 'relative',
    overflow: 'hidden',
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
});

