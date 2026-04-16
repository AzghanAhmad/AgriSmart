import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { clampToPakistan, geocodeLocationInPakistan, isInPakistan } from '@/utils/pakistanGeocode';

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
  /** When true, map is centered on Pakistan and taps/drags are clamped inside the country. */
  constrainToPakistan?: boolean;
  title?: string;
}

const PK_CENTER = { latitude: 30.3753, longitude: 69.3451 };

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function buildRegionFromInitial(
  initialLocation: LocationPickerModalProps['initialLocation'],
  constrainToPakistan: boolean,
): { region: Region; marker: { latitude: number; longitude: number } } {
  const rawLat = initialLocation?.latitude ?? PK_CENTER.latitude;
  const rawLng = initialLocation?.longitude ?? PK_CENTER.longitude;
  const c = constrainToPakistan ? clampToPakistan(rawLat, rawLng) : { latitude: rawLat, longitude: rawLng };
  return {
    region: {
      latitude: c.latitude,
      longitude: c.longitude,
      latitudeDelta: constrainToPakistan ? 4.5 : 10,
      longitudeDelta: constrainToPakistan ? 4.2 : 10,
    },
    marker: c,
  };
}

export function LocationPickerModal({
  visible,
  onClose,
  onSelect,
  initialLocation,
  constrainToPakistan = false,
  title = 'Select Location',
}: LocationPickerModalProps) {
  const mapRef = useRef<any>(null);
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: PK_CENTER.latitude,
    longitude: PK_CENTER.longitude,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  /** Uncontrolled map: use initialRegion only (no `region` prop) so zoom/pan keeps native labels. */
  const mapInitialRegion = useMemo(() => {
    if (!visible) {
      return {
        latitude: PK_CENTER.latitude,
        longitude: PK_CENTER.longitude,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }
    return buildRegionFromInitial(initialLocation, constrainToPakistan).region;
  }, [visible, initialLocation?.latitude, initialLocation?.longitude, constrainToPakistan]);

  useEffect(() => {
    if (!visible) return;
    const { marker } = buildRegionFromInitial(initialLocation, constrainToPakistan);
    setMarkerCoordinate(marker);
    setLocationName('');
    setSearchQuery('');
  }, [visible, initialLocation?.latitude, initialLocation?.longitude, constrainToPakistan]);

  const animateMapTo = (next: Region, delayMs = 0) => {
    const run = () => {
      const map = mapRef.current;
      if (map && typeof map.animateToRegion === 'function') {
        map.animateToRegion(next, 450);
      }
    };
    if (delayMs > 0) {
      setTimeout(run, delayMs);
    } else {
      requestAnimationFrame(() => setTimeout(run, 50));
    }
  };

  // Dynamically import MapView on native only
  const MapView = Platform.OS !== 'web' ? require('react-native-maps').default : null;
  const Marker = Platform.OS !== 'web' ? require('react-native-maps').Marker : null;

  const applyCoordinate = async (latitude: number, longitude: number) => {
    const c = constrainToPakistan ? clampToPakistan(latitude, longitude) : { latitude, longitude };
    setMarkerCoordinate(c);
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: c.latitude,
        longitude: c.longitude,
      });
      if (address) {
        const name = [address.city, address.region, address.country].filter(Boolean).join(', ');
        setLocationName(name || 'Selected Location');
      } else {
        setLocationName('Selected Location');
      }
    } catch {
      setLocationName('Selected Location');
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    await applyCoordinate(latitude, longitude);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    void applyCoordinate(latitude, longitude);
  };

  const handleSearchLocation = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    try {
      setIsSearching(true);
      let latitude: number;
      let longitude: number;
      let label = q;

      // 1) Pakistan profile picker: OpenStreetMap Nominatim (works without Google Play geocoder)
      if (constrainToPakistan) {
        const g = await geocodeLocationInPakistan(q);
        if (g) {
          latitude = g.lat;
          longitude = g.lng;
          label = g.label;
        } else {
          // 2) Fallback: expo geocoder with explicit country (some devices)
          try {
            const results = await Location.geocodeAsync(`${q}, Pakistan`);
            if (results.length === 0) {
              Alert.alert(
                'Not found',
                'Try a major city (e.g. Lahore, Karachi, Islamabad) or check your internet connection.',
              );
              return;
            }
            latitude = results[0].latitude;
            longitude = results[0].longitude;
          } catch {
            Alert.alert(
              'Not found',
              'Could not search this place. Check internet and try a city name in Pakistan.',
            );
            return;
          }
        }
      } else {
        const results = await Location.geocodeAsync(q);
        if (results.length === 0) {
          Alert.alert('Not Found', 'Location not found. Try a different search term.');
          return;
        }
        latitude = results[0].latitude;
        longitude = results[0].longitude;
      }

      const c = constrainToPakistan ? clampToPakistan(latitude, longitude) : { latitude, longitude };
      if (constrainToPakistan && !isInPakistan(latitude, longitude)) {
        Alert.alert('Outside Pakistan', 'Pick a place inside Pakistan. Search again or tap the map.');
        return;
      }

      const next: Region = {
        latitude: c.latitude,
        longitude: c.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      };
      setMarkerCoordinate({ latitude: c.latitude, longitude: c.longitude });
      setLocationName(label);
      animateMapTo(next, 120);
    } catch (error: any) {
      Alert.alert('Search failed', error?.message || 'Could not search. Check internet and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      const servicesOk = await Location.hasServicesEnabledAsync();
      if (!servicesOk) {
        Alert.alert(
          'Location services off',
          'Turn on Location (GPS) in your device settings, then try again.',
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow location access for AgriSmart in system settings to use your current position.',
        );
        return;
      }

      let loc: Location.LocationObject | null = null;
      const tryFix = async () => {
        try {
          return await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          });
        } catch {
          try {
            return await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
              mayShowUserSettingsDialog: true,
            });
          } catch {
            return null;
          }
        }
      };
      loc = await tryFix();
      if (!loc) {
        loc = await Location.getLastKnownPositionAsync({
          maxAge: 300000,
          requiredAccuracy: 10000,
        });
      }

      if (!loc) {
        Alert.alert(
          'Could not get GPS',
          'Move near a window or outdoors, enable GPS, and try again. You can still tap the map to set your pin.',
        );
        return;
      }

      const { latitude, longitude } = loc.coords;

      if (constrainToPakistan && !isInPakistan(latitude, longitude)) {
        Alert.alert(
          'Outside Pakistan',
          'Your GPS position is outside Pakistan. Pan the map and drop the pin inside the country.',
        );
        return;
      }

      const c = constrainToPakistan ? clampToPakistan(latitude, longitude) : { latitude, longitude };
      const next: Region = {
        latitude: c.latitude,
        longitude: c.longitude,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      };
      setMarkerCoordinate({ latitude: c.latitude, longitude: c.longitude });
      animateMapTo(next, 120);

      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: c.latitude,
          longitude: c.longitude,
        });
        if (address) {
          const name = [address.city, address.region, address.country].filter(Boolean).join(', ');
          setLocationName(name || 'Current location');
        }
      } catch {
        setLocationName('Current location');
      }
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      Alert.alert(
        'Location error',
        msg.includes('timeout') || msg.includes('unavailable')
          ? 'GPS took too long. Try again in an open area or set your pin on the map.'
          : 'Could not read your location. Check GPS permission and try again.',
      );
    }
  };

  const handleConfirm = () => {
    const c = constrainToPakistan
      ? clampToPakistan(markerCoordinate.latitude, markerCoordinate.longitude)
      : markerCoordinate;
    if (constrainToPakistan && !isInPakistan(c.latitude, c.longitude)) {
      Alert.alert('Invalid', 'Pin must be inside Pakistan.');
      return;
    }
    onSelect({
      latitude: c.latitude,
      longitude: c.longitude,
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
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search color="#6B7280" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or area..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchLocation}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={handleSearchLocation}
              disabled={isSearching}
              accessibilityLabel="Search"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.searchGo}>{isSearching ? '…' : 'Go'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleCurrentLocation}
            accessibilityLabel="Use current location"
          >
            <Navigation color="#22C55E" size={20} />
          </TouchableOpacity>
        </View>

        {/* Map: uncontrolled (initialRegion only) so city/road labels show when zooming */}
        {visible && MapView && Marker && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapInitialRegion}
            mapType="standard"
            rotateEnabled
            pitchEnabled
            scrollEnabled
            zoomEnabled
            showsBuildings
            {...(Platform.OS === 'ios'
              ? { showsPointsOfInterest: true, showsScale: true }
              : { maxZoomLevel: 20, minZoomLevel: 2 })}
            onPress={handleMapPress}
          >
            <Marker
              coordinate={markerCoordinate}
              draggable
              onDragEnd={handleMarkerDragEnd}
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
            {constrainToPakistan
              ? 'Pinch to zoom — city names appear as you zoom in. Tap or drag the pin, then confirm.'
              : 'Pinch to zoom for place names. Tap or drag the pin to select your location.'}
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
  searchGo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    paddingVertical: 4,
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

