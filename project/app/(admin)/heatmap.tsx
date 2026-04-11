import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MapPin, TriangleAlert as AlertTriangle, Plus, Minus } from 'lucide-react-native';
import { getApiBaseUrl } from '@/utils/env';
import * as Location from 'expo-location';
import { useTheme } from '@/contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

interface OutbreakAlertItem {
  alertId: string;
  diseaseId: string;
  diseaseName: string;
  status: string;
  createdAt: string | null;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

interface HotspotData extends OutbreakAlertItem {
  cityName: string;
  cases: number;
  severity: 'high' | 'medium' | 'low';
}

interface HeatmapStats {
  totalCases: number;
  affectedRegions: number;
  weeklyIncrease: number;
  acresAffected: number;
  acresAffectedRaw: number;
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
  diseaseName: string;
}

export default function AdminHeatmapScreen() {
  const { colors: tc } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [alerts, setAlerts] = useState<OutbreakAlertItem[]>([]);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats>({
    totalCases: 0,
    affectedRegions: 0,
    weeklyIncrease: 0,
    acresAffected: 0,
    acresAffectedRaw: 0,
  });
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  const filters = [
    { id: 'all', label: 'All Diseases' },
    { id: 'wheat', label: 'Wheat' },
    { id: 'rice', label: 'Rice' },
    { id: 'cotton', label: 'Cotton' },
  ];

  // Filter hotspots based on selected filter
  const filteredHotspots = hotspots.filter((hotspot) => {
    if (selectedFilter === 'all') return true;
    const diseaseName = (hotspot.diseaseName || hotspot.diseaseId || '').toLowerCase();
    return diseaseName.includes(selectedFilter.toLowerCase());
  });

  // Load alerts and stats
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        
        // Load approved alerts
        const alertsResp = await fetch(`${baseUrl}/api/admin/alerts?status=approved`);
        const alertsData = await alertsResp.json();
        const alertsList = Array.isArray(alertsData.items) ? alertsData.items : [];
        
        // Load statistics
        const statsResp = await fetch(`${baseUrl}/api/admin/heatmap/stats`);
        const statsData = await statsResp.json();
        
        // Load heatmap points
        const pointsResp = await fetch(`${baseUrl}/api/admin/heatmap/points`);
        const pointsData = await pointsResp.json();
        const pointsList = Array.isArray(pointsData.points) ? pointsData.points : [];
        
        console.log('📊 Heatmap points loaded:', pointsList.length);
        if (pointsList.length > 0) {
          console.log('📍 Sample point:', pointsList[0]);
        }
        
        if (!cancelled) {
          setAlerts(alertsList);
          setStats(statsData);
          setHeatmapPoints(pointsList);
          
          // Process alerts to get city names and case counts
          const processedHotspots = await Promise.all(
            alertsList.map(async (alert: OutbreakAlertItem) => {
              // Get city name from reverse geocoding
              let cityName = 'Unknown Location';
              try {
                const [address] = await Location.reverseGeocodeAsync({
                  latitude: alert.centerLat,
                  longitude: alert.centerLng,
                });
                if (address) {
                  cityName = address.city || address.region || address.country || 'Unknown Location';
                }
              } catch (e) {
                console.log('Reverse geocoding failed:', e);
              }
              
              // Get case count
              let cases = 0;
              try {
                const casesResp = await fetch(`${baseUrl}/api/admin/heatmap/alert-details/${alert.alertId}`);
                const casesData = await casesResp.json();
                cases = casesData.cases || 0;
              } catch (e) {
                console.log('Failed to fetch case count:', e);
              }
              
              return {
                ...alert,
                cityName,
                cases,
                severity: cases >= 10 ? 'high' : cases >= 5 ? 'medium' : 'low' as const,
              };
            })
          );
          
          setHotspots(processedHotspots);
        }
      } catch (e) {
        console.error('Error loading heatmap data:', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then((camera: any) => {
        camera.zoom = (camera.zoom || 5) + 1;
        mapRef.current.animateCamera(camera, { duration: 300 });
      });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.getCamera().then((camera: any) => {
        camera.zoom = Math.max((camera.zoom || 5) - 1, 1);
        mapRef.current.animateCamera(camera, { duration: 300 });
      });
    }
  };

  const formatStatValue = (value: number, isPercent: boolean = false, isAcres: boolean = false) => {
    if (isPercent) {
      return `${value > 0 ? '+' : ''}${value}%`;
    }
    if (isAcres) {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toFixed(1);
    }
    return value.toString();
  };

