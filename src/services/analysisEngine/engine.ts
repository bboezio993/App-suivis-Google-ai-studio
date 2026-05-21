import { AppState } from "../../store/useStore";
import {
  EngineScores,
  NormalizedMetric,
  HooperLog,
  GarminActivity,
  SessionRPE,
  MealLog,
  PainLog,
} from "../../types";
import { calculateBaseline } from "./baselines";
import { calculateEWMA_ACWR } from "./math";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Driver {
  metricId: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  value: string | number;
  note: string;
}

export interface ReadinessResult {
  score: number;
  status: "high" | "normal" | "reduced" | "low" | "blocked";
  confidence: number;
  primaryDrivers: Driver[];
  protectiveFactors: Driver[];
  riskFactors: Driver[];
  explanation: string;
  recommendedAction: string;
  evidenceLevel: "robust" | "probable" | "exploratory" | "weak_signal";
  medicalBoundary: boolean;
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
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // --- 1. BASELINES (Couche B-90d) ---
  const hrvBaseline = calculateBaseline(state.metrics, "hrv_rmssd", todayStr);
  const rhrBaseline = calculateBaseline(state.metrics, "rhr", todayStr);
  const sleepBaseline = calculateBaseline(state.metrics, "sleep_duration", todayStr);

  // Get yesterday to align logs if today's checkins are empty
  const yesterdayStr = new Date(today.getTime() - MS_PER_DAY).toISOString().split("T")[0];

  // --- 2. SUBJECTIVE CHECKINS (Couche G) ---
  const latestHooper =
    state.hooperLogs.find((l) => l.date === todayStr) ||
    state.hooperLogs.find((l) => l.date === yesterdayStr);

  // --- 3. TRAINING LOAD & ACWR ---
  let analysisDate = today;
  if (state.garminActivities.length > 0) {
    const lastActivityDate = new Date(state.garminActivities[0].date);
    if (today.getTime() - lastActivityDate.getTime() > 7 * MS_PER_DAY) {
      analysisDate = lastActivityDate;
    }
  }

  const dailyLoads35d = buildDailyLoads(
    state.garminActivities,
    state.sessionRpeLogs,
    35,
    analysisDate,
  );
  
  const acwrData = calculateEWMA_ACWR(dailyLoads35d);
  const acwr = acwrData.ratio;

  // Monotony & Strain
  const acuteMean = acwrData.acute;
  const acuteLoads = dailyLoads35d.slice(28); // 7 days
  const sumAcute = acuteLoads.reduce((a, b) => a + b, 0);
  const meanAcute = sumAcute / 7;
  const devAcuteSum = acuteLoads.reduce((a, b) => a + Math.pow(b - meanAcute, 2), 0);
  const stdAcute = Math.sqrt(devAcuteSum / 7) || 1; 
  const monotony = meanAcute / stdAcute;
  const strain = sumAcute * monotony;

  // --- 4. NUTRITION & HYDRATION ADEQUACY ---
  const todayMealLogs = state.mealLogs.filter(ml => ml.date === todayStr);
  let totalConsCal = 0;
  let totalPro = 0;
  let totalCar = 0;
  let totalFat = 0;
  let totalFib = 0;
  let totalSod = 0;

  todayMealLogs.forEach(meal => {
    meal.items.forEach(it => {
      totalConsCal += it.calories || 0;
      totalPro += it.protein || 0;
      totalCar += it.carbs || 0;
      totalFat += it.fat || 0;
    });
  });

  const weightKg = state.userProfile?.general?.weight || 70;
  const bmr = 10 * weightKg + 6.25 * (state.userProfile?.general?.height || 175) - 5 * (state.userProfile?.general?.age || 28) + 5;
  const activeCalToday = state.metrics
    .filter(m => m.type === "calories" && m.timestamp.startsWith(todayStr))
    .reduce((a, b) => a + b.value, 0);

  const totalExpenditure = bmr + (activeCalToday || 500); 
  const energyBalance = totalConsCal - totalExpenditure;

