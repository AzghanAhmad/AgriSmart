import React, { useState, useEffect } from 'react';
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
import { getApiBaseUrl } from '@/utils/env';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function ScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');
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
      const today = new Date().toISOString().split('T')[0];
      
      if (lastReset !== today) {
        // Reset all tasks for today
        setTasks(prev => prev.map(task => {
          const taskDate = task.dueDate.split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate.split('T')[0] === today);
    if (todayTasks.length === 0) {
      setDailyProgress(0);
      return;
    }
    const completed = todayTasks.filter(t => t.completed).length;
    setDailyProgress((completed / todayTasks.length) * 100);
  };

  const loadSchedule = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const API_BASE_URL = getApiBaseUrl();
      const today = new Date().toISOString().split('T')[0];
      
      // Get current week's schedule
      const response = await fetch(
        `${API_BASE_URL}/api/farmer/schedule/current?farmerId=${user.id}&weekNumber=week1`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Filter to only show 1 week (7 days from today)
        const weekTasks = (data.tasks || []).filter((task: ScheduleTask) => {
          const taskDate = task.dueDate.split('T')[0];
          const daysDiff = Math.floor(
            (new Date(taskDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
          );
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
  };

  const generateSchedule = async () => {
    if (!user?.id) return;
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      
      const response = await fetch(`${API_BASE_URL}/api/farmer/schedule/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmerId: user.id,
          cropType: 'wheat', // Default - could be from user profile
          location: user.location || 'Punjab, Pakistan',
          weekNumber: 'week1',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const today = new Date().toISOString().split('T')[0];
        const weekTasks = (data.tasks || []).filter((task: ScheduleTask) => {
          const taskDate = task.dueDate.split('T')[0];
          const daysDiff = Math.floor(
            (new Date(taskDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysDiff >= 0 && daysDiff < 7;
        });
        setTasks(weekTasks);
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

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
      case 'disease_management': return 'Disease Management';
      case 'weather_advisory': return 'Weather Advisory';
      case 'location_specific': return 'Location Specific';
      case 'maintenance': return 'Crop Maintenance';
      default: return 'General';
    }
  };

  const getWeekDays = (): DayTasks[] => {
    const days: DayTasks[] = [];
    const today = new Date();
    
    // Start from tomorrow (day after today)
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      const dayTasks = tasks.filter(t => t.dueDate.split('T')[0] === dateStr);
      days.push({
        date: dateStr,
        dayName,
        tasks: dayTasks,
      });
    }
    
    return days;
  };

  const filterTasks = (taskList: ScheduleTask[]) => {
    const today = new Date().toISOString().split('T')[0];
    switch (selectedTab) {
      case 'today':
        return taskList.filter(task => task.dueDate.split('T')[0] === today);
      case 'upcoming':
        return taskList.filter(task => {
          const taskDate = task.dueDate.split('T')[0];
          return taskDate > today && !task.completed;
        });
      case 'completed':
        return taskList.filter(task => task.completed);
      default:
        return taskList;
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

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadSchedule();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading your farming schedule..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Farming Schedule</Text>
          <Text style={styles.subtitle}>1 Week Personalized Plan</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <RefreshCw color="#22C55E" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weather Button - Prominent at top */}
      <View style={styles.weatherButtonContainer}>
        <TouchableOpacity 
          style={styles.weatherButtonLarge} 
          onPress={() => router.push('/(farmer)/weather' as any)}
          activeOpacity={0.8}
        >
          <Cloud color="white" size={24} />
          <View style={styles.weatherButtonTextContainer}>
            <Text style={styles.weatherButtonTitle}>7-Day Weather Forecast</Text>
            <Text style={styles.weatherButtonSubtitle}>Check weather for your farming schedule</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Daily Progress */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Today's Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${dailyProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(dailyProgress)}% completed today
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['today', 'upcoming', 'completed'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Upcoming Tab - Show Days */}
        {selectedTab === 'upcoming' && (
          <View style={styles.daysSection}>
            <Text style={styles.sectionTitle}>Upcoming Days</Text>
            {weekDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dayCard}
                onPress={() => setSelectedDay(day.date)}
              >
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <Text style={styles.dayDate}>
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.dayStats}>
                    <Text style={styles.dayTaskCount}>{day.tasks.length} tasks</Text>
                    <Text style={styles.dayCompletedCount}>
                      {day.tasks.filter(t => t.completed).length} completed
                    </Text>
                  </View>
                </View>
                {day.tasks.length > 0 && (
                  <View style={styles.dayPreview}>
                    {day.tasks.slice(0, 2).map((task, idx) => (
                      <Text key={idx} style={styles.dayPreviewTask}>
                        • {task.title}
                      </Text>
                    ))}
                    {day.tasks.length > 2 && (
                      <Text style={styles.dayMoreTasks}>
                        +{day.tasks.length - 2} more tasks
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Today & Completed Tabs - Show Tasks by Category with Bullet Points */}
        {(selectedTab === 'today' || selectedTab === 'completed') && (
          <View style={styles.tasksSection}>
            {Object.keys(groupedTasks).length === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle color="#22C55E" size={48} />
                <Text style={styles.emptyTitle}>No tasks found</Text>
                <Text style={styles.emptyText}>
                  {selectedTab === 'today' && "You don't have any tasks scheduled for today"}
                  {selectedTab === 'completed' && "No completed tasks yet"}
                </Text>
                {selectedTab === 'today' && (
                  <TouchableOpacity style={styles.generateButton} onPress={generateSchedule}>
                    <Text style={styles.generateButtonText}>Generate Schedule</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              Object.entries(groupedTasks).map(([category, categoryTasks]) => {
                const CategoryIcon = getCategoryIcon(category);
                return (
                  <View key={category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <CategoryIcon color={getPriorityColor(categoryTasks[0]?.priority || 'medium')} size={20} />
                      <Text style={styles.categoryTitle}>
                        {getCategoryName(category)}
                      </Text>
                      <Text style={styles.categoryCount}>
                        {categoryTasks.length} {categoryTasks.length === 1 ? 'task' : 'tasks'}
                      </Text>
                    </View>
                    <View style={styles.tasksList}>
                      {categoryTasks.map((task) => (
                        <View key={task.id} style={styles.taskItem}>
                          <View style={styles.taskContent}>
                            <View style={styles.taskHeaderRow}>
                              <View style={[
                                styles.priorityDot,
                                { backgroundColor: getPriorityColor(task.priority) }
                              ]} />
                              <Text style={[
                                styles.taskBullet,
                                task.completed && styles.taskCompleted
                              ]}>
                                • {task.title}
                              </Text>
                            </View>
                            <Text style={[
                              styles.taskDescription,
                              task.completed && styles.taskDescriptionCompleted
                            ]}>
                              {task.description}
                            </Text>
                            <View style={styles.taskMeta}>
                              <View style={styles.dueDateBadge}>
                                <Clock color="#6B7280" size={12} />
                                <Text style={styles.dueDateText}>
                                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Text>
                              </View>
                              {task.source && (
                                <View style={styles.sourceBadge}>
                                  <Text style={styles.sourceText}>{task.source}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Switch
                            value={task.completed}
                            onValueChange={() => toggleTaskCompletion(task.id)}
                            trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <ArrowLeft color="#111827" size={24} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedDay && new Date(selectedDay).toLocaleDateString('en-US', {
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
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No tasks scheduled for this day</Text>
                    </View>
                  );
                }
                
                const grouped = groupTasksByCategory(dayData.tasks);
                return Object.entries(grouped).map(([category, categoryTasks]) => {
                  const CategoryIcon = getCategoryIcon(category);
                  return (
                    <View key={category} style={styles.categoryCard}>
                      <View style={styles.categoryHeader}>
                        <CategoryIcon color={getPriorityColor(categoryTasks[0]?.priority || 'medium')} size={20} />
                        <Text style={styles.categoryTitle}>
                          {getCategoryName(category)}
                        </Text>
                      </View>
                      <View style={styles.tasksList}>
                        {categoryTasks.map((task) => (
                          <View key={task.id} style={styles.taskItem}>
                            <View style={styles.taskContent}>
                              <View style={styles.taskHeaderRow}>
                                <View style={[
                                  styles.priorityDot,
                                  { backgroundColor: getPriorityColor(task.priority) }
                                ]} />
                                <Text style={[
                                  styles.taskBullet,
                                  task.completed && styles.taskCompleted
                                ]}>
                                  • {task.title}
                                </Text>
                              </View>
                              <Text style={[
                                styles.taskDescription,
                                task.completed && styles.taskDescriptionCompleted
                              ]}>
                                {task.description}
                              </Text>
                            </View>
                            <Switch
                              value={task.completed}
                              onValueChange={() => toggleTaskCompletion(task.id)}
                              trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
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
  weatherButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  weatherButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherButtonTextContainer: {
    flex: 1,
  },
  weatherButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  weatherButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
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
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  dayTaskCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  dayCompletedCount: {
    fontSize: 12,
    color: '#22C55E',
  },
  dayPreview: {
    gap: 4,
  },
  dayPreviewTask: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  dayMoreTasks: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
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
