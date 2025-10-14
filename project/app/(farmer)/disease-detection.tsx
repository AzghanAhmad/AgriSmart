import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Camera, Upload, Scan, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function DiseaseDetectionScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const { language, cropDiseases } = useApp();

  const handleCameraCapture = () => {
    // Mock camera capture
    Alert.alert(
      'Camera',
      'Camera functionality would be implemented using expo-camera',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mock Capture', onPress: () => mockImageAnalysis() },
      ]
    );
  };

  const handleImageUpload = () => {
    // Mock image upload
    Alert.alert(
      'Upload Image',
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
      setSelectedImage('https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg');
      
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResult = {
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
      };
      
      setResult(mockResult);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Crop Disease Detection</Text>
        <Text style={styles.subtitle}>
          Capture or upload crop images for AI-powered disease analysis
        </Text>
      </View>

      {!selectedImage && (
        <View style={styles.uploadSection}>
          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.optionButton} onPress={handleCameraCapture}>
              <Camera color="white" size={32} />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={handleImageUpload}>
              <Upload color="white" size={32} />
              <Text style={styles.optionText}>Upload Image</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Photo Tips:</Text>
            <Text style={styles.tipText}>• Capture clear, well-lit images</Text>
            <Text style={styles.tipText}>• Focus on affected plant parts</Text>
            <Text style={styles.tipText}>• Avoid shadows and blur</Text>
            <Text style={styles.tipText}>• Include multiple angles if possible</Text>
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  optionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
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