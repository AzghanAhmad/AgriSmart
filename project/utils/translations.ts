export const translations = {
  en: {
    // Auth
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Full Name',
    phone: 'Phone Number',
    location: 'Location',
    role: 'Role',
    farmer: 'Farmer',
    admin: 'Admin',
    forgotPassword: 'Forgot Password?',
    
    // Dashboard
    welcome: 'Welcome',
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    cropHealthSummary: 'Crop Health Summary',
    weeklyYieldTrend: 'Weekly Yield Trend',
    diseaseIncidence: 'Disease Incidence',
    
    // Actions
    scanCrop: 'Scan Crop',
    cureGuidance: 'Cure Guidance',
    farmingSchedule: 'Farming Schedule',
    diseaseHeatmap: 'Disease Heatmap',
    chatbot: 'AI Assistant',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    
    // Errors
    networkError: 'Network error, please try again',
    invalidCredentials: 'Invalid credentials',
    emailAlreadyRegistered: 'Email already registered',
    weakPassword: 'Weak password',
    profileUpdateError: 'Unable to update profile'
  },
  ur: {
    // Auth
    login: 'لاگ ان',
    signup: 'رجسٹر',
    email: 'ای میل',
    password: 'پاس ورڈ',
    confirmPassword: 'پاس ورڈ کی تصدیق',
    name: 'پورا نام',
    phone: 'فون نمبر',
    location: 'مقام',
    role: 'کردار',
    farmer: 'کسان',
    admin: 'ایڈمن',
    forgotPassword: 'پاس ورڈ بھول گئے؟',
    
    // Dashboard
    welcome: 'خوش آمدید',
    goodMorning: 'صبح بخیر',
    goodAfternoon: 'دوپہر بخیر',
    goodEvening: 'شام بخیر',
    cropHealthSummary: 'فصل کی صحت کا خلاصہ',
    weeklyYieldTrend: 'ہفتہ وار پیداوار کا رجحان',
    diseaseIncidence: 'بیماری کی موجودگی',
    
    // Actions
    scanCrop: 'فصل اسکین کریں',
    cureGuidance: 'علاج کی رہنمائی',
    farmingSchedule: 'کاشتکاری کا شیڈول',
    diseaseHeatmap: 'بیماری کا نقشہ',
    chatbot: 'AI مددگار',
    
    // Common
    save: 'محفوظ کریں',
    cancel: 'منسوخ',
    delete: 'حذف کریں',
    edit: 'ترمیم',
    loading: 'لوڈ ہو رہا ہے...',
    error: 'خرابی',
    success: 'کامیابی',
    retry: 'دوبارہ کوشش',
    
    // Errors
    networkError: 'نیٹ ورک کی خرابی، براہ کرم دوبارہ کوشش کریں',
    invalidCredentials: 'غلط لاگ ان تفصیلات',
    emailAlreadyRegistered: 'ای میل پہلے سے رجسٹرڈ ہے',
    weakPassword: 'کمزور پاس ورڈ',
    profileUpdateError: 'پروفائل اپڈیٹ نہیں ہو سکا'
  }
};

export type TranslationKeys = keyof typeof translations.en;

export const translate = (key: TranslationKeys, language: 'en' | 'ur'): string => {
  return translations[language][key] || key;
};