import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Search, Filter, Users, MapPin, Phone, Mail, MoveVertical as MoreVertical, CircleCheck as CheckCircle, X } from 'lucide-react-native';

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  cropTypes: string[];
  farmSize: string;
  registrationDate: string;
  status: 'active' | 'pending' | 'suspended';
  totalReports: number;
}

export default function FarmersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const mockFarmers: Farmer[] = [
    {
      id: '1',
      name: 'Ahmad Khan',
      email: 'ahmad.khan@example.com',
      phone: '+92-300-123456',
      location: 'Punjab, Lahore',
      cropTypes: ['Wheat', 'Rice'],
      farmSize: '12.5 acres',
      registrationDate: '2024-01-10',
      status: 'active',
      totalReports: 15
    },
    {
      id: '2',
      name: 'Muhammad Ali',
      email: 'ali.farmer@example.com',
      phone: '+92-301-234567',
      location: 'Sindh, Karachi',
      cropTypes: ['Cotton', 'Sugarcane'],
      farmSize: '8.2 acres',
      registrationDate: '2024-01-12',
      status: 'pending',
      totalReports: 3
    },
    {
      id: '3',
      name: 'Fatima Bibi',
      email: 'fatima.b@example.com',
      phone: '+92-302-345678',
      location: 'Punjab, Multan',
      cropTypes: ['Wheat', 'Cotton', 'Rice'],
      farmSize: '15.7 acres',
      registrationDate: '2024-01-08',
      status: 'active',
      totalReports: 22
    },
    {
      id: '4',
      name: 'Hassan Sheikh',
      email: 'hassan.sheikh@example.com',
      phone: '+92-303-456789',
      location: 'KPK, Peshawar',
      cropTypes: ['Corn', 'Wheat'],
      farmSize: '6.3 acres',
      registrationDate: '2024-01-15',
      status: 'suspended',
      totalReports: 8
    }
  ];

  const filters = [
    { id: 'all', label: 'All Farmers' },
    { id: 'active', label: 'Active' },
    { id: 'pending', label: 'Pending' },
    { id: 'suspended', label: 'Suspended' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'suspended': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return '#F0FDF4';
      case 'pending': return '#FFFBEB';
      case 'suspended': return '#FEF2F2';
      default: return '#F3F4F6';
    }
  };

  const filteredFarmers = mockFarmers.filter(farmer => {
    const matchesSearch = farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         farmer.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || farmer.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleApprove = (farmerId: string) => {
    Alert.alert(
      'Approve Farmer',
      'Are you sure you want to approve this farmer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => console.log('Approved:', farmerId) }
      ]
    );
  };

  const handleSuspend = (farmerId: string) => {
    Alert.alert(
      'Suspend Farmer',
      'Are you sure you want to suspend this farmer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Suspend', style: 'destructive', onPress: () => console.log('Suspended:', farmerId) }
      ]
    );
  };

  const statsData = [
    { label: 'Total Farmers', value: mockFarmers.length.toString(), color: '#22C55E' },
    { label: 'Active', value: mockFarmers.filter(f => f.status === 'active').length.toString(), color: '#10B981' },
    { label: 'Pending', value: mockFarmers.filter(f => f.status === 'pending').length.toString(), color: '#F59E0B' },
    { label: 'Suspended', value: mockFarmers.filter(f => f.status === 'suspended').length.toString(), color: '#EF4444' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Farmer Management</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Farmer</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        {statsData.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color="#6B7280" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search farmers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
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

      {/* Farmers List */}
      <ScrollView style={styles.farmersList} contentContainerStyle={styles.farmersContent}>
        {filteredFarmers.map((farmer) => (
          <View key={farmer.id} style={styles.farmerCard}>
            <View style={styles.farmerHeader}>
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.name}</Text>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusBgColor(farmer.status),
                    borderColor: getStatusColor(farmer.status)
                  }
                ]}>
                  <Text style={[styles.statusText, { color: getStatusColor(farmer.status) }]}>
                    {farmer.status.charAt(0).toUpperCase() + farmer.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.menuButton}>
                <MoreVertical color="#6B7280" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.farmerDetails}>
              <View style={styles.detailRow}>
                <Mail color="#6B7280" size={16} />
                <Text style={styles.detailText}>{farmer.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Phone color="#6B7280" size={16} />
                <Text style={styles.detailText}>{farmer.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin color="#6B7280" size={16} />
                <Text style={styles.detailText}>{farmer.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Users color="#6B7280" size={16} />
                <Text style={styles.detailText}>{farmer.farmSize} • {farmer.cropTypes.join(', ')}</Text>
              </View>
            </View>

            <View style={styles.farmerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>{farmer.totalReports}</Text>
                <Text style={styles.statItemLabel}>Reports</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statItemValue}>
                  {new Date(farmer.registrationDate).toLocaleDateString()}
                </Text>
                <Text style={styles.statItemLabel}>Registered</Text>
              </View>
            </View>

            {farmer.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.approveButton}
                  onPress={() => handleApprove(farmer.id)}
                >
                  <CheckCircle color="white" size={16} />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleSuspend(farmer.id)}
                >
                  <X color="white" size={16} />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {farmer.status === 'active' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.suspendButton}
                  onPress={() => handleSuspend(farmer.id)}
                >
                  <Text style={styles.suspendButtonText}>Suspend</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {filteredFarmers.length === 0 && (
          <View style={styles.emptyState}>
            <Users color="#6B7280" size={48} />
            <Text style={styles.emptyTitle}>No farmers found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search terms' : 'No farmers match the selected filter'}
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  statsScroll: {
    backgroundColor: 'white',
    paddingVertical: 16,
  },
  statCard: {
    paddingHorizontal: 16,
    alignItems: 'center',
    marginLeft: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  searchSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F0FDF4',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#22C55E',
  },
  farmersList: {
    flex: 1,
  },
  farmersContent: {
    padding: 16,
  },
  farmerCard: {
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
  farmerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
  },
  farmerDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  farmerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  suspendButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendButtonText: {
    color: 'white',
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