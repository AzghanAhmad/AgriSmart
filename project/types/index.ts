export interface User {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'admin';
  phone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  profileImageUrl?: string | null;
  privacyShareLocation?: boolean;
  privacyShareCropData?: boolean;
  privacyAnalytics?: boolean;
  farmAcres?: number | null;
  farmCropTypes?: number | null;
  farmHealthScore?: number | null;
  farmMonthlyRevenue?: number | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  /** Persist name, phone, location to backend and local session */
  updateProfile: (data: {
    name: string;
    phone?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    farmAcres?: number | null;
    farmCropTypes?: number | null;
    farmHealthScore?: number | null;
    farmMonthlyRevenue?: number | null;
  }) => Promise<void>;
  /** Upload avatar from camera/gallery; updates user in session */
  uploadProfileImage: (localUri: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Reload user from GET /api/auth/me (e.g. after privacy changes) */
  refreshUser: () => Promise<void>;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'farmer' | 'admin';
  phone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
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