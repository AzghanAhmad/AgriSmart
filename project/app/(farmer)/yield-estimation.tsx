/**
 * Yield Estimation Screen
 * =======================
 * 
 * Features:
 * - Yield Forecast Graph with time filter (Weeks/Months/Year)
 * - Farm information inputs
 * - Environmental factors
 * - Health metrics from disease detection
 * - Estimation results with scores
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import {
  TrendingUp,
  Leaf,
  CloudSun,
  FlaskConical,
  Sprout,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { colors, spacing, borderRadius, shadows } from '@/utils/designSystem';
import { apiGet } from '@/utils/api';
import {
  getYieldEstimation,
  getSupportedCrops,
  formatYield,
  getYieldScoreLabel,
  getYieldScoreColor,
  YieldEstimationPayload,
  YieldEstimationResult,
} from '@/services/yieldEstimationService';

const screenWidth = Dimensions.get('window').width;

// Time filter options
type TimeFilter = 'weeks' | 'months' | 'year';

// Generate mock forecast data based on time filter
const generateForecastData = (filter: TimeFilter, baseYield: number) => {
  const growthFactor = 0.85; // Starting at 85% of max yield
  
  switch (filter) {
    case 'weeks':
      return {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
        data: [
          Math.round(baseYield * growthFactor * 0.4),
          Math.round(baseYield * growthFactor * 0.55),
          Math.round(baseYield * growthFactor * 0.7),
          Math.round(baseYield * growthFactor * 0.82),
          Math.round(baseYield * growthFactor * 0.93),
          Math.round(baseYield * growthFactor),
        ],
      };
    case 'months':
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [
          Math.round(baseYield * 0.2),
          Math.round(baseYield * 0.35),
          Math.round(baseYield * 0.55),
          Math.round(baseYield * 0.75),
          Math.round(baseYield * 0.9),
          Math.round(baseYield),
        ],
      };
    case 'year':
      return {
        labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
        data: [
          Math.round(baseYield * 0.65),
          Math.round(baseYield * 0.72),
          Math.round(baseYield * 0.78),
          Math.round(baseYield * 0.85),
          Math.round(baseYield * 0.92),
          Math.round(baseYield),
        ],
      };
  }
};

// Default values for scores
const DEFAULT_SCORES = {
  weatherScore: 0.75,
  soilQualityScore: 0.70,
  sensorGrowthIndex: 0.72,
};

interface FormData {
  cropType: string;
  farmSizeAcres: string;
  weatherScore: string;
  soilQualityScore: string;
  sensorGrowthIndex: string;
  healthRatio: string;
  diseaseRatio: string;
}

export default function YieldEstimationScreen() {
  const { user } = useAuth();
  const { language } = useApp();

  // State for form inputs
  const [formData, setFormData] = useState<FormData>({
    cropType: 'wheat',
    farmSizeAcres: '3.5',
    weatherScore: DEFAULT_SCORES.weatherScore.toString(),
    soilQualityScore: DEFAULT_SCORES.soilQualityScore.toString(),
    sensorGrowthIndex: DEFAULT_SCORES.sensorGrowthIndex.toString(),
    healthRatio: '0.80',
    diseaseRatio: '0.20',
  });

  // State for UI
  const [supportedCrops, setSupportedCrops] = useState<string[]>(['wheat', 'rice', 'maize', 'cotton']);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YieldEstimationResult | null>(null);
  
  // Time filter state for graph
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weeks');
  const [showTimeFilterPicker, setShowTimeFilterPicker] = useState(false);

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#22C55E',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#E5E7EB',
      strokeWidth: 1,
    },
  };

  // Get forecast data based on result and time filter
  const forecastData = generateForecastData(
    timeFilter,
    result?.estimatedYieldKg || 5000
  );

  // Fetch supported crops on mount
  useEffect(() => {
    async function fetchCrops() {
      try {
        const crops = await getSupportedCrops();
        setSupportedCrops(crops);
      } catch (err) {
        console.log('Using default crops list');
      }
    }
    fetchCrops();
  }, []);

  // Fetch health metrics from recent detections
  useEffect(() => {
    async function fetchHealthMetrics() {
      if (!user?.id) return;
      try {
        const response = await apiGet<{ healthy: number; atRisk: number; diseased: number }>(
          `/api/farmer/stats/health?farmerId=${encodeURIComponent(user.id)}`
        );
        const healthRatio = ((response.healthy || 75) / 100).toFixed(2);
        const diseaseRatio = ((response.diseased || 10) / 100).toFixed(2);
        setFormData(prev => ({
          ...prev,
          healthRatio,
          diseaseRatio,
        }));
      } catch (err) {
        console.log('Using default health metrics');
      }
    }
    fetchHealthMetrics();
  }, [user?.id]);

  // Handle form submission
  const handleEstimate = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const farmSize = parseFloat(formData.farmSizeAcres);
      if (isNaN(farmSize) || farmSize <= 0) {
        throw new Error('Please enter a valid farm size');
      }

      const payload: YieldEstimationPayload = {
        cropType: formData.cropType,
        farmSizeAcres: farmSize,
        weatherScore: parseFloat(formData.weatherScore) || DEFAULT_SCORES.weatherScore,
        soilQualityScore: parseFloat(formData.soilQualityScore) || DEFAULT_SCORES.soilQualityScore,
        sensorGrowthIndex: parseFloat(formData.sensorGrowthIndex) || DEFAULT_SCORES.sensorGrowthIndex,
        healthRatio: parseFloat(formData.healthRatio) || 0.75,
        diseaseRatio: parseFloat(formData.diseaseRatio) || 0.25,
      };

      const estimation = await getYieldEstimation(payload);
      setResult(estimation);
    } catch (err: any) {
      setError(err.message || 'Failed to estimate yield');
    } finally {
      setIsLoading(false);
    }
  };

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Time filter labels
  const timeFilterLabels: Record<TimeFilter, string> = {
    weeks: 'Weekly',
    months: 'Monthly',
    year: 'Yearly',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TrendingUp color="#fff" size={32} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Yield Forecast</Text>
            <Text style={styles.headerSubtitle}>Track and estimate crop yield</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Yield Forecast Graph Section */}
      <View style={styles.section}>
        <View style={styles.graphHeader}>
          <Text style={styles.sectionTitle}>Growth Forecast</Text>
          
          {/* Time Filter Dropdown */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowTimeFilterPicker(!showTimeFilterPicker)}
            >
              <Calendar size={16} color={colors.primary} />
              <Text style={styles.filterButtonText}>{timeFilterLabels[timeFilter]}</Text>
              <ChevronDown size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            
            {showTimeFilterPicker && (
              <View style={styles.filterDropdown}>
                {(['weeks', 'months', 'year'] as TimeFilter[]).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterDropdownItem,
                      timeFilter === filter && styles.filterDropdownItemActive,
                    ]}
                    onPress={() => {
                      setTimeFilter(filter);
                      setShowTimeFilterPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterDropdownText,
                        timeFilter === filter && styles.filterDropdownTextActive,
                      ]}
                    >
                      {timeFilterLabels[filter]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Graph Card */}
        <View style={styles.graphCard}>
          <View style={styles.graphAxisLabel}>
            <Text style={styles.axisLabelText}>Yield (kg)</Text>
          </View>
          
          <LineChart
            data={{
              labels: forecastData.labels,
              datasets: [
                {
                  data: forecastData.data,
                  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            fromZero={true}
          />
          
          <Text style={styles.xAxisLabel}>Time ({timeFilterLabels[timeFilter]})</Text>
          
          {/* Graph Legend */}
          <View style={styles.graphLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Projected Yield</Text>
            </View>
            <Text style={styles.legendValue}>
              Peak: {formatYield(forecastData.data[forecastData.data.length - 1])}
            </Text>
          </View>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Farm Information</Text>

        {/* Crop Type Selector */}
        <View style={styles.inputGroup}>
          <View style={styles.inputLabelRow}>
            <Leaf size={16} color={colors.primary} />
            <Text style={styles.inputLabel}>Crop Type</Text>
          </View>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowCropPicker(!showCropPicker)}
          >
            <Text style={styles.selectText}>
              {formData.cropType.charAt(0).toUpperCase() + formData.cropType.slice(1)}
            </Text>
            <ChevronDown size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          {showCropPicker && (
            <View style={styles.dropdown}>
              {supportedCrops.map(crop => (
                <TouchableOpacity
                  key={crop}
                  style={[
                    styles.dropdownItem,
                    formData.cropType === crop && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    updateField('cropType', crop);
                    setShowCropPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      formData.cropType === crop && styles.dropdownTextActive,
                    ]}
                  >
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Farm Size Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Farm Size (acres)</Text>
          <TextInput
            style={styles.textInput}
            value={formData.farmSizeAcres}
            onChangeText={val => updateField('farmSizeAcres', val)}
            keyboardType="decimal-pad"
            placeholder="Enter farm size"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {/* Environmental Factors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environmental Factors</Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreLabel}>
            <CloudSun size={20} color="#3B82F6" />
            <Text style={styles.scoreLabelText}>Weather Score</Text>
          </View>
          <View style={styles.scoreInputContainer}>
            <TextInput
              style={styles.scoreInput}
              value={formData.weatherScore}
              onChangeText={val => updateField('weatherScore', val)}
              keyboardType="decimal-pad"
              placeholder="0-1"
            />
            <Text style={styles.scoreHint}>0-1</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreLabel}>
            <FlaskConical size={20} color="#8B5CF6" />
            <Text style={styles.scoreLabelText}>Soil Quality</Text>
          </View>
          <View style={styles.scoreInputContainer}>
            <TextInput
              style={styles.scoreInput}
              value={formData.soilQualityScore}
              onChangeText={val => updateField('soilQualityScore', val)}
              keyboardType="decimal-pad"
              placeholder="0-1"
            />
            <Text style={styles.scoreHint}>0-1</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreLabel}>
            <Sprout size={20} color="#22C55E" />
            <Text style={styles.scoreLabelText}>Growth Index</Text>
          </View>
          <View style={styles.scoreInputContainer}>
            <TextInput
              style={styles.scoreInput}
              value={formData.sensorGrowthIndex}
              onChangeText={val => updateField('sensorGrowthIndex', val)}
              keyboardType="decimal-pad"
              placeholder="0-1"
            />
            <Text style={styles.scoreHint}>0-1</Text>
          </View>
        </View>
      </View>

      {/* Health Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Metrics</Text>
        <Text style={styles.sectionHint}>From your disease detection scans</Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreLabel}>
            <CheckCircle size={20} color="#22C55E" />
            <Text style={styles.scoreLabelText}>Health Ratio</Text>
          </View>
          <View style={styles.scoreInputContainer}>
            <TextInput
              style={styles.scoreInput}
              value={formData.healthRatio}
              onChangeText={val => updateField('healthRatio', val)}
              keyboardType="decimal-pad"
              placeholder="0-1"
            />
            <Text style={styles.scoreHint}>0-1</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreLabel}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.scoreLabelText}>Disease Risk</Text>
          </View>
          <View style={styles.scoreInputContainer}>
            <TextInput
              style={styles.scoreInput}
              value={formData.diseaseRatio}
              onChangeText={val => updateField('diseaseRatio', val)}
              keyboardType="decimal-pad"
              placeholder="0-1"
            />
            <Text style={styles.scoreHint}>0-1</Text>
          </View>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorCard}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Estimate Button */}
      <TouchableOpacity
        style={[styles.estimateButton, isLoading && styles.estimateButtonDisabled]}
        onPress={handleEstimate}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <TrendingUp color="#fff" size={20} />
            <Text style={styles.estimateButtonText}>Calculate Yield</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results Section */}
      {result && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Estimation Results</Text>

          {/* Main Yield Card */}
          <View style={styles.yieldCard}>
            <Text style={styles.yieldLabel}>Estimated Yield</Text>
            <Text style={styles.yieldValue}>{formatYield(result.estimatedYieldKg)}</Text>
            <Text style={styles.yieldRange}>
              Range: {formatYield(result.expectedYieldRangeKg.min)} - {formatYield(result.expectedYieldRangeKg.max)}
            </Text>
          </View>

          {/* Score Cards Grid */}
          <View style={styles.scoreGrid}>
            <View style={styles.scoreCard}>
              <View
                style={[
                  styles.scoreCircle,
                  { borderColor: getYieldScoreColor(result.finalYieldScore) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreCircleText,
                    { color: getYieldScoreColor(result.finalYieldScore) },
                  ]}
                >
                  {Math.round(result.finalYieldScore * 100)}%
                </Text>
              </View>
              <Text style={styles.scoreCardLabel}>Yield Score</Text>
              <Text
                style={[
                  styles.scoreCardValue,
                  { color: getYieldScoreColor(result.finalYieldScore) },
                ]}
              >
                {getYieldScoreLabel(result.finalYieldScore)}
              </Text>
            </View>

            <View style={styles.scoreCard}>
              <View style={[styles.scoreCircle, { borderColor: '#22C55E' }]}>
                <Text style={[styles.scoreCircleText, { color: '#22C55E' }]}>
                  {Math.round(result.healthRatio * 100)}%
                </Text>
              </View>
              <Text style={styles.scoreCardLabel}>Health</Text>
              <Text style={[styles.scoreCardValue, { color: '#22C55E' }]}>
                {result.healthRatio >= 0.7 ? 'Good' : 'Fair'}
              </Text>
            </View>

            <View style={styles.scoreCard}>
              <View
                style={[
                  styles.scoreCircle,
                  { borderColor: result.diseaseRiskRatio > 0.3 ? '#EF4444' : '#F59E0B' },
                ]}
              >
                <Text
                  style={[
                    styles.scoreCircleText,
                    { color: result.diseaseRiskRatio > 0.3 ? '#EF4444' : '#F59E0B' },
                  ]}
                >
                  {Math.round(result.diseaseRiskRatio * 100)}%
                </Text>
              </View>
              <Text style={styles.scoreCardLabel}>Disease Risk</Text>
              <Text
                style={[
                  styles.scoreCardValue,
                  { color: result.diseaseRiskRatio > 0.3 ? '#EF4444' : '#F59E0B' },
                ]}
              >
                {result.diseaseRiskRatio > 0.3 ? 'High' : 'Low'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    padding: spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  
  // Graph Styles
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterContainer: {
    position: 'relative',
    zIndex: 100,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 120,
    ...shadows.lg,
    zIndex: 101,
  },
  filterDropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterDropdownItemActive: {
    backgroundColor: colors.primaryBg,
  },
  filterDropdownText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  filterDropdownTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  graphCard: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.md,
  },
  graphAxisLabel: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.xl,
    transform: [{ rotate: '-90deg' }],
    zIndex: 10,
  },
  axisLabelText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginLeft: -8,
  },
  xAxisLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  graphLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  
  // Form Styles
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  textInput: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectInput: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  dropdown: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryBg,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  dropdownTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  scoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  scoreLabelText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scoreHint: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
  },
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.base,
    ...shadows.lg,
  },
  estimateButtonDisabled: {
    opacity: 0.7,
  },
  estimateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultsSection: {
    padding: spacing.base,
    marginTop: spacing.md,
  },
  yieldCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  yieldLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  yieldValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  yieldRange: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  scoreCircleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreCardLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  scoreCardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