  // Availability: (Energy Intake - Active Exercise Energy) / Fat-Free-Mass (FFM guessed @ 80%)
  const ffm = weightKg * 0.8;
  const activeExerciseCal = state.garminActivities
    .filter(a => a.date.startsWith(todayStr))
    .reduce((sum, act) => sum + (act.calories || 0), 0);
  const energyAvailability = ffm > 0 ? (totalConsCal - activeExerciseCal) / ffm : 0;

  let nutritionScore = 50;
  let nutritionConfidence = 0;
  if (todayMealLogs.length > 0) {
    nutritionConfidence = 90;
    // Perfect covering of proteins (~1.6g/kg) and positive/balanced energy
    const proRatio = Math.min(2, totalPro / (weightKg * 1.6));
    const carbsRatio = Math.min(2, totalCar / (weightKg * 4));
    nutritionScore = Math.round((proRatio * 50) + (carbsRatio * 30) + (energyAvailability >= 30 ? 20 : 5));
  } else {
    // defaults if no log
    nutritionScore = 45;
    nutritionConfidence = 30;
  }
  nutritionScore = Math.min(100, Math.max(0, nutritionScore));

  let nutritionStatus: "optimal" | "adequate" | "deficit" | "risk" = "adequate";
  if (nutritionScore > 80) nutritionStatus = "optimal";
  else if (nutritionScore < 40) nutritionStatus = "risk";
  else if (nutritionScore < 60) nutritionStatus = "deficit";

  // --- 5. INITIALIZE SCORES ---
  const scores: EngineScores = {
    date: todayStr,
    performanceReadiness: { score: 50, confidence: 0, status: "normal" },
    recoveryStatus: { score: 50, confidence: 0, status: "adapting" },
    sleepHealth: { score: 50, confidence: 0, status: "adequate" },
    nutritionAdequacy: { score: nutritionScore, confidence: nutritionConfidence, status: nutritionStatus },
    psychologicalLoad: { score: 50, confidence: 0, status: "moderate" },
    medicalRisk: { flags: [], level: "none" },
    globalActionPriority: "Modélisation en cours...",
    acwr,
  };

  // --- 6. RECOVERY STATUS ENGINE ---
  let recoveryScore = 50;
  let recoveryConfidence = 0;
  const drivers: Driver[] = [];

  if (hrvBaseline && rhrBaseline) {
    recoveryConfidence += 60;
    const hrvZ = hrvBaseline.zScore28d;
    const rhrZ = rhrBaseline.zScore28d;

    const hrvFactor = Math.max(-2, Math.min(2, hrvZ)) * 10; 
    const rhrFactor = Math.max(-2, Math.min(2, -rhrZ)) * 10; 

    recoveryScore = 50 + hrvFactor + rhrFactor;

    drivers.push({
      metricId: "hrv_rmssd",
      label: "Variabilité Cardiaque (HRV)",
      impact: hrvZ > 0.5 ? "positive" : hrvZ < -0.5 ? "negative" : "neutral",
      value: `${Math.round(hrvBaseline.currentValue)} ms`,
      note: `Z-Score 28j de ${hrvZ.toFixed(1)}. Tendence : ${hrvBaseline.trend}.`
    });

    drivers.push({
      metricId: "rhr",
      label: "FC au repos (RHR)",
      impact: rhrZ < -0.5 ? "positive" : rhrZ > 0.5 ? "negative" : "neutral",
      value: `${Math.round(rhrBaseline.currentValue)} bpm`,
      note: `Z-Score 28j de ${rhrZ.toFixed(1)}.`
    });
  }

  if (latestHooper) {
    recoveryConfidence += 40;
    const subjFactor = (8 - latestHooper.fatigue + (8 - latestHooper.soreness)) / 2; 
    const normalizedSubj = (subjFactor - 4) * 10; 
    recoveryScore += normalizedSubj;

    drivers.push({
      metricId: "subjective_fatigue",
      label: "Fatigue Subjective",
      impact: latestHooper.fatigue < 3 ? "positive" : latestHooper.fatigue > 5 ? "negative" : "neutral",
      value: `${latestHooper.fatigue}/7`,
      note: `Sensation reportée le matin.`
    });
  }

