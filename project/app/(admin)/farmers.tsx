import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, Users, MapPin, Phone, Mail, Shield, Trash2, Ban, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  registrationDate: string | null;
  restrictedUntil?: string | null;
  restrictionReason?: string | null;
}

export default function FarmersScreen() {
  const { colors: tc } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingFarmerId, setActingFarmerId] = useState<string | null>(null);

  // Fetch farmers from API
  const fetchFarmers = async () => {
    try {
      setError(null);
      const response = await apiGet<{ total: number; items: Farmer[] }>('/api/admin/farmers');
      setFarmers(response.items || []);
    } catch (err: any) {
      console.error('Error fetching farmers:', err);
      setError(err.message || 'Failed to fetch farmers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFarmers();
  };

  // Filter farmers by search
  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = 
      farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (farmer.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (farmer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  // Get formatted location
  const getLocationDisplay = (farmer: Farmer) => {
    if (farmer.location) {
      return farmer.location;
    }
    if (farmer.latitude && farmer.longitude) {
      return `${farmer.latitude.toFixed(4)}, ${farmer.longitude.toFixed(4)}`;
    }
    return 'Location not set';
  };

  const isFarmerRestricted = (farmer: Farmer) => {
    if (!farmer.restrictedUntil) return false;
    return new Date(farmer.restrictedUntil).getTime() > Date.now();
  };

  const handleRestrictFarmer = (farmer: Farmer, days: number) => {
    Alert.alert(
      'Restrict Farmer Account',
      `Restrict ${farmer.name}'s account for ${days} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restrict',
          style: 'destructive',
          onPress: async () => {
            try {
              setActingFarmerId(farmer.id);
              await apiPost(`/api/admin/farmers/${encodeURIComponent(farmer.id)}/restrict`, { days });
              await fetchFarmers();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to restrict account');
            } finally {
              setActingFarmerId(null);
            }
          },
        },
      ]
    );
  };

  const handleUnrestrictFarmer = (farmer: Farmer) => {
    Alert.alert(
      'Remove Restriction',
      `Allow ${farmer.name} to access account again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unrestrict',
          onPress: async () => {
            try {
              setActingFarmerId(farmer.id);
              await apiPost(`/api/admin/farmers/${encodeURIComponent(farmer.id)}/unrestrict`, {});
              await fetchFarmers();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to remove restriction');
            } finally {
              setActingFarmerId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteFarmer = (farmer: Farmer) => {
    Alert.alert(
      'Delete Farmer Account',
      `Delete ${farmer.name}'s account and related data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActingFarmerId(farmer.id);
              await apiDelete(`/api/admin/farmers/${encodeURIComponent(farmer.id)}`);
              await fetchFarmers();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete farmer account');
            } finally {
              setActingFarmerId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.title, { color: tc.text }]}>Farmers</Text>
        <View style={[styles.headerBadge, { backgroundColor: tc.screenSecondary, borderColor: tc.primary }]}>
          <Text style={styles.headerBadgeText}>{farmers.length} Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchSection, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: tc.inputBg }]}>
          <Search color={tc.textMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: tc.text }]}
            placeholder="Search by name, location, or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={tc.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={tc.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFarmers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={[styles.loadingText, { color: tc.textMuted }]}>Loading farmers...</Text>
        </View>
      ) : (
        /* Farmers List */
        <ScrollView 
          style={[styles.farmersList, { backgroundColor: tc.screen }]} 
          contentContainerStyle={styles.farmersContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
              tintColor="#22C55E"
            />
          }
        >
          {filteredFarmers.map((farmer) => (
            <View key={farmer.id} style={[styles.farmerCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
              {/* Avatar and Name */}
              <View style={styles.farmerHeader}>
                <View style={[styles.avatar, { backgroundColor: tc.primary + '33' }]}>
                  <Text style={[styles.avatarText, { color: tc.primary }]}>
                    {farmer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.farmerInfo}>
                  <Text style={[styles.farmerName, { color: tc.text }]}>{farmer.name}</Text>
                  <Text style={[styles.farmerDate, { color: tc.textMuted }]}>
                    Joined: {farmer.registrationDate 
                      ? new Date(farmer.registrationDate).toLocaleDateString() 
                      : 'Unknown'}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.farmerDetails}>
                {farmer.email && (
                  <View style={styles.detailRow}>
                    <Mail color={tc.textMuted} size={16} />
                    <Text style={[styles.detailText, { color: tc.textSecondary }]}>{farmer.email}</Text>
                  </View>
                )}
                {farmer.phone && (
                  <View style={styles.detailRow}>
                    <Phone color={tc.textMuted} size={16} />
                    <Text style={[styles.detailText, { color: tc.textSecondary }]}>{farmer.phone}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <MapPin color="#22C55E" size={16} />
                  <Text style={[styles.detailText, styles.locationText, { color: tc.textSecondary }]}>
                    {getLocationDisplay(farmer)}
                  </Text>
                </View>
              </View>

              {/* Coordinates if available */}
              {farmer.latitude && farmer.longitude && (
                <View style={[styles.coordinatesContainer, { backgroundColor: tc.screenSecondary }]}>
                  <Text style={[styles.coordinatesLabel, { color: tc.textMuted }]}>Coordinates:</Text>
                  <Text style={[styles.coordinatesValue, { color: tc.text }]}>
                    {farmer.latitude.toFixed(6)}, {farmer.longitude.toFixed(6)}
                  </Text>
                </View>
              )}

              {isFarmerRestricted(farmer) && (
                <View style={styles.restrictedBanner}>
                  <Ban color="white" size={14} />
                  <Text style={styles.restrictedText}>
                    Restricted until {new Date(farmer.restrictedUntil as string).toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.actionsRow}>
                {isFarmerRestricted(farmer) ? (
                  <TouchableOpacity
                    style={styles.unrestrictButton}
                    onPress={() => handleUnrestrictFarmer(farmer)}
                    disabled={actingFarmerId === farmer.id}
                  >
                    <CheckCircle color="white" size={16} />
                    <Text style={styles.actionButtonText}>Unrestrict</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.restrictButton}
                      onPress={() => handleRestrictFarmer(farmer, 7)}
                      disabled={actingFarmerId === farmer.id}
                    >
                      <Shield color="white" size={16} />
                      <Text style={styles.actionButtonText}>Restrict 7d</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.restrictButton}
                      onPress={() => handleRestrictFarmer(farmer, 30)}
                      disabled={actingFarmerId === farmer.id}
                    >
                      <Ban color="white" size={16} />
                      <Text style={styles.actionButtonText}>Restrict 30d</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFarmer(farmer)}
                  disabled={actingFarmerId === farmer.id}
                >
                  <Trash2 color="white" size={16} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredFarmers.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Users color={tc.textMuted} size={48} />
              <Text style={[styles.emptyTitle, { color: tc.text }]}>No farmers found</Text>
              <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'No farmers have registered yet'}
              </Text>
            </View>
          )}
        </ScrollView>
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
  headerBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  headerBadgeText: {
    color: '#22C55E',
    fontWeight: '600',
    fontSize: 14,
  },
  searchSection: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  farmersList: {
    flex: 1,
  },
  farmersContent: {
    padding: 16,
    paddingBottom: 32,
  },
  farmerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  farmerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  farmerDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  farmerDetails: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  locationText: {
    color: '#22C55E',
    fontWeight: '500',
  },
  coordinatesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  coordinatesValue: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
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
  restrictedBanner: {
    marginTop: 12,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restrictedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restrictButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unrestrictButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
