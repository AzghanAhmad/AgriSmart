import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Calendar,
  Clock,
  CircleCheck as CheckCircle,
  RefreshCw,
  Cloud,
  Bug,
  MapPin,
  Settings,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { translate } from '@/utils/translations';
import { getApiBaseUrl } from '@/utils/env';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTaskDateKey(dueDate?: string): string {
  if (!dueDate) return '';
  const datePart = dueDate.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  const parsed = new Date(dueDate);
  return Number.isNaN(parsed.getTime()) ? datePart : formatLocalDateKey(parsed);
}

function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function getDateKeyOffset(daysFromToday: number): string {
  const today = new Date();
  return formatLocalDateKey(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday)
  );
}

function daysBetweenDateKeys(dateKey: string, baseDateKey: string): number {
  return Math.round(
    (parseLocalDateKey(dateKey).getTime() - parseLocalDateKey(baseDateKey).getTime()) / DAY_MS
  );
}

interface ScheduleTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  source?: string;
  completed: boolean;
}

interface DayTasks {
  date: string;
  dayName: string;
  tasks: ScheduleTask[];
}

interface ScheduleTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  source?: string;
  completed: boolean;
  cropType?: string; // Add crop type to task interface
}

type CropType = 'wheat' | 'rice' | 'cotton';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const { language } = useApp();
  const { colors: tc } = useTheme();
  const router = useRouter();
  const dateLocale = language === 'ur' ? 'ur-PK' : 'en-US';
  const params = useLocalSearchParams<{ cropType?: string; diseaseName?: string; fromCureGuidance?: string }>();
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [selectedCrop, setSelectedCrop] = useState<CropType>('wheat'); // Default to wheat
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dailyProgress, setDailyProgress] = useState<number>(0);

  useEffect(() => {
    loadSchedule();
    checkDailyReset();
  }, [user]);

  useEffect(() => {
    calculateDailyProgress();
  }, [tasks]);

  const checkDailyReset = async () => {
    // Check if it's a new day - reset progress if needed
    try {
      const lastReset = await AsyncStorage.getItem('schedule_last_reset');
      const today = formatLocalDateKey();
      
      if (lastReset !== today) {
        // Reset all tasks for today
        setTasks(prev => prev.map(task => {
          const taskDate = getTaskDateKey(task.dueDate);
          if (taskDate === today) {
            return { ...task, completed: false };
          }
          return task;
        }));
        await AsyncStorage.setItem('schedule_last_reset', today);
      }
    } catch (error) {
      console.error('Error checking daily reset:', error);
    }
  };

  const calculateDailyProgress = () => {
    const today = formatLocalDateKey();
    const todayTasks = tasks.filter(t => getTaskDateKey(t.dueDate) === today);
    if (todayTasks.length === 0) {
      setDailyProgress(0);
      return;
    }
    const completed = todayTasks.filter(t => t.completed).length;
    setDailyProgress((completed / todayTasks.length) * 100);
  };

  const loadSchedule = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const today = formatLocalDateKey();
      
      // Get current week's schedule
      const response = await fetch(
        `${API_BASE_URL}/api/farmer/schedule/current?farmerId=${user.id}&weekNumber=week1`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Filter to only show 1 week (7 days from today)
        // Try to infer crop type from schedule or use default
        const weekTasks = (data.tasks || []).map((task: ScheduleTask) => ({
          ...task,
          cropType: task.cropType || 'wheat', // Default to wheat if not specified
        })).filter((task: ScheduleTask) => {
          const taskDate = getTaskDateKey(task.dueDate);
          const daysDiff = daysBetweenDateKeys(taskDate, today);
          return daysDiff >= 0 && daysDiff < 7;
        });
        setTasks(weekTasks);
      } else {
        // Generate new schedule if none exists
        await generateSchedule();
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const generateSchedule = async (cropType?: string, diseaseNameOverride?: string) => {
    if (!user?.id) return;
    
    const crop = cropType || selectedCrop; // Use selected crop (always has a value now)
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      
      // Use explicit disease from cure guidance when provided; otherwise infer from recent detections.
      let diseaseName = diseaseNameOverride || null;
      if (!diseaseName) {
        try {
          const detectionsResponse = await fetch(
            `${API_BASE_URL}/api/farmer/detections/recent?farmerId=${user.id}`
          );
          if (detectionsResponse.ok) {
            const detectionsData = await detectionsResponse.json();
            const cropDetection = detectionsData.detections?.find(
              (d: any) => d.cropType?.toLowerCase() === crop.toLowerCase()
            );
            // API returns `name` (see /detections/recent); some clients use `diseaseName`
            const fromDetection =
              cropDetection?.diseaseName ?? cropDetection?.name ?? null;
            if (fromDetection && fromDetection !== 'Unknown Disease') {
              diseaseName = fromDetection;
            }
          }
        } catch (e) {
          console.log('Could not fetch disease name:', e);
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/api/farmer/schedule/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerId: user.id,
          cropType: crop,
          location: user.location || 'Islamabad',
          latitude: user.latitude,
          longitude: user.longitude,
          weekNumber: 'week1',
          startDate: formatLocalDateKey(),
          diseaseName: diseaseName,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const today = formatLocalDateKey();
        const weekTasks = (data.tasks || []).map((task: ScheduleTask) => ({
          ...task,
          cropType: crop, // Add crop type to each task
        })).filter((task: ScheduleTask) => {
          const taskDate = getTaskDateKey(task.dueDate);
          const daysDiff = daysBetweenDateKeys(taskDate, today);
          return daysDiff >= 0 && daysDiff < 7;
        });
        setTasks(weekTasks);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

  // If opened from Cure Guidance, generate schedule for the selected disease/crop
  useEffect(() => {
    const fromCure = String(params.fromCureGuidance || '') === '1';
    if (!fromCure || !user?.id) return;
    const crop = (params.cropType || selectedCrop || 'wheat').toLowerCase() as CropType;
    const disease = typeof params.diseaseName === 'string' ? params.diseaseName : undefined;
    setSelectedCrop(crop);
    void generateSchedule(crop, disease);
  }, [params.fromCureGuidance, params.cropType, params.diseaseName, user?.id]);

  const toggleTaskCompletion = async (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    // In production, update on backend
    console.log('Task completion toggled:', taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'disease_management': return Bug;
      case 'weather_advisory': return Cloud;
      case 'location_specific': return MapPin;
      case 'maintenance': return Settings;
      default: return Calendar;
    }
  };

  const getCategoryName = (category?: string) => {
    switch (category) {
      case 'disease_management':
        return translate('schedCatDisease', language);
      case 'weather_advisory':
        return translate('schedCatWeather', language);
      case 'location_specific':
        return translate('schedCatLocation', language);
      case 'maintenance':
        return translate('schedCatMaintenance', language);
      default:
        return translate('schedCatGeneral', language);
    }
  };

  const getWeekDays = (): DayTasks[] => {
    const days: DayTasks[] = [];
    
    // Start from tomorrow (day after today)
    for (let i = 1; i <= 7; i++) {
      const dateStr = getDateKeyOffset(i);
      const date = parseLocalDateKey(dateStr);
      const dayName = date.toLocaleDateString(dateLocale, { weekday: 'long' });
      
      const dayTasks = tasks.filter(t => getTaskDateKey(t.dueDate) === dateStr);
      days.push({
        date: dateStr,
        dayName,
        tasks: dayTasks,
      });
    }
    
    return days;
  };

  const filterTasks = (taskList: ScheduleTask[]) => {
    const today = formatLocalDateKey();
    let filtered = taskList;
    
    // Filter by crop type (always filter since selectedCrop is never null now)
    filtered = filtered.filter(task => 
      task.cropType?.toLowerCase() === selectedCrop?.toLowerCase()
    );
    
    // Filter by tab
    switch (selectedTab) {
      case 'today':
        return filtered.filter(task => getTaskDateKey(task.dueDate) === today);
      case 'upcoming':
        return filtered.filter(task => {
          const taskDate = getTaskDateKey(task.dueDate);
          return taskDate > today && !task.completed;
        });
      case 'completed':
        return filtered.filter(task => task.completed);
      default:
        return filtered;
    }
  };
  
  const handleCropSelect = async (crop: CropType) => {
    if (!crop) return; // Ensure crop is never null
    setSelectedCrop(crop);
    // If crop is selected and no tasks exist for that crop, generate schedule
    const cropTasks = tasks.filter(t => t.cropType?.toLowerCase() === crop.toLowerCase());
    if (cropTasks.length === 0) {
      await generateSchedule(crop);
    }
  };

  const groupTasksByCategory = (taskList: ScheduleTask[]) => {
    const grouped: { [key: string]: ScheduleTask[] } = {};
    taskList.forEach(task => {
      const category = task.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(task);
    });
    return grouped;
  };

  const filteredTasks = filterTasks(tasks);
  const groupedTasks = groupTasksByCategory(filteredTasks);
  const weekDays = getWeekDays();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadSchedule();
    } catch (error) {
      console.error('Error refreshing schedule:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadSchedule]);

  if (isLoading) {
    return <LoadingSpinner text={translate('scheduleLoadingSchedule', language)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.screen }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <View>
          <Text style={[styles.title, { color: tc.text }]}>{translate('farmingSchedule', language)}</Text>
          <Text style={[styles.subtitle, { color: tc.textMuted }]}>{translate('scheduleSubtitle', language)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: tc.screenSecondary }]}
            onPress={handleRefresh}
          >
            <RefreshCw color={tc.primary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Crop Filter Bar */}
      <View style={[styles.cropFilterContainer, { backgroundColor: tc.headerBg, borderBottomColor: tc.border }]}>
        <Text style={[styles.cropFilterLabel, { color: tc.textSecondary }]}>{translate('scheduleFilterByCrop', language)}</Text>
        <View style={styles.cropFilterButtons}>
          <TouchableOpacity
            style={[
              styles.cropFilterButton,
              selectedCrop === 'wheat' && styles.cropFilterButtonActive,
            ]}
            onPress={() => handleCropSelect('wheat')}
          >
            <Text
              style={[
                styles.cropFilterButtonText,
                selectedCrop === 'wheat' && styles.cropFilterButtonTextActive,
              ]}
            >
              {translate('cropWheat', language)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cropFilterButton,
              selectedCrop === 'rice' && styles.cropFilterButtonActive,
            ]}
            onPress={() => handleCropSelect('rice')}
          >
            <Text
              style={[
                styles.cropFilterButtonText,
                selectedCrop === 'rice' && styles.cropFilterButtonTextActive,
              ]}
            >
              {translate('cropRice', language)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cropFilterButton,
              selectedCrop === 'cotton' && styles.cropFilterButtonActive,
            ]}
            onPress={() => handleCropSelect('cotton')}
          >
            <Text
              style={[
                styles.cropFilterButtonText,
                selectedCrop === 'cotton' && styles.cropFilterButtonTextActive,
              ]}
            >
              {translate('cropCotton', language)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons - Prominent at top */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.secondaryActionButton,
            { backgroundColor: tc.card, borderColor: tc.primary, borderWidth: 2 },
          ]}
          onPress={() => router.push('/weather' as any)}
          activeOpacity={0.8}
        >
          <Cloud color={tc.primary} size={20} />
          <Text style={[styles.secondaryActionButtonText, { color: tc.primaryDark }]}>
            {translate('scheduleSevenDayWeather', language)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Daily Progress */}
      <View style={[styles.progressCard, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
        <Text style={[styles.progressTitle, { color: tc.text }]}>{translate('scheduleTodayProgress', language)}</Text>
        <View style={[styles.progressBar, { backgroundColor: tc.border }]}>
          <View style={[styles.progressFill, { width: `${dailyProgress}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: tc.textMuted }]}>
          {Math.round(dailyProgress)}% {translate('scheduleCompletedTodaySuffix', language)}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: tc.headerBg, borderBottomWidth: 1, borderBottomColor: tc.border }]}>
        {(['today', 'upcoming', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && { borderBottomColor: tc.primary, borderBottomWidth: 2 }]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: tc.textMuted },
                selectedTab === tab && { color: tc.primary, fontWeight: '700' as const },
              ]}
            >
              {tab === 'today'
                ? translate('scheduleTabToday', language)
                : tab === 'upcoming'
                  ? translate('scheduleTabUpcoming', language)
                  : translate('scheduleTabCompleted', language)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: tc.screen }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={tc.primary} />
        }
      >
        {/* Upcoming Tab - Show Days in Grid */}
        {selectedTab === 'upcoming' && (
          <View style={styles.daysSection}>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{translate('scheduleUpcomingDays', language)}</Text>
            <View style={styles.daysGrid}>
              {weekDays.map((day, index) => {
                const allTasksCompleted = day.tasks.length > 0 && day.tasks.every(t => t.completed);
                const dayDate = parseLocalDateKey(day.date);
                const month = dayDate.toLocaleDateString(dateLocale, { month: 'short' });
                const dayNum = dayDate.getDate();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayBox,
                      { backgroundColor: tc.card, borderColor: tc.border },
                      allTasksCompleted && styles.dayBoxCompleted
                    ]}
                    onPress={() => setSelectedDay(day.date)}
                  >
                    <Text style={[styles.dayBoxName, { color: tc.text }]}>{day.dayName}</Text>
                    <Text style={[styles.dayBoxDate, { color: tc.textMuted }]}>{month} {dayNum}</Text>
                    {allTasksCompleted && (
                      <View style={styles.doneBadge}>
                        <Text style={styles.doneText}>{translate('scheduleDone', language)}</Text>
                      </View>
                    )}
                    {day.tasks.length > 0 && !allTasksCompleted && (
                      <Text style={[styles.dayBoxTaskCount, { color: tc.primary }]}>
                        {day.tasks.filter(t => t.completed).length}/{day.tasks.length}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Today & Completed Tabs - Show Tasks by Category with Bullet Points */}
        {(selectedTab === 'today' || selectedTab === 'completed') && (
          <View style={styles.tasksSection}>
            {Object.keys(groupedTasks).length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border }]}>
                <CheckCircle color={tc.primary} size={48} />
                <Text style={[styles.emptyTitle, { color: tc.text }]}>{translate('scheduleNoTasksFound', language)}</Text>
                <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                  {selectedTab === 'today' && translate('scheduleNoTasksToday', language)}
                  {selectedTab === 'completed' && translate('scheduleNoTasksCompleted', language)}
                </Text>
                {selectedTab === 'today' && (
                  <TouchableOpacity style={[styles.generateButton, { backgroundColor: tc.primary }]} onPress={() => generateSchedule()}>
                    <Text style={styles.generateButtonText}>{translate('scheduleGenerateSchedule', language)}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              Object.entries(groupedTasks).map(([category, categoryTasks]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <View key={category} style={[styles.categoryCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
                    <View style={[styles.categoryHeader, { borderBottomColor: tc.border }]}>
                      <CategoryIcon color={getPriorityColor(categoryTasks[0]?.priority || 'medium')} size={20} />
                      <Text style={[styles.categoryTitle, { color: tc.text }]}>
                        {getCategoryName(category)}
                      </Text>
                      <Text style={[styles.categoryCount, { color: tc.textMuted }]}>
                        {categoryTasks.length}{' '}
                        {categoryTasks.length === 1
                          ? translate('scheduleTask', language)
                          : translate('scheduleTasks', language)}
                      </Text>
                    </View>
                    <View style={styles.tasksList}>
                      {categoryTasks.map((task) => (
                        <View key={task.id} style={[styles.taskItem, { borderBottomColor: tc.border }]}>
                          <View style={styles.taskContent}>
                            <View style={styles.taskHeaderRow}>
                              <View style={[
                                styles.priorityDot,
                                { backgroundColor: getPriorityColor(task.priority) }
                              ]} />
                              <Text style={[
                                styles.taskBullet,
                                { color: tc.text },
                                task.completed && styles.taskCompleted
                              ]}>
                                • {task.title}
                              </Text>
                            </View>
                            <Text style={[
                              styles.taskDescription,
                              { color: tc.textSecondary },
                              task.completed && styles.taskDescriptionCompleted
                            ]}>
                              {task.description}
                            </Text>
                            <View style={styles.taskMeta}>
                              <View style={[styles.dueDateBadge, { backgroundColor: tc.screenSecondary }]}>
                                <Clock color={tc.textMuted} size={12} />
                                <Text style={[styles.dueDateText, { color: tc.textMuted }]}>
                                  {new Date(task.dueDate).toLocaleDateString(dateLocale, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                              </View>
                              {task.source && (
                                <View style={[styles.sourceBadge, { backgroundColor: tc.screenSecondary }]}>
                                  <Text style={[styles.sourceText, { color: tc.textMuted }]}>{task.source}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Switch
                            value={task.completed}
                            onValueChange={() => toggleTaskCompletion(task.id)}
                            trackColor={{ false: tc.border, true: tc.primary }}
                            thumbColor="white"
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={selectedDay !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: tc.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: tc.border }]}>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <ArrowLeft color={tc.text} size={24} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: tc.text }]}>
                {selectedDay &&
                  new Date(selectedDay).toLocaleDateString(dateLocale, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {selectedDay && (() => {
                const dayData = weekDays.find(d => d.date === selectedDay);
                if (!dayData || dayData.tasks.length === 0) {
                  return (
                    <View style={[styles.emptyState, { backgroundColor: tc.screenSecondary, borderWidth: 0 }]}>
                      <Text style={[styles.emptyText, { color: tc.textMuted }]}>
                        {translate('scheduleModalEmptyDay', language)}
                      </Text>
                    </View>
                  );
                }
                
                const grouped = groupTasksByCategory(dayData.tasks);
                return Object.entries(grouped).map(([category, categoryTasks]) => {
                  const CategoryIcon = getCategoryIcon(category);
                  return (
                    <View key={category} style={[styles.categoryCard, { backgroundColor: tc.card, borderColor: tc.border, borderWidth: 1 }]}>
                      <View style={[styles.categoryHeader, { borderBottomColor: tc.border }]}>
                        <CategoryIcon color={getPriorityColor(categoryTasks[0]?.priority || 'medium')} size={20} />
                        <Text style={[styles.categoryTitle, { color: tc.text }]}>
                          {getCategoryName(category)}
                        </Text>
                      </View>
                      <View style={styles.tasksList}>
                        {categoryTasks.map((task) => (
                          <View key={task.id} style={[styles.taskItem, { borderBottomColor: tc.border }]}>
                            <View style={styles.taskContent}>
                              <View style={styles.taskHeaderRow}>
                                <View style={[
                                  styles.priorityDot,
                                  { backgroundColor: getPriorityColor(task.priority) }
                                ]} />
                                <Text style={[
                                  styles.taskBullet,
                                  { color: tc.text },
                                  task.completed && styles.taskCompleted
                                ]}>
                                  • {task.title}
                                </Text>
                              </View>
                              <Text style={[
                                styles.taskDescription,
                                { color: tc.textSecondary },
                                task.completed && styles.taskDescriptionCompleted
                              ]}>
                                {task.description}
                              </Text>
                            </View>
                            <Switch
                              value={task.completed}
                              onValueChange={() => toggleTaskCompletion(task.id)}
                              trackColor={{ false: tc.border, true: tc.primary }}
                              thumbColor="white"
                            />
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cropFilterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cropFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  cropFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cropFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cropFilterButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  cropFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  cropFilterButtonTextActive: {
    color: 'white',
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#22C55E',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  daysSection: {
    marginBottom: 24,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  dayBox: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  dayBoxCompleted: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  dayBoxName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  dayBoxDate: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 10,
    fontWeight: '600',
  },
  dayBoxTaskCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '600',
  },
  doneBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  doneText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tasksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskBullet: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 16,
    marginBottom: 6,
  },
  taskDescriptionCompleted: {
    color: '#9CA3AF',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 16,
    flexWrap: 'wrap',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sourceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalScroll: {
    padding: 16,
  },
});
