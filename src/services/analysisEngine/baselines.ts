import { NormalizedMetric, BaselineStats } from '../../types';
import { calculateMean, calculateStdDev, calculateZScore, calculateCV } from './math';

/**
 * Filtre les métriques d'un certain type sur une période donnée (en jours)
 */
const getMetricsForPeriod = (
  metrics: NormalizedMetric[], 
  type: NormalizedMetric['type'], 
  targetDate: Date, 
  days: number
): number[] => {
  const targetTime = targetDate.getTime();
  const periodMs = days * 24 * 60 * 60 * 1000;
  
  return metrics
    .filter(m => m.type === type)
    .filter(m => {
      const mTime = new Date(m.timestamp).getTime();
      return mTime <= targetTime && mTime > (targetTime - periodMs);
    })
    .map(m => m.value);
};

/**
 * Couche B : Calcule la baseline individuelle pour une métrique spécifique à une date donnée.
 * Ne se compare pas à une norme populationnelle, mais à l'historique de l'athlète.
 */
export const calculateBaseline = (
  metrics: NormalizedMetric[],
  type: NormalizedMetric['type'],
  targetDateStr: string
): BaselineStats | null => {
  const targetDate = new Date(targetDateStr);
  
  // Récupérer la valeur du jour (ou la plus récente dans les 24h)
  const todayValues = getMetricsForPeriod(metrics, type, targetDate, 1);
  if (todayValues.length === 0) return null;
  
  const currentValue = todayValues[todayValues.length - 1]; // Prendre la dernière si plusieurs
  
  // Récupérer l'historique
  const values7d = getMetricsForPeriod(metrics, type, targetDate, 7);
  const values28d = getMetricsForPeriod(metrics, type, targetDate, 28);
  
  if (values28d.length < 5) {
    // Pas assez de données pour une baseline fiable
    return null;
  }

  const mean7d = calculateMean(values7d);
  const std7d = calculateStdDev(values7d, mean7d);
  
  const mean28d = calculateMean(values28d);
  const std28d = calculateStdDev(values28d, mean28d);
  
  const zScore7d = calculateZScore(currentValue, mean7d, std7d);
  const zScore28d = calculateZScore(currentValue, mean28d, std28d);
  
  const cv28d = calculateCV(mean28d, std28d);
  
  // Détermination de la tendance (très basique pour l'instant)
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (mean7d > mean28d + (std28d * 0.5)) trend = 'increasing';
  if (mean7d < mean28d - (std28d * 0.5)) trend = 'decreasing';

  return {
    currentValue,
    mean7d,
    std7d,
    mean28d,
    std28d,
    zScore7d,
    zScore28d,
    cv28d,
    trend
  };
};
