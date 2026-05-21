import { AppState } from "../../store/useStore";
import { ModularEngineResult } from "./types";
import { runRecoveryEngine } from "./recoveryEngine";
import { runTrainingLoadEngine } from "./trainingLoadEngine";
import { Driver } from "./engine";

export function runReadinessEngine(state: AppState): ModularEngineResult {
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];

  const recoveryRes = runRecoveryEngine(state);
  const trainingRes = runTrainingLoadEngine(state);

  let readinessScore = 50;
  let readinessConfidence = 0;
  const positiveDrivers: Driver[] = [];
  const negativeDrivers: Driver[] = [];

  const acwr = trainingRes.positiveDrivers.find(d => d.metricId === "acwr")?.value 
    || trainingRes.negativeDrivers.find(d => d.metricId === "acwr")?.value 
    || 0;
  const numericAcwr = typeof acwr === "string" ? parseFloat(acwr) : acwr;

  if (numericAcwr > 0) {
    readinessConfidence += 50;
    if (numericAcwr >= 0.8 && numericAcwr <= 1.3) readinessScore += 20;
    else if (numericAcwr > 1.5) readinessScore -= 30;
    else if (numericAcwr < 0.8) readinessScore -= 10;
  }

  if (recoveryRes.confidence > 0) {
    readinessConfidence += 50;
    readinessScore = (readinessScore + recoveryRes.score) / 2;
  }

  const latestHooper =
    state.hooperLogs.find((l) => l.date === todayStr) ||
    state.hooperLogs.find((l) => l.date === yesterdayStr);

  if (latestHooper) {
    if (latestHooper.fatigue >= 6) readinessScore -= 15;
    if (latestHooper.soreness >= 6) readinessScore -= 10;
  }

  const activePainLogs = state.painLogs ? state.painLogs.filter((p) => p.date === todayStr) : [];
  const maxPainIntensity = activePainLogs.reduce((max, log) => Math.max(max, log.intensityActive, log.intensityRest), 0);
  if (maxPainIntensity >= 7) {
    readinessScore = Math.min(30, readinessScore);
  }

  const checkinWithIllness = state.hooperLogs.find((l) => (l.date === todayStr || l.date === yesterdayStr) && (l.isIll === true || l.notes?.toLowerCase().includes("malade")));
  if (checkinWithIllness) {
    readinessScore = Math.min(25, readinessScore);
  }

  readinessScore = Math.max(0, Math.min(100, readinessScore));

  let readinessStatus = "normal";
  if (numericAcwr > 1.5 || recoveryRes.score < 20 || maxPainIntensity >= 7) {
    readinessStatus = "danger";
  } else if (readinessScore > 75) {
    readinessStatus = "optimal";
  } else if (readinessScore > 40) {
    readinessStatus = "normal";
  } else {
    readinessStatus = "low";
  }

  return {
    score: Math.round(readinessScore),
    status: readinessStatus,
    confidence: readinessConfidence,
    positiveDrivers,
    negativeDrivers,
    dataUsed: [],
    dataMissing: [],
    limits: [],
    secureWording: "Disponibilité évaluée."
  };
}
