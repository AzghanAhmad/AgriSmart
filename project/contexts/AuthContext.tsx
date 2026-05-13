import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContextType, User, SignupData } from '@/types';
import { apiGet, apiPost, apiPut, apiDelete, apiUploadProfilePhoto, setUnauthorizedHandler } from '@/utils/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setUser(null);
      setIsLoading(false);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        try {
          const me = await apiGet<User>('/api/auth/me');
          setUser(me);
          await AsyncStorage.setItem('user', JSON.stringify(me));
        } catch {
          // Token is invalid or expired — expected after idle time; clear and show login (no noisy logs)
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('authToken');
          setUser(null);
        }
      } else if (userData) {
        // No token but have user data - try to use it (offline mode)
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          // Invalid user data - clear it
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // Clear potentially corrupted data
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      setIsLoading(true);

      const resp = await apiPost<{ token: string; user: User }>(
        '/api/auth/login',
        { email, password }
      );

      await AsyncStorage.setItem('user', JSON.stringify(resp.user));
      await AsyncStorage.setItem('authToken', resp.token);
      setUser(resp.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<void> => {
    try {
      const { name, email, password, confirmPassword, role } = userData;

      if (!name || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!validatePassword(password)) {
        throw new Error('Password must be at least 8 characters with uppercase, number, and special character');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      setIsLoading(true);

      const resp = await apiPost<{ token: string; user: User }>(
        '/api/auth/signup',
        { 
          name, 
          email, 
          password, 
          phone: userData.phone, 
          location: userData.location,
          latitude: userData.latitude,
          longitude: userData.longitude,
          role 
        }
      );

      await AsyncStorage.setItem('user', JSON.stringify(resp.user));
      await AsyncStorage.setItem('authToken', resp.token);
      setUser(resp.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const uid = user?.id;
      if (uid) {
        await AsyncStorage.removeItem(`agri_chatbot_conversation_${uid}`);
      }
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateProfile = async (data: {
    name: string;
    phone?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    farmAcres?: number | null;
    farmCropTypes?: number | null;
    farmHealthScore?: number | null;
    farmMonthlyRevenue?: number | null;
  }): Promise<void> => {
    const body: Record<string, unknown> = {
      name: data.name.trim(),
      phone: (data.phone || '').trim() || undefined,
      location: (data.location || '').trim() || undefined,
    };
    if (data.latitude !== undefined) body.latitude = data.latitude;
    if (data.longitude !== undefined) body.longitude = data.longitude;
    if (data.farmAcres !== undefined) body.farmAcres = data.farmAcres;
    if (data.farmCropTypes !== undefined) body.farmCropTypes = data.farmCropTypes;
    if (data.farmHealthScore !== undefined) body.farmHealthScore = data.farmHealthScore;
    if (data.farmMonthlyRevenue !== undefined) body.farmMonthlyRevenue = data.farmMonthlyRevenue;
    const updated = await apiPut<User>('/api/auth/profile', body);
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  };

  const uploadProfileImage = async (localUri: string): Promise<void> => {
    const updated = await apiUploadProfilePhoto(localUri);
    setUser(updated as User);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiPost('/api/auth/change-password', { currentPassword, newPassword });
  };

  const logoutAllDevices = async (): Promise<void> => {
    await apiPost('/api/auth/logout-all');
    await logout();
  };

  const deleteAccount = async (): Promise<void> => {
    await apiDelete('/api/auth/account');
    await logout();
  };

  const refreshUser = async (): Promise<void> => {
    const me = await apiGet<User>('/api/auth/me');
    setUser(me);
    await AsyncStorage.setItem('user', JSON.stringify(me));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    uploadProfileImage,
    changePassword,
    logoutAllDevices,
    deleteAccount,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};