  // Get heatmap color based on intensity (0-100)
  const getHeatmapColor = (intensity: number): string => {
    // Intensity 0-25: Green to Yellow
    if (intensity < 25) {
      const ratio = intensity / 25;
      const r = Math.floor(34 + (255 - 34) * ratio);
      const g = Math.floor(197 + (193 - 197) * ratio);
      const b = Math.floor(76 + (7 - 76) * ratio);
      return `rgba(${r}, ${g}, ${b}, 0.7)`;
    }
    // Intensity 25-50: Yellow to Orange
    if (intensity < 50) {
      const ratio = (intensity - 25) / 25;
      const r = Math.floor(255);
      const g = Math.floor(193 - (107 - 193) * ratio);
      const b = Math.floor(7);
      return `rgba(${r}, ${g}, ${b}, 0.75)`;
    }
    // Intensity 50-75: Orange to Red
    if (intensity < 75) {
      const ratio = (intensity - 50) / 25;
      const r = Math.floor(255);
      const g = Math.floor(107 - (69 - 107) * ratio);
      const b = Math.floor(7);
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    }
    // Intensity 75-100: Red (bright red)
    const ratio = (intensity - 75) / 25;
    const r = Math.floor(255);
    const g = Math.floor(69 - 69 * ratio); // 69 -> 0
    const b = Math.floor(7 - 7 * ratio); // 7 -> 0
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  };

