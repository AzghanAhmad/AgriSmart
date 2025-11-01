import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { MapPin, TriangleAlert as AlertTriangle, Filter, Layers } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export default function HeatmapScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedLayer, setSelectedLayer] = useState('disease');

  const filters = [
    { id: 'all', label: 'All Diseases' },
    { id: 'wheat', label: 'Wheat' },
    { id: 'rice', label: 'Rice' },
    { id: 'cotton', label: 'Cotton' },
  ];

  const layers = [
    { id: 'disease', label: 'Disease Spread' },
    { id: 'weather', label: 'Weather Conditions' },
    { id: 'soil', label: 'Soil Health' },
    { id: 'yield', label: 'Yield Prediction' },
  ];

  const diseaseHotspots = [
    { id: '1', name: 'Wheat Rust', location: 'Punjab - Sector A', severity: 'high', cases: 45, latitude: 31.5204, longitude: 74.3587 },
    { id: '2', name: 'Rice Blast', location: 'Sindh - Zone B', severity: 'medium', cases: 23, latitude: 25.1967, longitude: 68.5247 },
    { id: '3', name: 'Cotton Boll Rot', location: 'Punjab - Sector C', severity: 'high', cases: 67, latitude: 30.1575, longitude: 71.5249 },
    { id: '4', name: 'Corn Smut', location: 'KPK - Region D', severity: 'low', cases: 12, latitude: 34.0151, longitude: 71.5249 },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Disease Heatmap</Text>
        <Text style={styles.subtitle}>
          Real-time disease spread monitoring across regions
        </Text>
      </View>

      {/* Filter Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterTitle}>Crop Filter</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.id && styles.activeFilterButton
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter.id && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterTitle}>Map Layer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {layers.map((layer) => (
              <TouchableOpacity
                key={layer.id}
                style={[
                  styles.layerButton,
                  selectedLayer === layer.id && styles.activeLayerButton
                ]}
                onPress={() => setSelectedLayer(layer.id)}
              >
                <Layers 
                  size={16} 
                  color={selectedLayer === layer.id ? '#22C55E' : '#6B7280'} 
                />
                <Text style={[
                  styles.layerText,
                  selectedLayer === layer.id && styles.activeLayerText
                ]}>
                  {layer.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Pakistan Map View */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <MapPin color="#22C55E" size={20} />
          <Text style={styles.mapTitle}>Pakistan Agricultural Map</Text>
        </View>
        
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapOverlay}>
            {diseaseHotspots.map((hotspot, index) => (
              <TouchableOpacity
                key={hotspot.id}
                style={[
                  styles.mapMarker,
                  {
                    top: `${15 + index * 20}%`,
                    left: `${20 + index * 15}%`,
                    backgroundColor: getSeverityColor(hotspot.severity),
                  }
                ]}
              >
                <AlertTriangle color="white" size={20} />
                <View style={styles.markerTooltip}>
                  <Text style={styles.markerTitle}>{hotspot.name}</Text>
                  <Text style={styles.markerSubtitle}>{hotspot.location}</Text>
                  <Text style={styles.markerCases}>{hotspot.cases} cases</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.mapText}>Pakistan Disease Monitoring</Text>
          <Text style={styles.mapSubtext}>Interactive map showing disease hotspots across regions</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Severity Levels</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>High Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Medium Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Low Risk</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Disease Hotspots List */}
      <View style={styles.hotspotsSection}>
        <Text style={styles.sectionTitle}>Active Disease Hotspots</Text>
        {diseaseHotspots.map((hotspot) => (
          <TouchableOpacity key={hotspot.id} style={styles.hotspotCard}>
            <View style={styles.hotspotHeader}>
              <View style={styles.hotspotInfo}>
                <Text style={styles.hotspotName}>{hotspot.name}</Text>
                <Text style={styles.hotspotLocation}>{hotspot.location}</Text>
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
                <Text style={styles.casesText}>{hotspot.cases} cases</Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(hotspot.cases, 100)}%`,
                      backgroundColor: getSeverityColor(hotspot.severity)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>Spread rate: {hotspot.cases}%</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Statistics */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Regional Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>147</Text>
            <Text style={styles.statLabel}>Total Cases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Affected Regions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12%</Text>
            <Text style={styles.statLabel}>Weekly Increase</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3.2K</Text>
            <Text style={styles.statLabel}>Acres Affected</Text>
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
    gap: 16,
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
  layerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  activeLayerButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  layerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeLayerText: {
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
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#E0F2E9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerTooltip: {
    position: 'absolute',
    top: 45,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    display: 'none',
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  markerSubtitle: {
    fontSize: 10,
    color: '#6B7280',
  },
  markerCases: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 2,
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