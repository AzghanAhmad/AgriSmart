import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Leaf } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { translate } from '@/utils/translations';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LocationPickerModal } from '@/components/LocationPickerModal';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    role: 'farmer' as 'farmer' | 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const { signup, isLoading } = useAuth();
  const { language } = useApp();
  const router = useRouter();

  const handleSignup = async () => {
    try {
      setError('');
      await signup(formData);
      // Navigation is handled in _layout.tsx based on user role
    } catch (err: any) {
      setError(err.message || translate('networkError', language));
      setShowError(true);
    }
  };

  const navigateToLogin = () => {
    router.push('/auth/login');
  };

  const updateFormData = (key: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    updateFormData('latitude', location.latitude);
    updateFormData('longitude', location.longitude);
    updateFormData('location', location.address);
  };

  if (isLoading) {
    return <LoadingSpinner text={translate('loading', language)} />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Leaf color="#22C55E" size={48} />
            <Text style={styles.logoText}>AgriSmart</Text>
          </View>
          <Text style={styles.subtitle}>
            Join the smart farming revolution
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <User color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('name', language)}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Mail color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('email', language)}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Phone color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('phone', language)}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <MapPin color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('location', language)}
                value={formData.location}
                onChangeText={(value) => updateFormData('location', value)}
              />
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => setShowLocationPicker(true)}
              >
                <MapPin color="#22C55E" size={20} fill="#22C55E" />
              </TouchableOpacity>
            </View>
            {formData.latitude && formData.longitude && (
              <Text style={styles.coordsText}>
                📍 {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
              </Text>
            )}
          </View>

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>{translate('role', language)}</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'farmer' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'farmer')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'farmer' && styles.roleButtonTextActive
                ]}>
                  {translate('farmer', language)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'admin' && styles.roleButtonActive
                ]}
                onPress={() => updateFormData('role', 'admin')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'admin' && styles.roleButtonTextActive
                ]}>
                  {translate('admin', language)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Lock color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('password', language)}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff color="#6B7280" size={20} />
                ) : (
                  <Eye color="#6B7280" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Lock color="#6B7280" size={20} />
              <TextInput
                style={styles.input}
                placeholder={translate('confirmPassword', language)}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                {showConfirmPassword ? (
                  <EyeOff color="#6B7280" size={20} />
                ) : (
                  <Eye color="#6B7280" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.signupButtonText}>
              {translate('signup', language)}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>
                {translate('login', language)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ErrorAlert
        visible={showError}
        message={error}
        onClose={() => setShowError(false)}
        onRetry={handleSignup}
      />

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        initialLocation={
          formData.latitude && formData.longitude
            ? { latitude: formData.latitude, longitude: formData.longitude }
            : undefined
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22C55E',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 4,
  },
  mapButton: {
    padding: 8,
    marginLeft: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  coordsText: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 4,
    marginLeft: 36,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#22C55E',
  },
  signupButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 16,
  },
  loginLink: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
});