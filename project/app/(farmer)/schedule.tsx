import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Calendar, Clock, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Plus } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { FarmingTask } from '@/types';

export default function ScheduleScreen() {
  const { farmingTasks } = useApp();
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  const toggleTaskCompletion = (taskId: string) => {
    // In a real app, this would update the task status
    console.log('Toggle task completion:', taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const filterTasks = (tasks: FarmingTask[]) => {
    switch (selectedTab) {
      case 'today':
        return tasks.filter(task => {
          const today = new Date().toISOString().split('T')[0];
          return task.dueDate === today;
        });
      case 'upcoming':
        return tasks.filter(task => {
          const today = new Date().toISOString().split('T')[0];
          return task.dueDate > today && !task.completed;
        });
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  };

  const filteredTasks = filterTasks(farmingTasks);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Farming Schedule</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color="white" size={24} />
        </TouchableOpacity>
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

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Calendar Widget */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Calendar color="#22C55E" size={24} />
            <Text style={styles.calendarTitle}>January 2024</Text>
          </View>
          <View style={styles.calendarGrid}>
            {Array.from({ length: 7 }, (_, i) => (
              <View key={i} style={styles.dayColumn}>
                <Text style={styles.dayLabel}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                </Text>
                <TouchableOpacity style={[
                  styles.dayButton,
                  i === 3 && styles.todayButton // Mock today as Wednesday
                ]}>
                  <Text style={[
                    styles.dayText,
                    i === 3 && styles.todayText
                  ]}>
                    {14 + i}
                  </Text>
                  {i === 3 && <View style={styles.taskIndicator} />}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Task Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{farmingTasks.filter(t => !t.completed).length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{farmingTasks.filter(t => t.completed).length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{farmingTasks.filter(t => t.priority === 'high').length}</Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
        </View>

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>
            {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} Tasks
          </Text>
          
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle color="#22C55E" size={48} />
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'today' && "You don't have any tasks scheduled for today"}
                {selectedTab === 'upcoming' && "All caught up! No upcoming tasks"}
                {selectedTab === 'completed' && "No completed tasks yet"}
              </Text>
            </View>
          ) : (
            filteredTasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription}>{task.description}</Text>
                    <View style={styles.taskMeta}>
                      <View style={styles.priorityBadge}>
                        <View 
                          style={[
                            styles.priorityDot,
                            { backgroundColor: getPriorityColor(task.priority) }
                          ]} 
                        />
                        <Text style={styles.priorityText}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.dueDateBadge}>
                        <Clock color="#6B7280" size={12} />
                        <Text style={styles.dueDateText}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.taskActions}>
                    <Switch
                      value={task.completed}
                      onValueChange={() => toggleTaskCompletion(task.id)}
                      trackColor={{ false: '#E5E7EB', true: '#22C55E' }}
                      thumbColor={task.completed ? 'white' : '#F3F4F6'}
                    />
                  </View>
                </View>

                {task.completed && (
                  <View style={styles.completedBadge}>
                    <CheckCircle color="#22C55E" size={16} />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Weekly Overview */}
        <View style={styles.weeklyOverview}>
          <Text style={styles.sectionTitle}>Weekly Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
          <Text style={styles.progressText}>6 of 8 tasks completed this week</Text>
        </View>
      </ScrollView>
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
  addButton: {
    backgroundColor: '#22C55E',
    borderRadius: 20,
    padding: 8,
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
  calendarCard: {
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
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayButton: {
    backgroundColor: '#22C55E',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
  },
  todayText: {
    color: 'white',
  },
  taskIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#6B7280',
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
  taskActions: {
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completedText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  weeklyOverview: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 12,
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
});