  recoveryScore = Math.max(0, Math.min(100, recoveryScore));
  scores.recoveryStatus.score = Math.round(recoveryScore);
  scores.recoveryStatus.confidence = recoveryConfidence;

  if (recoveryScore > 75) scores.recoveryStatus.status = "recovered";
  else if (recoveryScore > 40) scores.recoveryStatus.status = "adapting";
  else if (recoveryScore > 20) scores.recoveryStatus.status = "fatigued";
  else scores.recoveryStatus.status = "exhausted";

  // --- 7. SLEEP HEALTH ENGINE ---
  let sleepScore = 50;
  let sleepConfidence = 0;
  let sleepDebt = 0;

  if (sleepBaseline) {
    sleepConfidence += 70;
    const recentSleep = state.metrics
      .filter(m => m.type === "sleep_duration" && new Date(m.timestamp).getTime() > today.getTime() - 7 * MS_PER_DAY)
      .map(m => m.value);

    // Sum up sleep debt (8hr target)
    sleepDebt = recentSleep.reduce((acc, val) => acc + Math.max(0, 8 - val), 0);

    const durationFactor = Math.max(-2, Math.min(2, sleepBaseline.zScore28d)) * 15;
    sleepScore = 50 + durationFactor - sleepDebt * 2;
  }

  if (latestHooper) {
    sleepConfidence += 30;
    const subjSleep = 8 - latestHooper.sleepQuality; 
    sleepScore += (subjSleep - 4) * 10;
  }

  sleepScore = Math.max(0, Math.min(100, sleepScore));
  scores.sleepHealth.score = Math.round(sleepScore);
  scores.sleepHealth.confidence = sleepConfidence;

  if (sleepDebt > 10 || sleepScore < 25) scores.sleepHealth.status = "severe_debt";
  else if (sleepDebt > 5 || sleepScore < 50) scores.sleepHealth.status = "debt";
  else if (sleepScore > 75) scores.sleepHealth.status = "optimal";
  else scores.sleepHealth.status = "adequate";

  // --- 8. PSYCHOLOGICAL LOAD ENGINE ---
  let psychScore = 50;
  let psychConfidence = 0;

  if (latestHooper) {
    psychConfidence += 50;
    psychScore = ((latestHooper.stress + latestHooper.mood) / 14) * 100;
  }

  const latestScreening = state.weeklyScreeningLogs && state.weeklyScreeningLogs.length > 0
    ? state.weeklyScreeningLogs[state.weeklyScreeningLogs.length - 1]
    : null;

  if (latestScreening) {
    psychConfidence += 50;
    const pssNorm = 100 - (latestScreening.pssScore / 40) * 100;
    const phq9Norm = 100 - (latestScreening.phq9Score / 27) * 100;
    const gad7Norm = 100 - (latestScreening.gad7Score / 21) * 100;
    const screeningScore = pssNorm * 0.4 + phq9Norm * 0.3 + gad7Norm * 0.3;
    const invertedScreening = 100 - screeningScore;

    if (psychConfidence === 100) {
      psychScore = psychScore * 0.4 + invertedScreening * 0.6;
    } else {
      psychScore = invertedScreening;
    }
  }

  scores.psychologicalLoad.score = Math.round(psychScore);
  scores.psychologicalLoad.confidence = psychConfidence;

  if (psychScore > 80) scores.psychologicalLoad.status = "overload";
  else if (psychScore > 60) scores.psychologicalLoad.status = "high";
  else if (psychScore > 30) scores.psychologicalLoad.status = "moderate";
  else scores.psychologicalLoad.status = "low";

  // --- 9. PERFORMANCE READINESS ENGINE (Fusion) ---
  let readinessScore = 50;
  let readinessConfidence = 0;

