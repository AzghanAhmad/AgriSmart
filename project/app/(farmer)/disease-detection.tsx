import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ImageBackground,
} from 'react-native';
import { Camera  as CameraIcon , Upload, Scan, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Wheat, Leaf, ArrowLeft, Trash2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import axios from 'axios';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getApiBaseUrl } from '@/utils/env';
import { apiDelete } from '@/utils/api';
import { resolveScanCoordinates } from '@/utils/pakistanGeocode';


type CropType = 'wheat' | 'rice' | 'cotton' | null;

interface Crop {
  id: CropType;
  name: string;
  icon: any;
  color: string;
  gradient: string[];
  description: string;
  image: any;
}

export default function DiseaseDetectionScreen() {
  const { user } = useAuth();
  const { colors: tc } = useTheme();
  const [selectedCrop, setSelectedCrop] = useState<CropType>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { language, cropDiseases, addRecentDetection, removeRecentDetection } = useApp();

  const crops = useMemo<Crop[]>(
    () => [
      {
        id: 'wheat',
        name: translate('cropWheat', language),
        icon: Wheat,
        color: '#F59E0B',
        gradient: ['#FCD34D', '#F59E0B'],
        description: translate('detectDescWheat', language),
        image: require('@/assets/crops/Wheat.jpg'),
      },
      {
        id: 'rice',
        name: translate('cropRice', language),
        icon: Leaf,
        color: '#10B981',
        gradient: ['#6EE7B7', '#10B981'],
        description: translate('detectDescRice', language),
        image: require('@/assets/crops/Rice.jpg'),
      },
      {
        id: 'cotton',
        name: translate('cropCotton', language),
        icon: Leaf,
        color: '#8B5CF6',
        gradient: ['#C4B5FD', '#8B5CF6'],
        description: translate('detectDescCotton', language),
        image: require('@/assets/crops/cotton.jpg'),
      },
    ],
    [language],
  );

  const cropTitle = useCallback(
    (id: CropType) => {
      if (!id) return '';
      if (id === 'wheat') return translate('cropWheat', language);
      if (id === 'rice') return translate('cropRice', language);
      return translate('cropCotton', language);
    },
    [language],
  );

  const severityLabel = useCallback(
    (sev: string | undefined) => {
      const s = (sev || '').toLowerCase();
      if (s === 'high') return translate('severityHigh', language);
      if (s === 'medium') return translate('severityMedium', language);
      return translate('severityLow', language);
    },
    [language],
  );

  // GPS in Pakistan → profile lat/lng → geocode profile location text → Lahore
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const coords = await resolveScanCoordinates(user);
      if (!cancelled) {
        setUserLocation(coords);
        console.log('📍 Scan location:', coords.latitude, coords.longitude);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCameraCapture = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(translate('permissionDenied', language), translate('detectCameraAccessRequired', language));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      await analyzeImage(uri);
    }
  };

  const handleImageUpload = async () => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(translate('permissionDenied', language), translate('detectNeedPhotoAccess', language));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      await analyzeImage(uri);
    }
    } catch (err) {
      console.error(err);
      Alert.alert(translate('error', language), translate('detectFailedUploadImage', language));
    }
  };


  const mockImageAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const cropImages: Record<string, string> = {
        wheat: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg',
        rice: 'https://images.pexels.com/photos/2589457/pexels-photo-2589457.jpeg',
        cotton: 'https://images.pexels.com/photos/4503273/pexels-photo-4503273.jpeg'
      };
      
      setSelectedImage(cropImages[selectedCrop || 'wheat']);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults: Record<string, any> = {
        wheat: {
          disease: 'Wheat Rust',
          confidence: 87,
          severity: 'Medium',
          treatment: 'Apply fungicide (Propiconazole) at 200ml per acre. Improve field drainage and reduce plant density.',
          symptoms: [
            'Orange-brown pustules on leaves',
            'Yellowing of infected areas',
            'Reduced plant vigor'
          ],
          prevention: [
            'Use resistant wheat varieties',
            'Ensure proper plant spacing',
            'Monitor weather conditions'
          ]
        },
        rice: {
          disease: 'Rice Blast',
          confidence: 92,
          severity: 'High',
          treatment: 'Apply Tricyclazole fungicide. Improve water management and avoid excessive nitrogen.',
          symptoms: [
            'Diamond-shaped lesions on leaves',
            'Gray-brown spots with dark borders',
            'Premature leaf drying'
          ],
          prevention: [
            'Use blast-resistant varieties',
            'Proper water management',
            'Balanced fertilization'
          ]
        },
        cotton: {
          disease: 'Cotton Leaf Curl',
          confidence: 85,
          severity: 'High',
          treatment: 'Remove infected plants immediately. Control whitefly population using appropriate insecticides.',
          symptoms: [
            'Upward curling of leaves',
            'Thickening of leaf veins',
            'Stunted plant growth'
          ],
          prevention: [
            'Use virus-resistant varieties',
            'Control whitefly vectors',
            'Remove infected plants early'
          ]
        }
      };
      
      setResult(mockResults[selectedCrop || 'wheat']);
    } catch (err: any) {
      setError(err.message || translate('networkError', language));
      setShowError(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImage = async (uri: string) => {
  try {
    if (!selectedCrop) {
      Alert.alert(translate('error', language), translate('detectSelectCropFirst', language));
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    // Prepare file for mobile vs web
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      formData.append('file', blob, 'crop.jpg');
    } else {
      formData.append('file', {
        uri,
        name: 'crop.jpg',
        type: 'image/jpeg',
      } as any);
    }

    // Attach crop type from selection
    formData.append('cropType', selectedCrop);
    if (user?.id) {
      formData.append('farmerId', user.id);
    }
    
    // Attach location for outbreak detection
    if (userLocation) {
      formData.append('latitude', userLocation.latitude.toString());
      formData.append('longitude', userLocation.longitude.toString());
      console.log('📍 Sending location:', userLocation.latitude, userLocation.longitude);
    } else {
      console.log('⚠️ No location available for detection');
    }

    console.log('📤 Sending crop type to backend:', selectedCrop);

    const API_BASE_URL = getApiBaseUrl();
    const axiosResp = await axios.post(`${API_BASE_URL}/api/farmer/detections`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data, // keep FormData as-is
    });

    let data = axiosResp.data;

    // Enrich with cure guidance if any field missing
    const needsGuidance = !data?.treatment || !data?.symptoms || !data?.prevention;
    if (needsGuidance && data?.disease && selectedCrop) {
      try {
        const normalizedDisease = data.disease.replace(/[_-]+/g, ' ').trim();
        const resp = await fetch(
          `${API_BASE_URL}/api/guidance?crop=${encodeURIComponent(selectedCrop)}&disease=${encodeURIComponent(normalizedDisease)}`
        );
        const j = await resp.json();
        const item = (j?.items && j.items[0]) || null;
        if (item) {
          const treatmentParts: string[] = [];
          if (item.chemicalControl) treatmentParts.push(item.chemicalControl);
          if (item.brands) treatmentParts.push(`e.g., ${item.brands}`);
          const enriched = {
            ...data,
            treatment: data.treatment || (treatmentParts.length ? treatmentParts.join(' — ') : undefined),
            symptoms:
              data.symptoms ||
              (item.symptoms
                ? item.symptoms.replace(' and ', ';').replace(/,/g, ';').split(';').map((s: string) => s.trim()).filter(Boolean)
                : undefined),
            prevention:
              data.prevention ||
              (item.culturalControls
                ? item.culturalControls.replace(' and ', ';').replace(/,/g, ';').split(';').map((s: string) => s.trim()).filter(Boolean)
                : undefined),
          };
          data = enriched;
        }
      } catch {}
    }

    setResult(data);

    // Update recent detections list in app context
    const detectedAt = new Date().toISOString();
    addRecentDetection({
      id: data.detectionId || String(Date.now()),
      name: data.disease || 'Unknown',
      severity: (data.severity || 'Low').toLowerCase(),
      treatment: data.treatment || '',
      imageUrl: data.imageUrl || selectedImage || '',
      detectedAt,
    });
  } catch (err) {
    console.error('❌ Error analyzing image:', err);
    setError(translate('detectPredictionError', language));
    setShowError(true);
  } finally {
    setIsAnalyzing(false);
  }
};

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
  };

  const goBackToCropSelection = () => {
    setSelectedCrop(null);
    setSelectedImage(null);
    setResult(null);
  };

  const isBackendDetectionId = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const formatScanDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(language === 'ur' ? 'ur-PK' : 'en-US');
    } catch {
      return iso;
    }
  };

  const handleDeleteScan = (id: string) => {
    Alert.alert(translate('detectDeleteScanTitle', language), translate('detectDeleteScanBody', language), [
      { text: translate('cancel', language), style: 'cancel' },
      {
        text: translate('delete', language),
        style: 'destructive',
        onPress: async () => {
          try {
            if (user?.id && isBackendDetectionId(id)) {
              await apiDelete(`/api/farmer/detections/${encodeURIComponent(id)}?farmerId=${encodeURIComponent(user.id)}`);
            }
            removeRecentDetection(id);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : translate('detectCouldNotDelete', language);
            Alert.alert(translate('detectDeleteFailed', language), msg);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        {selectedCrop && (
          <TouchableOpacity style={[styles.backButton, { backgroundColor: tc.screenSecondary }]} onPress={goBackToCropSelection}>
            <ArrowLeft color={tc.text} size={24} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tc.text }]}>
            {selectedCrop
              ? `${cropTitle(selectedCrop)}${translate('detectDiseaseDetectionSuffix', language)}`
              : translate('detectSelectCropTitle', language)}
          </Text>
          <Text style={[styles.subtitle, { color: tc.textMuted }]}>
            {selectedCrop ? translate('detectScanSubtitle', language) : translate('detectSelectCropSubtitle', language)}
          </Text>
        </View>
      </View>

      {/* Crop Selection Grid */}
      {!selectedCrop && (
        <View style={styles.cropGrid}>
          {crops.map((crop) => {
            const IconComponent = crop.icon;
            return (
              <TouchableOpacity
                key={crop.id}
                style={styles.cropCardWrapper}
                onPress={() => setSelectedCrop(crop.id)}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={crop.image}
                  style={styles.cropCard}
                  imageStyle={styles.cropCardImage}
                >
                  {/* Gradient Overlay */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                    style={styles.cropCardOverlay}
                  >
                    <View style={[styles.cropIconContainer, { backgroundColor: crop.color }]}>
                      <IconComponent color="white" size={36} />
                    </View>
                    <View style={styles.cropInfo}>
                      <Text style={styles.cropName}>{crop.name}</Text>
                      <Text style={styles.cropDescription}>{crop.description}</Text>
                    </View>
                    <View style={[styles.selectButton, { backgroundColor: crop.color }]}>
                      <Text style={styles.selectButtonText}>{translate('detectSelectScan', language)}</Text>
                      <Scan color="white" size={18} />
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Scan/Upload Options - Shows after crop selection */}
      {selectedCrop && !selectedImage && (
        <View style={styles.uploadSection}>
          <View style={styles.uploadOptions}>
            <TouchableOpacity 
              style={[styles.optionButton, { backgroundColor: crops.find(c => c.id === selectedCrop)?.color || '#22C55E' }]} 
              onPress={handleCameraCapture}
            >
              <CameraIcon color="white" size={40} />
              <Text style={styles.optionText}>{translate('detectScanWithCamera', language)}</Text>
              <Text style={styles.optionSubtext}>{translate('detectTakePhotoNow', language)}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, { backgroundColor: crops.find(c => c.id === selectedCrop)?.color || '#22C55E' }]} 
              onPress={handleImageUpload}
            >
              <Upload color="white" size={40} />
              <Text style={styles.optionText}>{translate('detectUploadImage', language)}</Text>
              <Text style={styles.optionSubtext}>{translate('detectChooseGallery', language)}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.tipsCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <Scan color="#22C55E" size={24} />
            <Text style={[styles.tipsTitle, { color: tc.text }]}>{translate('detectPhotoTipsTitle', language)}</Text>
            <Text style={[styles.tipText, { color: tc.textSecondary }]}>{translate('detectTip1', language)}</Text>
            <Text style={[styles.tipText, { color: tc.textSecondary }]}>{translate('detectTip2', language)}</Text>
            <Text style={[styles.tipText, { color: tc.textSecondary }]}>{translate('detectTip3', language)}</Text>
            <Text style={[styles.tipText, { color: tc.textSecondary }]}>{translate('detectTip4', language)}</Text>
          </View>
        </View>
      )}

      {selectedImage && (
        <View style={styles.analysisSection}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.uploadedImage} />
            {isAnalyzing && (
              <View style={styles.analysingOverlay}>
                <Scan color="#22C55E" size={48} />
                <Text style={styles.analysingText}>{translate('detectAnalyzingCrop', language)}</Text>
              </View>
            )}
          </View>

          {result && (
            <View style={[styles.resultCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
              <View style={styles.resultHeader}>
                <View style={styles.diseaseInfo}>
                  <Text style={[styles.diseaseName, { color: tc.text }]}>{result.disease}</Text>
                  <Text style={[styles.confidence, { color: tc.textMuted }]}>Confidence: {result.confidence}%</Text>
                </View>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: result.severity === 'High' ? '#EF4444' : 
                    result.severity === 'Medium' ? '#F59E0B' : '#22C55E' }
                ]}>
                  <Text style={styles.severityText}>{severityLabel(result.severity)}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('detectTreatmentRecommendation', language)}</Text>
                <Text style={[styles.treatmentText, { color: tc.textSecondary }]}>{result.treatment}</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('detectSymptomsDetected', language)}</Text>
                {(Array.isArray(result.symptoms) ? result.symptoms : []).map((symptom: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <AlertCircle color="#F59E0B" size={16} />
                    <Text style={[styles.listText, { color: tc.textSecondary }]}>{symptom}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('detectPreventionTips', language)}</Text>
                {(Array.isArray(result.prevention) ? result.prevention : []).map((tip: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <CheckCircle color="#22C55E" size={16} />
                    <Text style={[styles.listText, { color: tc.textSecondary }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.resetButton, { backgroundColor: tc.card, borderColor: tc.primary }]} onPress={resetAnalysis}>
              <Text style={[styles.resetButtonText, { color: tc.primary }]}>{translate('detectAnalyzeNewImage', language)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Previous scans (history) */}
      <View style={styles.recentSection}>
        <Text style={[styles.previousScansHeading, { color: tc.text }]}>{translate('detectPreviousScans', language)}</Text>
        <Text style={[styles.previousScansSub, { color: tc.textMuted }]}>{translate('detectPreviousScansSub', language)}</Text>
        {cropDiseases.length === 0 ? (
          <Text style={[styles.previousScansSub, { marginTop: 8, color: tc.textMuted }]}>
            {translate('detectNoScansYet', language)}
          </Text>
        ) : (
          cropDiseases.map((disease) => (
            <View
              key={disease.id}
              style={[
                styles.recentItem,
                { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border },
              ]}
            >
              {disease.imageUrl ? (
                <Image source={{ uri: disease.imageUrl }} style={styles.recentImage} />
              ) : (
                <View style={[styles.recentImage, { backgroundColor: tc.screenSecondary }]} />
              )}
              <View style={styles.recentInfo}>
                <Text style={[styles.recentName, { color: tc.text }]}>{disease.name}</Text>
                <Text style={[styles.recentDate, { color: tc.textMuted }]}>
                  {formatScanDate(disease.detectedAt)}
                </Text>
              </View>
              <View style={styles.recentRowEnd}>
                <View
                  style={[
                    styles.severityIndicator,
                    {
                      backgroundColor:
                        disease.severity === 'high'
                          ? '#EF4444'
                          : disease.severity === 'medium'
                            ? '#F59E0B'
                            : '#22C55E',
                    },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteScan(disease.id)}
                  style={[styles.deleteScanBtn, { backgroundColor: tc.screenSecondary }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Delete scan"
                >
                  <Trash2 color="#EF4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <ErrorAlert
        visible={showError}
        message={error}
        onClose={() => setShowError(false)}
        onRetry={() => mockImageAnalysis()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  // Crop Selection Grid
  cropGrid: {
    gap: 20,
    marginBottom: 32,
  },
  cropCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cropCard: {
    height: 280,
    justifyContent: 'flex-end',
  },
  cropCardImage: {
    borderRadius: 24,
  },
  cropCardOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    borderRadius: 24,
  },
  cropIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cropInfo: {
    marginBottom: 12,
  },
  cropName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cropDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  selectButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  // Upload Section
  uploadSection: {
    marginBottom: 32,
  },
  uploadOptions: {
    gap: 16,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  optionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  optionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  analysisSection: {
    marginBottom: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  analysingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  analysingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  diseaseInfo: {
    flex: 1,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    color: '#6B7280',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  treatmentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
  },
  resetButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 32,
  },
  previousScansHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  previousScansSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  recentItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentRowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteScanBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  recentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  severityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});