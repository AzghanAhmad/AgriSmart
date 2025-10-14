import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContextType, User, SignupData } from '@/types';

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

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('authToken');
      
      if (userData && token) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock user data - in real app, this would come from API
      const mockUser: User = {
        id: '1',
        name: email === 'admin@agrismart.com' ? 'Admin User' : 'Farmer Ali',
        email,
        role: email === 'admin@agrismart.com' ? 'admin' : 'farmer',
        phone: '+92300123456',
        location: 'Punjab, Pakistan'
      };

      const mockToken = 'mock_jwt_token_' + Date.now();

      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      await AsyncStorage.setItem('authToken', mockToken);
      
      setUser(mockUser);
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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        role,
        phone: userData.phone,
        location: userData.location
      };

      const mockToken = 'mock_jwt_token_' + Date.now();

      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      await AsyncStorage.setItem('authToken', mockToken);
      
      setUser(newUser);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};