  if (acwr > 0) {
    readinessConfidence += 50;
    if (acwr >= 0.8 && acwr <= 1.3) readinessScore += 20;
    else if (acwr > 1.5) readinessScore -= 30;
    else if (acwr < 0.8) readinessScore -= 10;
  }

  if (recoveryConfidence > 0) {
    readinessConfidence += 50;
    readinessScore = (readinessScore + recoveryScore) / 2;
  }

  // Soft boundaries from users' subjective checkins
  if (latestHooper) {
    if (latestHooper.fatigue >= 6) readinessScore -= 15;
    if (latestHooper.soreness >= 6) readinessScore -= 10;
  }

  // Pain log capping check
  const activePainLogs = state.painLogs.filter(p => p.date === todayStr);
  const maxPainIntensity = activePainLogs.reduce((max, log) => Math.max(max, log.intensityActive, log.intensityRest), 0);
  if (maxPainIntensity >= 7) {
    readinessScore = Math.min(30, readinessScore); // Protectively cap readiness
    scores.medicalRisk.flags.push(`Douleur intense signalée (${maxPainIntensity}/10).`);
  }

  // Illness symptom capping
  const checkinWithIllness = state.hooperLogs.find(l => l.date === todayStr && l.notes?.toLowerCase().includes("malade"));
  if (checkinWithIllness) {
    readinessScore = Math.min(25, readinessScore); 
    scores.medicalRisk.flags.push("Symptômes de maladie signalés.");
  }

  readinessScore = Math.max(0, Math.min(100, readinessScore));
  scores.performanceReadiness.score = Math.round(readinessScore);
  scores.performanceReadiness.confidence = readinessConfidence;

  if (acwr > 1.5 || recoveryScore < 20 || maxPainIntensity >= 7) scores.performanceReadiness.status = "danger";
  else if (readinessScore > 75) scores.performanceReadiness.status = "optimal";
  else if (readinessScore > 40) scores.performanceReadiness.status = "normal";
  else scores.performanceReadiness.status = "low";

  // --- 10. RISKS & WARNING FLAGS ---
  if (acwr > 1.5) scores.medicalRisk.flags.push(`Surcharge d'entraînement aiguë (ACWR = ${acwr.toFixed(2)}).`);
  if (sleepDebt > 8) scores.medicalRisk.flags.push(`Dette de sommeil élevée (${sleepDebt.toFixed(1)}h).`);
  if (energyAvailability > 0 && energyAvailability < 30) {
    scores.medicalRisk.flags.push("Suspicion de faible disponibilité énergétique (RED-S).");
  }

  if (scores.medicalRisk.flags.length >= 3) scores.medicalRisk.level = "clinical_referral";
  else if (scores.medicalRisk.flags.length > 0) scores.medicalRisk.level = "warning";
  else if (acwr > 1.3 || sleepDebt > 5) scores.medicalRisk.level = "monitor";

  // --- 11. GLOBAL ACTION PRIORITY WORDING ---
  if (scores.medicalRisk.level === "clinical_referral") {
    scores.globalActionPriority = "Alerte de santé : Évaluation professionnelle fortement recommandée.";
  } else if (scores.performanceReadiness.status === "danger") {
    scores.globalActionPriority = "Priorité : Récupération stricte. Réduire la charge physique.";
  } else if (sleepDebt > 6) {
    scores.globalActionPriority = "Priorité : Rembourser la dette de sommeil accumulée.";
  } else if (scores.performanceReadiness.status === "optimal") {
    scores.globalActionPriority = "Feu Vert : Fenêtre idéale pour l'endurance active ou haute intensité.";
  } else if (maxPainIntensity >= 4) {
    scores.globalActionPriority = "Vigilance : Intensité modérée requise, douleur musculaire à surveiller.";
  } else {
    scores.globalActionPriority = "Maintien : Poursuivre la planification standard de l'entraînement.";
  }

  return scores;
};
