import { AppState } from "../../store/useStore";
import { calculateBaseline } from "./baselines";
import { ModularEngineResult } from "./types";

export function runBaselineEngine(state: AppState): ModularEngineResult {
  const todayStr = new Date().toISOString().split("T")[0];
  const trackedMetrics = ["hrv_rmssd", "rhr", "sleep_duration"];
  
  const datUsed: string[] = [];
  const datMissing: string[] = [];
  const limits: string[] = [];
  
  let totalScore = 0;
  let count = 0;
  
  trackedMetrics.forEach(mId => {
    const baseline = calculateBaseline(state.metrics, mId as any, todayStr);
    if (baseline) {
      datUsed.push(mId);
      totalScore += baseline.cv28d < 15 ? 90 : 70; // Low CV = better stability
      count++;
    } else {
      datMissing.push(mId);
    }
  });
  
  const confidence = count > 0 ? Math.round((count / trackedMetrics.length) * 100) : 0;
  const score = count > 0 ? Math.round(totalScore / count) : 0;
  
  let status = "calibrating";
  let secureWording = "Calibrage initial en cours. Vos données physiologiques de référence se stabilisent au fil des jours.";
  
  if (count === trackedMetrics.length) {
    status = "established";
    secureWording = "Profil de référence physiologique établi. Vos écarts journaliers sont désormais comparés à vos propres normales.";
  } else {
    limits.push("Moins de 5 jours de données enregistrées pour certaines métriques.");
  }
  
  return {
    score,
    status,
    confidence,
    positiveDrivers: [],
    negativeDrivers: [],
    dataUsed: datUsed,
    dataMissing: datMissing,
    limits,
    secureWording
  };
}
