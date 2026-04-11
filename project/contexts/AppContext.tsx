import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CropDisease, FarmingTask, SubsidyProgram } from '@/types';
import { useAuth } from './AuthContext';
import { apiGet } from '@/utils/api';

interface AppContextType {
  language: 'en' | 'ur';
  setLanguage: (lang: 'en' | 'ur') => void;
  cropDiseases: CropDisease[];
  addRecentDetection: (d: CropDisease) => void;
  removeRecentDetection: (id: string) => void;
  farmingTasks: FarmingTask[];
  subsidyPrograms: SubsidyProgram[];
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [isOffline, setIsOffline] = useState(false);
  const [recentDetections, setRecentDetections] = useState<CropDisease[]>([]);
  const { user } = useAuth();

  const mockCropDiseases: CropDisease[] = [
    {
      id: '1',
      name: 'Wheat Rust',
      severity: 'high',
      treatment: 'Apply fungicide and improve air circulation',
      imageUrl: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg',
      detectedAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Rice Blast',
      severity: 'medium',
      treatment: 'Use resistant varieties and proper water management',
      imageUrl: 'https://images.pexels.com/photos/2589457/pexels-photo-2589457.jpeg',
      detectedAt: '2024-01-14'
    }
  ];

  const mockFarmingTasks: FarmingTask[] = [
    {
      id: '1',
      title: 'Water the wheat field',
      description: 'Morning irrigation for sector A',
      dueDate: '2024-01-16',
      completed: false,
      priority: 'high'
    },
    {
      id: '2',
      title: 'Apply fertilizer to rice',
      description: 'Nitrogen fertilizer for rice field B',
      dueDate: '2024-01-17',
      completed: true,
      priority: 'medium'
    }
  ];

  const mockSubsidyPrograms: SubsidyProgram[] = [
    {
      id: '1',
      title: 'Kisan Card Subsidy',
      description: 'Financial assistance for small farmers',
      amount: 50000,
      deadline: '2024-03-31',
      eligibilityCriteria: ['Land ownership < 5 acres', 'Annual income < PKR 200,000']
    },
    {
      id: '2',
      title: 'Organic Farming Grant',
      description: 'Support for organic farming practices',
      amount: 75000,
      deadline: '2024-06-30',
      eligibilityCriteria: ['Certified organic farmer', 'Minimum 2 years experience']
    }
  ];

  const addRecentDetection = (d: CropDisease) => {
    setRecentDetections(prev => [d, ...prev].slice(0, 20));
  };

  const removeRecentDetection = (id: string) => {
    setRecentDetections(prev => prev.filter(x => x.id !== id));
  };

  useEffect(() => {
    const loadRecent = async () => {
      if (!user?.id) return;
      try {
        const data = await apiGet<{ detections: Array<{ id: string; name: string; severity: string; treatment: string; imageUrl: string; detectedAt: string }> }>(
          `/api/farmer/detections/recent?farmerId=${encodeURIComponent(user.id)}`
        );
        const mapped: CropDisease[] = (data.detections || []).map(d => ({
          id: d.id,
          name: d.name,
          severity: d.severity as any,
          treatment: d.treatment || '',
          imageUrl: d.imageUrl,
          detectedAt: d.detectedAt,
        }));
        setRecentDetections(mapped);
      } catch (e) {
        // keep mocks on failure
      }
    };
    loadRecent();
  }, [user?.id]);

  const value: AppContextType = {
    language,
    setLanguage,
    cropDiseases: user?.id ? recentDetections : mockCropDiseases,
    addRecentDetection,
    removeRecentDetection,
    farmingTasks: mockFarmingTasks,
    subsidyPrograms: mockSubsidyPrograms,
    isOffline,
    setIsOffline
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};