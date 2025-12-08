import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/utils/env';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  humidity: number;
  precipitation: number;
  wind_speed: number;
  description: string;
  main: string;
  icon: string;
}

interface WeatherData {
  location: {
    lat: number;
    lon: number;
    city: string;
  };
  forecast: WeatherDay[];
}

export default function WeatherScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use user's coordinates if available, otherwise default to Lahore, Pakistan
      const lat = user?.latitude || 31.5204;
      const lon = user?.longitude || 74.3587;
      
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(
        `${API_BASE_URL}/api/farmer/schedule/weather?lat=${lat}&lon=${lon}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
      } else {
        setError('Failed to load weather data. Please try again.');
      }
    } catch (err) {
      console.error('Error loading weather:', err);
      setError('Unable to connect to weather service.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadWeather();
    setIsRefreshing(false);
  };

  const getWeatherIcon = (main: string, icon: string) => {
    if (icon.includes('01')) return Sun; // Clear sky
    if (icon.includes('02') || icon.includes('03') || icon.includes('04')) return Cloud; // Clouds
    if (icon.includes('09') || icon.includes('10')) return CloudRain; // Rain
    if (icon.includes('11')) return CloudRain; // Thunderstorm
    if (icon.includes('13')) return CloudSnow; // Snow
    return Cloud;
  };

  const getWeatherColor = (main: string) => {
    switch (main) {
      case 'Clear': return ['#FFD700', '#FFA500'];
      case 'Clouds': return ['#87CEEB', '#4682B4'];
      case 'Rain': return ['#4682B4', '#1E3A8A'];
      case 'Drizzle': return ['#87CEEB', '#4682B4'];
      case 'Thunderstorm': return ['#4A5568', '#2D3748'];
      case 'Snow': return ['#E0E0E0', '#B0B0B0'];
      default: return ['#87CEEB', '#4682B4'];
    }
  };

  const getFarmingRecommendation = (day: WeatherDay) => {
    const temp_avg = (day.temp_min + day.temp_max) / 2;
    const recommendations = [];

    if (temp_avg < 10) {
      recommendations.push('🌡️ Protect crops from frost');
    } else if (temp_avg > 35) {
      recommendations.push('🌡️ Increase irrigation frequency');
    }

    if (day.precipitation > 5) {
      recommendations.push('🌧️ Avoid irrigation, ensure drainage');
    } else if (day.precipitation > 0) {
      recommendations.push('🌧️ Reduce irrigation, natural watering');
    } else if (day.precipitation == 0 && temp_avg > 25) {
      recommendations.push('☀️ Increase irrigation, monitor soil');
    }

    if (day.wind_speed > 15) {
      recommendations.push('💨 Secure plants, avoid spraying');
    }

    return recommendations;
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading weather forecast..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Weather Forecast</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Cloud color="#EF4444" size={48} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWeather}>
            <RefreshCw color="white" size={16} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!weatherData || !weatherData.forecast) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Weather Forecast</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No weather data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>7-Day Weather Forecast</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <RefreshCw color="#22C55E" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Day Highlight */}
        {weatherData.forecast[0] && (
          <View style={styles.currentDayCard}>
            <LinearGradient
              colors={getWeatherColor(weatherData.forecast[0].main)}
              style={styles.currentDayGradient}
            >
              <View style={styles.currentDayContent}>
                <View style={styles.currentDayLeft}>
                  <Text style={styles.currentDayLabel}>Today</Text>
                  <Text style={styles.currentDayDate}>
                    {new Date(weatherData.forecast[0].date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.currentDayTemp}>
                    {Math.round(weatherData.forecast[0].temp_max)}°C
                  </Text>
                  <Text style={styles.currentDayDesc}>
                    {weatherData.forecast[0].description}
                  </Text>
                </View>
                <View style={styles.currentDayRight}>
                  {React.createElement(
                    getWeatherIcon(weatherData.forecast[0].main, weatherData.forecast[0].icon),
                    { color: 'white', size: 80 }
                  )}
                </View>
              </View>
              <View style={styles.currentDayStats}>
                <View style={styles.statItem}>
                  <Thermometer color="white" size={16} />
                  <Text style={styles.statText}>
                    {Math.round(weatherData.forecast[0].temp_min)}° / {Math.round(weatherData.forecast[0].temp_max)}°
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Droplets color="white" size={16} />
                  <Text style={styles.statText}>{weatherData.forecast[0].humidity}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Wind color="white" size={16} />
                  <Text style={styles.statText}>{weatherData.forecast[0].wind_speed.toFixed(1)} m/s</Text>
                </View>
                {weatherData.forecast[0].precipitation > 0 && (
                  <View style={styles.statItem}>
                    <CloudRain color="white" size={16} />
                    <Text style={styles.statText}>{weatherData.forecast[0].precipitation.toFixed(1)}mm</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* 7-Day Forecast - Show exactly 7 days from today */}
        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>7-Day Forecast</Text>
          {weatherData.forecast.slice(0, 7).map((day, index) => {
            const WeatherIcon = getWeatherIcon(day.main, day.icon);
            const recommendations = getFarmingRecommendation(day);
            const isToday = index === 0;
            
            return (
              <View key={index} style={[styles.dayCard, isToday && styles.todayCard]}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName}>
                      {isToday
                        ? 'Today'
                        : new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                    <Text style={styles.dayDate}>
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.dayWeather}>
                    <WeatherIcon color="#3B82F6" size={32} />
                    <View style={styles.dayTemps}>
                      <Text style={styles.dayTempHigh}>
                        {Math.round(day.temp_max)}°
                      </Text>
                      <Text style={styles.dayTempLow}>
                        {Math.round(day.temp_min)}°
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.dayDetails}>
                  <View style={styles.dayDetailRow}>
                    <Text style={styles.dayDescription}>{day.description}</Text>
                  </View>
                  <View style={styles.dayMetrics}>
                    <View style={styles.metricItem}>
                      <Droplets color="#3B82F6" size={14} />
                      <Text style={styles.metricText}>{day.humidity}% humidity</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Wind color="#6B7280" size={14} />
                      <Text style={styles.metricText}>{day.wind_speed.toFixed(1)} m/s</Text>
                    </View>
                    {day.precipitation > 0 && (
                      <View style={styles.metricItem}>
                        <CloudRain color="#3B82F6" size={14} />
                        <Text style={styles.metricText}>{day.precipitation.toFixed(1)}mm rain</Text>
                      </View>
                    )}
                  </View>
                  
                  {recommendations.length > 0 && (
                    <View style={styles.recommendationsBox}>
                      <Text style={styles.recommendationsTitle}>Farming Recommendations:</Text>
                      {recommendations.map((rec, idx) => (
                        <Text key={idx} style={styles.recommendationItem}>
                          • {rec}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  currentDayCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentDayGradient: {
    padding: 24,
  },
  currentDayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentDayLeft: {
    flex: 1,
  },
  currentDayLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  currentDayDate: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  currentDayTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  currentDayDesc: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'capitalize',
  },
  currentDayRight: {
    alignItems: 'center',
  },
  currentDayStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  forecastSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  dayWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayTemps: {
    alignItems: 'flex-end',
  },
  dayTempHigh: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  dayTempLow: {
    fontSize: 16,
    color: '#6B7280',
  },
  dayDetails: {
    gap: 8,
  },
  dayDetailRow: {
    marginBottom: 8,
  },
  dayDescription: {
    fontSize: 14,
    color: '#374151',
    textTransform: 'capitalize',
  },
  dayMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
  },
  recommendationsBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  recommendationItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
});

