import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  RefreshControl,
} from 'react';
import {
  ArrowLeft,
  Calendar,
  Cloud,
  MapPin,
  Thermometer,
  Bug,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/utils/env';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

interface Detection {
  detectionId: string;
  disease: string;
  cropType: string;
  confidence: number;
  imageUrl: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  precipitation: number;
  wind_speed: number;
  description: string;
  main: string;
}

export default function ScheduleSelectScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await Promise.all([loadDetections(), loadWeather()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetections = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      const url = `${API_BASE_URL}/api/farmer/detections/recent?farmerId=${user.id}`;
      console.log('Fetching detections from:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Detections response:', data);
        
        // Map the response to our Detection interface
        const mappedDetections = (data.detections || []).map((d: any) => ({
          detectionId: d.id,
          disease: d.name || 'Unknown Disease',
          cropType: d.cropType || 'wheat', // Get from backend
          confidence: d.confidence || 85, // Get from backend
          imageUrl: d.imageUrl,
          timestamp: d.detectedAt,
          latitude: d.latitude,
          longitude: d.longitude,
        }));
        
        console.log('Mapped detections:', mappedDetections);
        setDetections(mappedDetections);
      } else {
        console.error('Failed to fetch detections:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading detections:', error);
    }
  };

  const loadWeather = async () => {
    try {
      // Default to Lahore, Pakistan coordinates
      const lat = user?.latitude || 31.5204;
      const lon = user?.longitude || 74.3587;
      
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(
        `${API_BASE_URL}/api/farmer/schedule/weather?lat=${lat}&lon=${lon}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data.forecast || []);
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!selectedDetection || !user?.id) return;
    
    setIsGenerating(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/api/farmer/schedule/generate-from-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerId: user.id,
          detectionId: selectedDetection.detectionId,
          cropType: selectedDetection.cropType,
          disease: selectedDetection.disease,
          location: user.location || 'Punjab, Pakistan',
          latitude: user.latitude || 31.5204,
          longitude: user.longitude || 74.3587,
          weekNumber: 'week1',
        }),
      });
      
      if (response.ok) {
        // Navigate to schedule screen
        router.push('/(farmer)/schedule' as any);
      } else {
        console.error('Failed to generate schedule');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getWeatherIcon = (main: string) => {
    return Cloud; // Simplified for now
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading your detections..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Create Schedule Plan</Text>
          <Text style={styles.subtitle}>Select a detection to generate personalized schedule</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Weather Forecast Section */}
        <View style={styles.weatherSection}>
          <View style={styles.sectionHeader}>
            <Cloud color="#F59E0B" size={24} />
            <Text style={styles.sectionTitle}>7-Day Weather Forecast</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weatherScroll}>
            {weatherData.slice(0, 7).map((day, index) => {
              const WeatherIcon = getWeatherIcon(day.main);
              const isToday = index === 0;
              
              return (
                <View key={index} style={[styles.weatherCard, isToday && styles.todayWeatherCard]}>
                  {isToday && <Text style={styles.todayLabel}>Today</Text>}
                  <Text style={styles.weatherDay}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.weatherDate}>
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <WeatherIcon color="#3B82F6" size={32} style={styles.weatherIcon} />
                  <Text style={styles.weatherTemp}>{Math.round(day.temp_max)}°</Text>
                  <Text style={styles.weatherTempLow}>{Math.round(day.temp_min)}°</Text>
                  <Text style={styles.weatherDesc} numberOfLines={2}>
                    {day.description}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Detection Selection Section */}
        <View style={styles.detectionSection}>
          <View style={styles.sectionHeader}>
            <Bug color="#22C55E" size={24} />
            <Text style={styles.sectionTitle}>Select Disease Detection</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Choose a crop disease detection from your history to create a personalized farming schedule
          </Text>

          {detections.length === 0 ? (
            <View style={styles.emptyState}>
              <Bug color="#9CA3AF" size={48} />
              <Text style={styles.emptyTitle}>No Detections Found</Text>
              <Text style={styles.emptyText}>
                Scan crops for disease detection first to create a personalized schedule
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => router.push('/(farmer)/disease-detection' as any)}
              >
                <Text style={styles.scanButtonText}>Scan Crop Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detectionGrid}>
              {detections.map((detection) => {
                const isSelected = selectedDetection?.detectionId === detection.detectionId;
                
                return (
                  <TouchableOpacity
                    key={detection.detectionId}
                    style={[styles.detectionCard, isSelected && styles.selectedCard]}
                    onPress={() => setSelectedDetection(detection)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <CheckCircle color="white" size={20} />
                      </View>
                    )}
                    
                    <Image
                      source={{ uri: detection.imageUrl }}
                      style={styles.detectionImage}
                      resizeMode="cover"
                    />
                    
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.detectionOverlay}
                    >
                      <Text style={styles.detectionDisease} numberOfLines={2}>
                        {detection.disease}
                      </Text>
                      <View style={styles.detectionMeta}>
                        <Text style={styles.detectionCrop}>{detection.cropType}</Text>
                        <Text style={styles.detectionConfidence}>
                          {detection.confidence}% confidence
                        </Text>
                      </View>
                      <Text style={styles.detectionDate}>
                        {new Date(detection.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Schedule Generation Info */}
        {selectedDetection && (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Schedule will be based on:</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <MapPin color="#3B82F6" size={20} />
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{user?.location || 'Punjab, Pakistan'}</Text>
              </View>
              
              <View style={styles.infoCard}>
                <Thermometer color="#F59E0B" size={20} />
                <Text style={styles.infoLabel}>Weather</Text>
                <Text style={styles.infoValue}>
                  {weatherData[0] ? `${Math.round(weatherData[0].temp_max)}°C` : 'Loading...'}
                </Text>
              </View>
              
              <View style={styles.infoCard}>
                <Bug color="#22C55E" size={20} />
                <Text style={styles.infoLabel}>Crop Type</Text>
                <Text style={styles.infoValue}>{selectedDetection.cropType}</Text>
              </View>
              
              <View style={styles.infoCard}>
                <Calendar color="#EF4444" size={20} />
                <Text style={styles.infoLabel}>Disease</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {selectedDetection.disease}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Generate Button */}
      {selectedDetection && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generatingButton]}
            onPress={handleGenerateSchedule}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Text style={styles.generateButtonText}>Generating Schedule...</Text>
              </>
            ) : (
              <>
                <Calendar color="white" size={20} />
                <Text style={styles.generateButtonText}>Generate Personalized Schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  weatherSection: {
    marginBottom: 24,
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
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  weatherScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  weatherCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayWeatherCard: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 4,
  },
  weatherDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  weatherDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  weatherIcon: {
    marginVertical: 8,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  weatherTempLow: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  weatherDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  detectionSection: {
    marginBottom: 24,
  },
  detectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detectionCard: {
    width: (screenWidth - 44) / 2,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: '#22C55E',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  detectionImage: {
    width: '100%',
    height: '100%',
  },
  detectionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  detectionDisease: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  detectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detectionCrop: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'capitalize',
  },
  detectionConfidence: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  detectionDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  generateButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generatingButton: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
