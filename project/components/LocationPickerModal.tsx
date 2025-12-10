import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { X, MapPin, Search, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

export function LocationPickerModal({
  visible,
  onClose,
  onSelect,
  initialLocation,
}: LocationPickerModalProps) {
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 30.3753, // Pakistan center
    longitude: initialLocation?.longitude || 69.3451,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: initialLocation?.latitude || 30.3753,
    longitude: initialLocation?.longitude || 69.3451,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Dynamically import MapView on native only
  const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
  const Marker = Platform.OS !== 'web' ? require('react-native-maps').Marker : null;

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerCoordinate({ latitude, longitude });
    
    // Reverse geocode to get address
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address) {
        const name = [address.city, address.region, address.country]
          .filter(Boolean)
          .join(', ');
        setLocationName(name || 'Selected Location');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setLocationName('Selected Location');
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await Location.geocodeAsync(searchQuery);
      
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setMarkerCoordinate({ latitude, longitude });
        setLocationName(searchQuery);
      } else {
        Alert.alert('Not Found', 'Location not found. Try a different search term.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarkerCoordinate({ latitude, longitude });
      
      // Get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address) {
        const name = [address.city, address.region, address.country]
          .filter(Boolean)
          .join(', ');
        setLocationName(name || 'Current Location');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleConfirm = () => {
    onSelect({
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,
      address: locationName || 'Selected Location',
    });
    onClose();
  };

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.webMessage}>
              Map picker is not available on web.{'\n'}
              Please enter location manually or use a mobile device.
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
            <X color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color="#6B7280" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchLocation}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleCurrentLocation}
          >
            <Navigation color="#22C55E" size={20} />
          </TouchableOpacity>
        </View>

        {/* Map */}
        {MapView && Marker && (
          <MapView
            style={styles.map}
            region={region}
            onPress={handleMapPress}
            onRegionChangeComplete={setRegion}
          >
            <Marker
              coordinate={markerCoordinate}
              draggable
              onDragEnd={(e: any) => handleMapPress({ nativeEvent: e })}
            >
              <View style={styles.markerContainer}>
                <MapPin color="#EF4444" size={32} fill="#EF4444" />
              </View>
            </Marker>
          </MapView>
        )}

        {/* Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationDetails}>
            <MapPin color="#22C55E" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName}>
                {locationName || 'Tap on map to select location'}
              </Text>
              <Text style={styles.coordinates}>
                {markerCoordinate.latitude.toFixed(4)}, {markerCoordinate.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            💡 Tap anywhere on the map or drag the pin to select your location
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  webMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  currentLocationButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  instructionText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

