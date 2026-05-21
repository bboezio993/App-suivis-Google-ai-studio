import { AppState } from "../../store/useStore";
import { EngineScores, GarminActivity, SessionRPE } from "../../types";

import { runBaselineEngine } from "./baselineEngine";
import { runRecoveryEngine } from "./recoveryEngine";
import { runSleepEngine } from "./sleepEngine";
import { runTrainingLoadEngine } from "./trainingLoadEngine";
import { runNutritionEngine } from "./nutritionEngine";
import { runMentalLoadEngine } from "./mentalLoadEngine";
import { runRiskBoundaryEngine } from "./riskBoundaryEngine";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Driver {
  metricId: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  value: string | number;
  note: string;
}

/**
 * Construit un tableau des charges quotidiennes sur les N derniers jours
 */
export const buildDailyLoads = (
  activities: GarminActivity[],
  rpeLogs: SessionRPE[],
  days: number,
  targetDate: Date,
): number[] => {
  const loads: number[] = new Array(days).fill(0);
  const targetTime = targetDate.getTime();

  for (let i = 0; i < days; i++) {
    const d = new Date(targetTime - i * MS_PER_DAY);
    const dateStr = d.toISOString().split("T")[0];

    let dailyLoad = 0;
    const dayActivities = activities.filter((a) => a.date.startsWith(dateStr));
    dayActivities.forEach((act) => {
      if (act.tss) {
        dailyLoad += act.tss;
      } else {
        const rpe = rpeLogs.find((r) => r.activityId === act.id);
        if (rpe) {
          dailyLoad += rpe.rpe * rpe.durationMinutes;
        } else {
          const durationMins = act.duration
            ? parseInt(act.duration.split(":")[0]) * 60 +
              parseInt(act.duration.split(":")[1])
            : 60;
          dailyLoad += durationMins * 5; // sRPE average guess (RPE 5)
        }
      }
    });
    loads[days - 1 - i] = dailyLoad;
  }
  return loads;
};

export const runAnalysisEngine = (state: AppState): EngineScores => {
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - MS_PER_DAY);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Execute each specialized sub-engine
  const baselineRes = runBaselineEngine(state);
  const recoveryRes = runRecoveryEngine(state);
  const sleepRes = runSleepEngine(state);
  const trainingRes = runTrainingLoadEngine(state);
  const nutritionRes = runNutritionEngine(state);
  const mentalRes = runMentalLoadEngine(state);
  const riskRes = runRiskBoundaryEngine(state);

  // Calculate the fused performanceReadiness score with active constraints/caps
  let readinessScore = 50;
  let readinessConfidence = 0;

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

  // Soft boundaries from daily check-in (fatigue or soreness)
  const latestHooper =
    state.hooperLogs.find((l) => l.date === todayStr) ||
    state.hooperLogs.find((l) => l.date === yesterdayStr);

  if (latestHooper) {
    if (latestHooper.fatigue >= 6) readinessScore -= 15;
    if (latestHooper.soreness >= 6) readinessScore -= 10;
  }

  // Protectively cap readiness due to severe pain (as requested)
  const activePainLogs = state.painLogs ? state.painLogs.filter((p) => p.date === todayStr) : [];
  const maxPainIntensity = activePainLogs.reduce((max, log) => Math.max(max, log.intensityActive, log.intensityRest), 0);
  if (maxPainIntensity >= 7) {
    readinessScore = Math.min(30, readinessScore);
  }

  // Protectively cap readiness due to illness symptoms (as requested)
  const checkinWithIllness = state.hooperLogs.find((l) => (l.date === todayStr || l.date === yesterdayStr) && (l.isIll === true || l.notes?.toLowerCase().includes("malade")));
  if (checkinWithIllness) {
    readinessScore = Math.min(25, readinessScore);
  }

  readinessScore = Math.max(0, Math.min(100, readinessScore));

  let readinessStatus: "optimal" | "normal" | "low" | "danger" = "normal";
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
    date: todayStr,
    performanceReadiness: {
      score: Math.round(readinessScore),
      confidence: readinessConfidence,
      status: readinessStatus
    },
    recoveryStatus: {
      score: recoveryRes.score,
      confidence: recoveryRes.confidence,
      status: recoveryRes.status as any
    },
    sleepHealth: {
      score: sleepRes.score,
      confidence: sleepRes.confidence,
      status: sleepRes.status as any
    },
    nutritionAdequacy: {
      score: nutritionRes.score,
      confidence: nutritionRes.confidence,
      status: nutritionRes.status as any
    },
    psychologicalLoad: {
      score: mentalRes.score,
      confidence: mentalRes.confidence,
      status: mentalRes.status as any
    },
    medicalRisk: {
      flags: riskRes.flags,
      level: riskRes.level
    },
    globalActionPriority: riskRes.globalActionPriority,
    acwr: numericAcwr || undefined
  };
};
