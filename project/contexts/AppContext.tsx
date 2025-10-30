import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CropDisease, FarmingTask, SubsidyProgram } from '@/types';

interface AppContextType {
  language: 'en' | 'ur';
  setLanguage: (lang: 'en' | 'ur') => void;
  cropDiseases: CropDisease[];
  addRecentDetection: (d: CropDisease) => void;
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

  const value: AppContextType = {
    language,
    setLanguage,
    cropDiseases: recentDetections.length ? recentDetections : mockCropDiseases,
    addRecentDetection,
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