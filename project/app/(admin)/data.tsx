import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Database, Upload, Download, Trash2, CreditCard as Edit3, Plus, FileText, Image, Leaf, Bug } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface DatasetItem {
  id: string;
  name: string;
  type: 'crop' | 'disease' | 'treatment' | 'seed';
  category: string;
  recordCount: number;
  lastUpdated: string;
  size: string;
  description: string;
}

export default function DataScreen() {
  const { colors: tc } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const mockDatasets: DatasetItem[] = [
    {
      id: '1',
      name: 'Wheat Disease Database',
      type: 'disease',
      category: 'Disease Patterns',
      recordCount: 2847,
      lastUpdated: '2024-01-15',
      size: '45.2 MB',
      description: 'Comprehensive database of wheat diseases with symptoms, treatments, and prevention methods.'
    },
    {
      id: '2',
      name: 'Rice Varieties Catalog',
      type: 'crop',
      category: 'Crop Information',
      recordCount: 156,
      lastUpdated: '2024-01-12',
      size: '12.8 MB',
      description: 'Detailed information about rice varieties, yield potential, and growing conditions.'
    },
    {
      id: '3',
      name: 'Organic Pesticides Registry',
      type: 'treatment',
      category: 'Treatment Methods',
      recordCount: 234,
      lastUpdated: '2024-01-10',
      size: '18.7 MB',
      description: 'Registry of approved organic pesticides with application guidelines and effectiveness data.'
    },
    {
      id: '4',
      name: 'High-Yield Seed Collection',
      type: 'seed',
      category: 'Seed Varieties',
      recordCount: 89,
      lastUpdated: '2024-01-08',
      size: '6.3 MB',
      description: 'Collection of high-yield, disease-resistant seed varieties for various crops.'
    },
    {
      id: '5',
      name: 'Cotton Pest Management',
      type: 'disease',
      category: 'Disease Patterns',
      recordCount: 456,
      lastUpdated: '2024-01-07',
      size: '23.4 MB',
      description: 'Comprehensive guide for cotton pest identification and management strategies.'
    },
    {
      id: '6',
      name: 'Fertilizer Recommendations',
      type: 'treatment',
      category: 'Treatment Methods',
      recordCount: 178,
      lastUpdated: '2024-01-05',
      size: '9.2 MB',
      description: 'Soil-specific fertilizer recommendations for optimal crop growth.'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Datasets', count: mockDatasets.length },
    { id: 'Disease Patterns', label: 'Disease Patterns', count: mockDatasets.filter(d => d.category === 'Disease Patterns').length },
    { id: 'Crop Information', label: 'Crop Information', count: mockDatasets.filter(d => d.category === 'Crop Information').length },
    { id: 'Treatment Methods', label: 'Treatment Methods', count: mockDatasets.filter(d => d.category === 'Treatment Methods').length },
    { id: 'Seed Varieties', label: 'Seed Varieties', count: mockDatasets.filter(d => d.category === 'Seed Varieties').length }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crop': return Leaf;
      case 'disease': return Bug;
      case 'treatment': return FileText;
      case 'seed': return Database;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crop': return '#22C55E';
      case 'disease': return '#EF4444';
      case 'treatment': return '#3B82F6';
      case 'seed': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'crop': return '#F0FDF4';
      case 'disease': return '#FEF2F2';
      case 'treatment': return '#EFF6FF';
      case 'seed': return '#FFFBEB';
      default: return '#F3F4F6';
    }
  };

  const filteredDatasets = selectedCategory === 'all' 
    ? mockDatasets 
    : mockDatasets.filter(dataset => dataset.category === selectedCategory);

  const totalStats = {
    totalDatasets: mockDatasets.length,
    totalRecords: mockDatasets.reduce((sum, d) => sum + d.recordCount, 0),
    totalSize: mockDatasets.reduce((sum, d) => sum + parseFloat(d.size), 0).toFixed(1) + ' MB',
    lastUpdate: mockDatasets.reduce((latest, d) => 
      new Date(d.lastUpdated) > new Date(latest) ? d.lastUpdated : latest, 
      '2024-01-01'
    )
  };

  const handleUpload = () => {
    Alert.alert('Upload Dataset', 'Dataset upload functionality would be implemented here.');
  };

  const handleEdit = (datasetId: string) => {
    Alert.alert('Edit Dataset', `Edit dataset ${datasetId} functionality would be implemented here.`);
  };

  const handleDelete = (datasetId: string) => {
    Alert.alert(
      'Delete Dataset',
      'Are you sure you want to delete this dataset? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Deleted:', datasetId) }
      ]
    );
  };

  const handleExport = (datasetId: string) => {
    Alert.alert('Export Dataset', `Exporting dataset ${datasetId}...`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Dataset Management</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Upload color="white" size={20} />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{totalStats.totalDatasets}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Datasets</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{totalStats.totalRecords.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Records</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{totalStats.totalSize}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Total Size</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Text style={[styles.statValue, { color: tc.text }]}>{formatDate(totalStats.lastUpdate)}</Text>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>Last Updated</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={[styles.categorySection, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.categoryTitle, { color: tc.text }]}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { backgroundColor: tc.inputBg, borderColor: tc.border },
                selectedCategory === category.id && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryText,
                { color: tc.textSecondary },
                selectedCategory === category.id && styles.activeCategoryText
              ]}>
                {category.label}
              </Text>
              <View style={[
                styles.categoryBadge,
                { backgroundColor: tc.screenSecondary },
                selectedCategory === category.id && styles.activeCategoryBadge
              ]}>
                <Text style={[
                  styles.categoryCount,
                  { color: tc.textMuted },
                  selectedCategory === category.id && styles.activeCategoryCount
                ]}>
                  {category.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Datasets List */}
      <ScrollView style={[styles.datasetsList, { backgroundColor: tc.screen }]} contentContainerStyle={styles.datasetsContent}>
        {filteredDatasets.map((dataset) => {
          const TypeIcon = getTypeIcon(dataset.type);
          
          return (
            <View key={dataset.id} style={[styles.datasetCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              <View style={styles.datasetHeader}>
                <View style={styles.datasetInfo}>
                  <View style={styles.datasetTitleRow}>
                    <View style={[
                      styles.typeIcon,
                      { backgroundColor: getTypeBgColor(dataset.type) }
                    ]}>
                      <TypeIcon color={getTypeColor(dataset.type)} size={20} />
                    </View>
                    <Text style={[styles.datasetName, { color: tc.text }]}>{dataset.name}</Text>
                  </View>
                  <Text style={[styles.datasetDescription, { color: tc.textSecondary }]}>{dataset.description}</Text>
                </View>
                
                <View style={styles.datasetActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: tc.inputBg }]}
                    onPress={() => handleEdit(dataset.id)}
                  >
                    <Edit3 color={tc.textMuted} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: tc.inputBg }]}
                    onPress={() => handleDelete(dataset.id)}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.datasetMetrics, { borderTopColor: tc.border, borderBottomColor: tc.border }]}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: tc.text }]}>{dataset.recordCount.toLocaleString()}</Text>
                  <Text style={[styles.metricLabel, { color: tc.textMuted }]}>Records</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: tc.text }]}>{dataset.size}</Text>
                  <Text style={[styles.metricLabel, { color: tc.textMuted }]}>Size</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: tc.text }]}>{formatDate(dataset.lastUpdated)}</Text>
                  <Text style={[styles.metricLabel, { color: tc.textMuted }]}>Updated</Text>
                </View>
              </View>

              <View style={[styles.datasetFooter, { borderTopColor: tc.border }]}>
                <View style={[
                  styles.categoryTag,
                  { backgroundColor: getTypeBgColor(dataset.type) }
                ]}>
                  <Text style={[
                    styles.categoryTagText,
                    { color: getTypeColor(dataset.type) }
                  ]}>
                    {dataset.category}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.exportButton, { backgroundColor: tc.screenSecondary, borderColor: tc.border, borderWidth: 1 }]}
                  onPress={() => handleExport(dataset.id)}
                >
                  <Download color="#22C55E" size={16} />
                  <Text style={[styles.exportButtonText, { color: tc.textSecondary }]}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredDatasets.length === 0 && (
          <View style={styles.emptyState}>
            <Database color={tc.textMuted} size={48} />
            <Text style={[styles.emptyTitle, { color: tc.text }]}>No datasets found</Text>
            <Text style={[styles.emptyText, { color: tc.textMuted }]}>
              No datasets match the selected category
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: tc.headerBg, borderTopColor: tc.border }]}>
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Plus color="#22C55E" size={24} />
          <Text style={[styles.quickActionText, { color: tc.textSecondary }]}>Add Dataset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Upload color="#3B82F6" size={24} />
          <Text style={[styles.quickActionText, { color: tc.textSecondary }]}>Bulk Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickAction, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
          <Download color="#F59E0B" size={24} />
          <Text style={[styles.quickActionText, { color: tc.textSecondary }]}>Export All</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  categorySection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  activeCategoryButton: {
    backgroundColor: '#F0FDF4',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#22C55E',
  },
  categoryBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeCategoryBadge: {
    backgroundColor: '#22C55E',
  },
  categoryCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeCategoryCount: {
    color: 'white',
  },
  datasetsList: {
    flex: 1,
  },
  datasetsContent: {
    padding: 16,
  },
  datasetCard: {
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
  datasetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  datasetInfo: {
    flex: 1,
    marginRight: 12,
  },
  datasetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datasetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  datasetDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  datasetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  datasetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  datasetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    gap: 4,
  },
  exportButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
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
});