import React, { useState } from 'react';
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
import { Camera, Upload, Scan, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Wheat, Leaf, ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [selectedCrop, setSelectedCrop] = useState<CropType>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const { language, cropDiseases } = useApp();

  const crops: Crop[] = [
    {
      id: 'wheat',
      name: 'Wheat',
      icon: Wheat,
      color: '#F59E0B',
      gradient: ['#FCD34D', '#F59E0B'],
      description: 'Detect rust, smut, and other wheat diseases',
      image: require('@/assets/crops/Wheat.jpg')
    },
    {
      id: 'rice',
      name: 'Rice',
      icon: Leaf,
      color: '#10B981',
      gradient: ['#6EE7B7', '#10B981'],
      description: 'Identify blast, brown spot, and rice diseases',
      image: require('@/assets/crops/Rice.jpg')
    },
    {
      id: 'cotton',
      name: 'Cotton',
      icon: Leaf,
      color: '#8B5CF6',
      gradient: ['#C4B5FD', '#8B5CF6'],
      description: 'Detect bollworm, leaf curl, and cotton issues',
      image: require('@/assets/crops/cotton.jpg')
    }
  ];

  const handleCameraCapture = () => {
    Alert.alert(
      `Scan ${selectedCrop?.toUpperCase()}`,
      'Camera functionality would be implemented using expo-camera',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mock Capture', onPress: () => mockImageAnalysis() },
      ]
    );
  };

  const handleImageUpload = () => {
    Alert.alert(
      `Upload ${selectedCrop?.toUpperCase()} Image`,
      'Image picker functionality would be implemented using expo-image-picker',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mock Upload', onPress: () => mockImageAnalysis() },
      ]
    );
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

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
  };

  const goBackToCropSelection = () => {
    setSelectedCrop(null);
    setSelectedImage(null);
    setResult(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        {selectedCrop && (
          <TouchableOpacity style={styles.backButton} onPress={goBackToCropSelection}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {selectedCrop ? `${selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1)} Disease Detection` : 'Select Your Crop'}
          </Text>
          <Text style={styles.subtitle}>
            {selectedCrop ? 'Scan or upload crop images for AI analysis' : 'Choose a crop type to start disease detection'}
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
                      <Text style={styles.selectButtonText}>Select & Scan</Text>
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
              <Camera color="white" size={40} />
              <Text style={styles.optionText}>Scan with Camera</Text>
              <Text style={styles.optionSubtext}>Take a photo now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, { backgroundColor: crops.find(c => c.id === selectedCrop)?.color || '#22C55E' }]} 
              onPress={handleImageUpload}
            >
              <Upload color="white" size={40} />
              <Text style={styles.optionText}>Upload Image</Text>
              <Text style={styles.optionSubtext}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsCard}>
            <Scan color="#22C55E" size={24} />
            <Text style={styles.tipsTitle}>Photo Tips for Best Results:</Text>
            <Text style={styles.tipText}>✓ Capture clear, well-lit images</Text>
            <Text style={styles.tipText}>✓ Focus on affected plant parts</Text>
            <Text style={styles.tipText}>✓ Avoid shadows and blur</Text>
            <Text style={styles.tipText}>✓ Include multiple angles if possible</Text>
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
                <Text style={styles.analysingText}>Analyzing crop...</Text>
              </View>
            )}
          </View>

          {result && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.diseaseInfo}>
                  <Text style={styles.diseaseName}>{result.disease}</Text>
                  <Text style={styles.confidence}>Confidence: {result.confidence}%</Text>
                </View>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: result.severity === 'High' ? '#EF4444' : 
                    result.severity === 'Medium' ? '#F59E0B' : '#22C55E' }
                ]}>
                  <Text style={styles.severityText}>{result.severity}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Treatment Recommendation</Text>
                <Text style={styles.treatmentText}>{result.treatment}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Symptoms Detected</Text>
                {result.symptoms.map((symptom: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <AlertCircle color="#F59E0B" size={16} />
                    <Text style={styles.listText}>{symptom}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prevention Tips</Text>
                {result.prevention.map((tip: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <CheckCircle color="#22C55E" size={16} />
                    <Text style={styles.listText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.resetButton} onPress={resetAnalysis}>
              <Text style={styles.resetButtonText}>Analyze New Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Detections */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Detections</Text>
        {cropDiseases.slice(0, 3).map((disease) => (
          <View key={disease.id} style={styles.recentItem}>
            <Image source={{ uri: disease.imageUrl }} style={styles.recentImage} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>{disease.name}</Text>
              <Text style={styles.recentDate}>{disease.detectedAt}</Text>
            </View>
            <View style={[
              styles.severityIndicator,
              { backgroundColor: disease.severity === 'high' ? '#EF4444' : 
                disease.severity === 'medium' ? '#F59E0B' : '#22C55E' }
            ]} />
          </View>
        ))}
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
  recentItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
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