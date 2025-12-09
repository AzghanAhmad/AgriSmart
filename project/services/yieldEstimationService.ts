/**
 * Yield Estimation Service
 * 
 * Handles API communication for crop yield estimation feature.
 * Uses existing API utilities for consistent error handling.
 */

import { apiPost, apiGet } from '@/utils/api';

/**
 * Input payload for yield estimation
 */
export interface YieldEstimationPayload {
  cropType: string;
  farmSizeAcres: number;
  weatherScore: number;
  soilQualityScore: number;
  sensorGrowthIndex: number;
  healthRatio: number;
  diseaseRatio: number;
}

/**
 * Response from yield estimation endpoint
 */
export interface YieldEstimationResult {
  estimatedYieldKg: number;
  expectedYieldRangeKg: {
    min: number;
    max: number;
  };
  healthRatio: number;
  diseaseRiskRatio: number;
  finalYieldScore: number;
}

/**
 * Calculate crop yield estimation based on environmental and health factors.
 */
export async function getYieldEstimation(
  payload: YieldEstimationPayload
): Promise<YieldEstimationResult> {
  return apiPost<YieldEstimationResult>('/api/yield/estimate', payload);
}

/**
 * Get list of supported crops for yield estimation.
 */
export async function getSupportedCrops(): Promise<string[]> {
  const response = await apiGet<{ crops: string[] }>('/api/yield/crops');
  return response.crops;
}

/**
 * Helper to calculate health metrics from disease detection results.
 */
export function calculateHealthMetrics(
  detections: Array<{ disease: string; confidence: number }>
): { healthRatio: number; diseaseRatio: number } {
  if (!detections || detections.length === 0) {
    return { healthRatio: 1.0, diseaseRatio: 0.0 };
  }

  const healthyCount = detections.filter(
    (d) => d.disease === 'Healthy Crop' || d.disease === 'Healthy'
  ).length;
  
  const healthRatio = healthyCount / detections.length;
  
  const diseaseDetections = detections.filter(
    (d) => d.disease !== 'Healthy Crop' && d.disease !== 'Healthy'
  );
  
  let diseaseRatio = 0;
  if (diseaseDetections.length > 0) {
    const avgConfidence = diseaseDetections.reduce(
      (sum, d) => sum + d.confidence,
      0
    ) / diseaseDetections.length;
    diseaseRatio = avgConfidence / 100;
  }
  
  return { healthRatio, diseaseRatio };
}

/**
 * Format yield value for display with appropriate units.
 */
export function formatYield(yieldKg: number): string {
  if (yieldKg >= 1000) {
    return (yieldKg / 1000).toFixed(1) + ' tons';
  }
  return yieldKg.toLocaleString() + ' kg';
}

/**
 * Get yield score label based on finalYieldScore.
 */
export function getYieldScoreLabel(score: number): string {
  if (score >= 0.8) return 'Excellent';
  if (score >= 0.6) return 'Good';
  if (score >= 0.4) return 'Average';
  return 'Poor';
}

/**
 * Get color for yield score visualization.
 */
export function getYieldScoreColor(score: number): string {
  if (score >= 0.8) return '#22C55E';
  if (score >= 0.6) return '#3B82F6';
  if (score >= 0.4) return '#F59E0B';
  return '#EF4444';
}