  // Filter heatmap points based on disease filter
  const filteredHeatmapPoints = useMemo(() => {
    return heatmapPoints.filter((point) => {
      if (selectedFilter === 'all') return true;
      const diseaseName = (point.diseaseName || '').toLowerCase();
      return diseaseName.includes(selectedFilter.toLowerCase());
    });
  }, [heatmapPoints, selectedFilter]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: tc.screen }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tc.text }]}>Disease Heatmap</Text>
        <Text style={[styles.subtitle, { color: tc.textMuted }]}>
          Real-time disease spread monitoring across regions
        </Text>
      </View>

      {/* Disease Filter */}
      <View style={styles.controlsContainer}>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterTitle, { color: tc.textSecondary }]}>Filter by Disease</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  { backgroundColor: tc.card, borderColor: tc.border },
                  selectedFilter === filter.id && styles.activeFilterButton
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text style={[
                  styles.filterText,
                  { color: tc.textMuted },
                  selectedFilter === filter.id && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Pakistan Map View */}
      <View style={[styles.mapContainer, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
        <View style={styles.mapHeader}>
          <MapPin color="#22C55E" size={20} />
          <Text style={[styles.mapTitle, { color: tc.text }]}>Pakistan Agricultural Map</Text>
        </View>

        <View style={styles.mapWrapper}>
          {Platform.OS === 'web' ? (
            <View style={[styles.mapPlaceholder, { backgroundColor: tc.screenSecondary }]}>
              <Text style={[styles.mapText, { color: tc.text }]}>Pakistan Disease Monitoring</Text>
              <Text style={[styles.mapSubtext, { color: tc.textMuted }]}>
                Interactive map showing disease hotspots across regions
              </Text>
            </View>
          ) : (
            (() => {
              try {
                const Maps = require('react-native-maps');
                const MapView = Maps && Maps.default;
                const Circle = Maps && Maps.Circle;
                const Marker = Maps && Maps.Marker;

                if (!MapView || !Circle || !Marker) {
                  return (
                    <View style={[styles.mapPlaceholder, { backgroundColor: tc.screenSecondary }]}>
                      <Text style={[styles.mapText, { color: tc.text }]}>Pakistan Disease Monitoring</Text>
                      <Text style={[styles.mapSubtext, { color: tc.textMuted }]}>
                        Map component not available. Please check react-native-maps installation.
                      </Text>
                    </View>
                  );
                }

                return (
                  <>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      initialRegion={{
                        latitude: 30.3753, // Pakistan center
                        longitude: 69.3451,
                        latitudeDelta: 20, // Wider view to show all of Pakistan
                        longitudeDelta: 20,
                      }}
                      showsUserLocation={false}
                    >
                      {/* Heatmap gradient overlay - multiple overlapping circles */}
                      {filteredHeatmapPoints.flatMap((point, idx) => {
                        const radius = 25000; // 25km radius for better visibility
                        const color = getHeatmapColor(point.intensity);
                        const baseKey = `hm-${idx}-${Math.round(point.latitude * 1000)}-${Math.round(point.longitude * 1000)}`;
                        
                        // Return array of circles (flatMap will flatten automatically)
                        return [
                          // Outer circle - largest
                          <Circle
                            key={`${baseKey}-outer`}
                            center={{
                              latitude: point.latitude || 0,
                              longitude: point.longitude || 0,
                            }}
                            radius={radius}
                            fillColor={color}
                            strokeColor="transparent"
                          />,
                          // Middle circle
                          <Circle
                            key={`${baseKey}-middle`}
                            center={{
                              latitude: point.latitude || 0,
                              longitude: point.longitude || 0,
                            }}
                            radius={radius * 0.7}
                            fillColor={color}
                            strokeColor="transparent"
                          />,
                          // Inner circle - smallest and most intense
                          <Circle
                            key={`${baseKey}-inner`}
                            center={{
                              latitude: point.latitude || 0,
                              longitude: point.longitude || 0,
                            }}
                            radius={radius * 0.4}
                            fillColor={color}
                            strokeColor="transparent"
                          />,
                        ];
                      })}
                      
                      {/* Red dot markers for alert centers */}
                      {filteredHotspots && filteredHotspots.length > 0 && filteredHotspots.map((hotspot) => (
                        <Marker
                          key={hotspot.alertId || `marker-${hotspot.centerLat}-${hotspot.centerLng}`}
                          coordinate={{
                            latitude: hotspot.centerLat || 0,
                            longitude: hotspot.centerLng || 0,
                          }}
                          title={hotspot.diseaseName || hotspot.diseaseId || 'Disease Outbreak'}
                          description={`${hotspot.cityName || 'Unknown'} • ${hotspot.cases || 0} cases`}
                        >
                          <View style={styles.redDotMarker}>
                            <View style={[styles.redDot, { backgroundColor: '#EF4444' }]} />
                          </View>
                        </Marker>
                      ))}
                    </MapView>
                    
                    {/* Zoom Controls */}
                    <View style={styles.zoomControls}>
                      <TouchableOpacity style={[styles.zoomButton, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]} onPress={handleZoomIn}>
                        <Plus color="#22C55E" size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.zoomButton, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]} onPress={handleZoomOut}>
                        <Minus color="#22C55E" size={20} />
                      </TouchableOpacity>
                    </View>
                  </>
                );
              } catch (e) {
                return (
                  <View style={[styles.mapPlaceholder, { backgroundColor: tc.screenSecondary }]}>
                    <Text style={[styles.mapText, { color: tc.text }]}>Pakistan Disease Monitoring</Text>
                    <Text style={[styles.mapSubtext, { color: tc.textMuted }]}>
                      Map component failed to load. Please verify react-native-maps setup.
                    </Text>
                  </View>
                );
              }
            })()
          )}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { borderTopColor: tc.border }]}>
          <Text style={[styles.legendTitle, { color: tc.text }]}>Severity Levels</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: tc.textSecondary }]}>High Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.legendText, { color: tc.textSecondary }]}>Medium Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: tc.textSecondary }]}>Low Risk</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Disease Hotspots List */}
      <View style={styles.hotspotsSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Active Disease Hotspots</Text>
        {loading ? (
          <Text style={[styles.loadingText, { color: tc.textMuted }]}>Loading hotspots...</Text>
        ) : filteredHotspots.length === 0 ? (
          <Text style={[styles.emptyText, { color: tc.textMuted }]}>No disease hotspots found</Text>
        ) : (
          filteredHotspots.map((hotspot) => (
            <TouchableOpacity key={hotspot.alertId} style={[styles.hotspotCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <View style={styles.hotspotHeader}>
                <View style={styles.hotspotInfo}>
                  <Text style={[styles.hotspotName, { color: tc.text }]}>
                    {hotspot.diseaseName || hotspot.diseaseId || 'Disease Outbreak'}
                  </Text>
                  <Text style={[styles.hotspotLocation, { color: tc.textMuted }]}>{hotspot.cityName}</Text>
                </View>
                <View style={styles.hotspotStats}>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(hotspot.severity) }
                  ]}>
                    <Text style={styles.severityText}>
                      {hotspot.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.casesText, { color: tc.textSecondary }]}>{hotspot.cases} cases</Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: tc.border }]}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min((hotspot.cases / Math.max(stats.totalCases, 1)) * 100, 100)}%`,
                        backgroundColor: getSeverityColor(hotspot.severity)
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: tc.textMuted }]}>
                  Cases: {hotspot.cases} • Spread: {hotspot.radiusKm}km radius
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: tc.text }]}>Regional Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: tc.text }]}>{stats.totalCases}</Text>
            <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Cases</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: tc.text }]}>{stats.affectedRegions}</Text>
            <Text style={[styles.statLabel, { color: tc.textMuted }]}>Affected Regions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: tc.text }]}>
              {formatStatValue(stats.weeklyIncrease, true)}
            </Text>
            <Text style={[styles.statLabel, { color: tc.textMuted }]}>Weekly Increase</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
            <Text style={[styles.statValue, { color: tc.text }]}>
              {formatStatValue(stats.acresAffected, false, true)}
            </Text>
            <Text style={[styles.statLabel, { color: tc.textMuted }]}>Acres Affected</Text>
          </View>
        </View>
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
  controlsContainer: {
    marginBottom: 24,
  },
  filterGroup: {
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#22C55E',
  },
  mapContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  mapWrapper: {
    position: 'relative',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    height: '100%',
    backgroundColor: '#E0F2E9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#16A34A',
    marginBottom: 4,
  },
  mapSubtext: {
    fontSize: 13,
    color: '#22C55E',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'column',
    gap: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  redDotMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  hotspotsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    padding: 20,
    fontStyle: 'italic',
  },
  hotspotCard: {
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
  hotspotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  hotspotLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  hotspotStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  casesText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 56) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

