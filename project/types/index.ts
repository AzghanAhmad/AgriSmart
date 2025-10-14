export interface User {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'admin';
  phone?: string;
  location?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'farmer' | 'admin';
  phone?: string;
  location?: string;
}

export interface CropDisease {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  treatment: string;
  imageUrl: string;
  detectedAt: string;
}

export interface FarmingTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface SubsidyProgram {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  eligibilityCriteria: string[];
}