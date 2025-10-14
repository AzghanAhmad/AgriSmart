import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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
    { id: '1', name: 'Wheat Rust', location: 'Punjab - Sector A', severity: 'high', cases: 45 },
    { id: '2', name: 'Rice Blast', location: 'Sindh - Zone B', severity: 'medium', cases: 23 },
    { id: '3', name: 'Cotton Boll Rot', location: 'Punjab - Sector C', severity: 'high', cases: 67 },
    { id: '4', name: 'Corn Smut', location: 'KPK - Region D', severity: 'low', cases: 12 },
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

      {/* Mock Map View */}
      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <MapPin color="#22C55E" size={20} />
          <Text style={styles.mapTitle}>Pakistan Agricultural Map</Text>
        </View>
        
        <View style={styles.mockMap}>
          {/* Mock map regions with different severity levels */}
          <View style={styles.mapRegions}>
            <View style={[styles.region, styles.region1]} />
            <View style={[styles.region, styles.region2]} />
            <View style={[styles.region, styles.region3]} />
            <View style={[styles.region, styles.region4]} />
          </View>
          
          {/* Mock hotspot markers */}
          {diseaseHotspots.slice(0, 4).map((hotspot, index) => (
            <View
              key={hotspot.id}
              style={[
                styles.hotspotMarker,
                { 
                  backgroundColor: getSeverityColor(hotspot.severity),
                  top: `${20 + index * 15}%`,
                  left: `${25 + index * 20}%`
                }
              ]}
            >
              <AlertTriangle color="white" size={16} />
            </View>
          ))}
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
  mockMap: {
    height: 250,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  mapRegions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  region: {
    position: 'absolute',
    borderRadius: 8,
  },
  region1: {
    top: '10%',
    left: '20%',
    width: 60,
    height: 80,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  region2: {
    top: '20%',
    right: '25%',
    width: 50,
    height: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  region3: {
    bottom: '20%',
    left: '15%',
    width: 70,
    height: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  region4: {
    bottom: '30%',
    right: '20%',
    width: 45,
    height: 55,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  hotspotMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
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