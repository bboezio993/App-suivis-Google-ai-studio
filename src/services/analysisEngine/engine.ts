import { AppState } from "../../store/useStore";
import {
  EngineScores,
  NormalizedMetric,
  HooperLog,
  GarminActivity,
  SessionRPE,
} from "../../types";
import { calculateBaseline } from "./baselines";
import { calculateEWMA_ACWR } from "./math";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  const targetDateStr = targetDate.toISOString().split("T")[0];

  // Fusionner TSS Garmin et RPE (RPE * Durée = sRPE Load)
  // Priorité au TSS s'il existe, sinon sRPE

  for (let i = 0; i < days; i++) {
    const d = new Date(targetTime - i * MS_PER_DAY);
    const dateStr = d.toISOString().split("T")[0];

    let dailyLoad = 0;

    // Activités du jour
    const dayActivities = activities.filter((a) => a.date.startsWith(dateStr));
    dayActivities.forEach((act) => {
      if (act.tss) {
        dailyLoad += act.tss;
      } else {
        // Chercher un RPE correspondant
        const rpe = rpeLogs.find((r) => r.activityId === act.id);
        if (rpe) {
          dailyLoad += rpe.rpe * rpe.durationMinutes;
        } else {
          // Estimation brute basée sur la durée et la FC si dispo, sinon forfait
          const durationMins = act.duration
            ? parseInt(act.duration.split(":")[0]) * 60 +
              parseInt(act.duration.split(":")[1])
            : 60;
          dailyLoad += durationMins * 5; // Estimation moyenne (RPE 5)
        }
      }
    });

    // Index 0 = targetDate, Index N-1 = targetDate - N jours
    // Pour l'EWMA, on veut l'ordre chronologique : [J-N, ..., J-1, J]
    loads[days - 1 - i] = dailyLoad;
  }

  return loads;
};

/**
 * Le Moteur Principal de Fusion (CDSS)
 */
export const runAnalysisEngine = (state: AppState): EngineScores => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 1. Récupération des Baselines (Couche B)
  const hrvBaseline = calculateBaseline(state.metrics, "hrv_rmssd", todayStr);
  const rhrBaseline = calculateBaseline(state.metrics, "rhr", todayStr);
  const sleepBaseline = calculateBaseline(
    state.metrics,
    "sleep_duration",
    todayStr,
  );

  // 2. Récupération des données subjectives récentes (Couche G)
  const latestHooper =
    state.hooperLogs.find((l) => l.date === todayStr) ||
    state.hooperLogs.find(
      (l) =>
        l.date ===
        new Date(today.getTime() - MS_PER_DAY).toISOString().split("T")[0],
    );

    // 3. Calcul de la Charge (Couche C)
    let analysisDate = today;
    // Si la dernière activité remonte à plus de 7 jours (ex: vieil export historique), 
    // on aligne le moteur sur la date de la dernière activité pour que l'ACWR soit pertinent
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

  // --- INITIALISATION DES SCORES ---
  const scores: EngineScores = {
    date: todayStr,
    performanceReadiness: { score: 50, confidence: 0, status: "normal" },
    recoveryStatus: { score: 50, confidence: 0, status: "adapting" },
    sleepHealth: { score: 50, confidence: 0, status: "adequate" },
    nutritionAdequacy: { score: 50, confidence: 0, status: "adequate" }, // Placeholder for Couche F
    psychologicalLoad: { score: 50, confidence: 0, status: "moderate" },
    medicalRisk: { flags: [], level: "none" },
    globalActionPriority: "Collecte de données en cours...",
    acwr,
  };

  // --- COUCHE D : RECOVERY STATUS ---
  let recoveryScore = 50;
  let recoveryConfidence = 0;

  if (hrvBaseline && rhrBaseline) {
    recoveryConfidence += 60;
    // HRV Z-Score: > 0 is good, < 0 is bad
    // RHR Z-Score: < 0 is good, > 0 is bad
    const hrvFactor = Math.max(-2, Math.min(2, hrvBaseline.zScore28d)) * 10; // -20 to +20
    const rhrFactor = Math.max(-2, Math.min(2, -rhrBaseline.zScore28d)) * 10; // -20 to +20 (inverted)
    recoveryScore = 50 + hrvFactor + rhrFactor;
  }

  if (latestHooper) {
    recoveryConfidence += 40;
    // Fatigue & Soreness (1 = good, 7 = bad)
    const subjFactor =
      (8 - latestHooper.fatigue + (8 - latestHooper.soreness)) / 2; // 1 to 7 (higher is better)
    const normalizedSubj = (subjFactor - 4) * 10; // -30 to +30
    recoveryScore += normalizedSubj;
  }

  recoveryScore = Math.max(0, Math.min(100, recoveryScore));
  scores.recoveryStatus.score = Math.round(recoveryScore);
  scores.recoveryStatus.confidence = recoveryConfidence;

  if (recoveryScore > 75) scores.recoveryStatus.status = "recovered";
  else if (recoveryScore > 40) scores.recoveryStatus.status = "adapting";
  else if (recoveryScore > 20) scores.recoveryStatus.status = "fatigued";
  else scores.recoveryStatus.status = "exhausted";

  // --- COUCHE E : SLEEP HEALTH ---
  let sleepScore = 50;
  let sleepConfidence = 0;
  let sleepDebt = 0;

  if (sleepBaseline) {
    sleepConfidence += 70;
    // Calculate sleep debt over 7 days (target 8h)
    const recentSleep = state.metrics
      .filter(
        (m) =>
          m.type === "sleep_duration" &&
          new Date(m.timestamp).getTime() > today.getTime() - 7 * MS_PER_DAY,
      )
      .map((m) => m.value);

    sleepDebt = recentSleep.reduce((acc, val) => acc + Math.max(0, 8 - val), 0);

    // Score based on Z-score and absolute duration
    const durationFactor =
      Math.max(-2, Math.min(2, sleepBaseline.zScore28d)) * 15;
    sleepScore = 50 + durationFactor - sleepDebt * 2;
  }

  if (latestHooper) {
    sleepConfidence += 30;
    const subjSleep = 8 - latestHooper.sleepQuality; // 1 to 7 (higher is better)
    sleepScore += (subjSleep - 4) * 10;
  }

  sleepScore = Math.max(0, Math.min(100, sleepScore));
  scores.sleepHealth.score = Math.round(sleepScore);
  scores.sleepHealth.confidence = sleepConfidence;

  if (sleepDebt > 10 || sleepScore < 25)
    scores.sleepHealth.status = "severe_debt";
  else if (sleepDebt > 5 || sleepScore < 50) scores.sleepHealth.status = "debt";
  else if (sleepScore > 75) scores.sleepHealth.status = "optimal";
  else scores.sleepHealth.status = "adequate";

  // --- COUCHE G : PSYCHOLOGICAL LOAD ---
  let psychScore = 50;
  let psychConfidence = 0;

  if (latestHooper) {
    psychConfidence += 50;
    // Stress & Mood (1 = good, 7 = bad)
    const stressVal = latestHooper.stress;
    const moodVal = latestHooper.mood;

    psychScore = ((stressVal + moodVal) / 14) * 100; // 0 to 100 (higher = worse load)
  }

  // Intégration du Screening Hebdomadaire (PSS, PHQ-9, GAD-7)
  const latestScreening =
    state.weeklyScreeningLogs && state.weeklyScreeningLogs.length > 0
      ? state.weeklyScreeningLogs[state.weeklyScreeningLogs.length - 1]
      : null;

  if (latestScreening) {
    psychConfidence += 50;
    // PSS (0-40), PHQ-9 (0-27), GAD-7 (0-21) -> Lower is better
    // Normalize to 0-100 where 100 is excellent mental health
    const pssNorm = 100 - (latestScreening.pssScore / 40) * 100;
    const phq9Norm = 100 - (latestScreening.phq9Score / 27) * 100;
    const gad7Norm = 100 - (latestScreening.gad7Score / 21) * 100;

    const screeningScore = pssNorm * 0.4 + phq9Norm * 0.3 + gad7Norm * 0.3;

    // Fusion Hooper (Quotidien) + Screening (Hebdo)
    // psychScore is currently "higher is worse", screeningScore is "higher is better"
    // Let's invert screeningScore to match psychScore (higher = worse)
    const invertedScreeningScore = 100 - screeningScore;

    if (psychConfidence === 100) {
      psychScore = psychScore * 0.4 + invertedScreeningScore * 0.6; // Le screening clinique pèse plus lourd
    } else {
      psychScore = invertedScreeningScore;
    }
  }

  scores.psychologicalLoad.score = Math.round(psychScore);
  scores.psychologicalLoad.confidence = psychConfidence;

  if (psychScore > 80) scores.psychologicalLoad.status = "overload";
  else if (psychScore > 60) scores.psychologicalLoad.status = "high";
  else if (psychScore > 30) scores.psychologicalLoad.status = "moderate";
  else scores.psychologicalLoad.status = "low";

  // --- COUCHE C : PERFORMANCE READINESS ---
  let readinessScore = 50;
  let readinessConfidence = 0;

  if (acwr > 0) {
    readinessConfidence += 50;
    // Optimal ACWR is 0.8 - 1.3
    if (acwr >= 0.8 && acwr <= 1.3) readinessScore += 20;
    else if (acwr > 1.5)
      readinessScore -= 30; // Danger zone
    else if (acwr < 0.8) readinessScore -= 10; // Detraining
  }

  if (recoveryConfidence > 0) {
    readinessConfidence += 50;
    readinessScore = (readinessScore + recoveryScore) / 2;
  }

  readinessScore = Math.max(0, Math.min(100, readinessScore));
  scores.performanceReadiness.score = Math.round(readinessScore);
  scores.performanceReadiness.confidence = readinessConfidence;

  if (acwr > 1.5 || recoveryScore < 20)
    scores.performanceReadiness.status = "danger";
  else if (readinessScore > 75) scores.performanceReadiness.status = "optimal";
  else if (readinessScore > 40) scores.performanceReadiness.status = "normal";
  else scores.performanceReadiness.status = "low";

  // --- RED FLAGS & MEDICAL RISK ---
  if (acwr > 1.5)
    scores.medicalRisk.flags.push(
      "Surcharge aiguë (ACWR > 1.5) : Risque de blessure élevé.",
    );
  if (scores.sleepHealth.status === "severe_debt")
    scores.medicalRisk.flags.push(
      "Dette de sommeil sévère : Altération cognitive et physique.",
    );
  if (
    scores.recoveryStatus.status === "exhausted" &&
    scores.psychologicalLoad.status === "overload"
  ) {
    scores.medicalRisk.flags.push(
      "Épuisement systémique (Physique + Mental) : Risque de surentraînement ou burnout.",
    );
  }
  if (latestHooper && latestHooper.mood >= 6 && latestHooper.stress >= 6) {
    scores.medicalRisk.flags.push(
      "Détresse psychologique signalée : Envisager un screening clinique (PHQ-9/GAD-7).",
    );
  }

  if (scores.medicalRisk.flags.length > 2)
    scores.medicalRisk.level = "clinical_referral";
  else if (scores.medicalRisk.flags.length > 0)
    scores.medicalRisk.level = "warning";
  else if (acwr > 1.3 || sleepDebt > 5) scores.medicalRisk.level = "monitor";

  // --- GLOBAL ACTION PRIORITY ---
  if (
    scores.medicalRisk.level === "clinical_referral" ||
    scores.medicalRisk.level === "warning"
  ) {
    scores.globalActionPriority =
      "Alerte Santé : " + scores.medicalRisk.flags[0];
  } else if (
    scores.sleepHealth.status === "severe_debt" ||
    scores.sleepHealth.status === "debt"
  ) {
    scores.globalActionPriority =
      "Priorité Absolue : Rembourser la dette de sommeil.";
  } else if (scores.performanceReadiness.status === "danger") {
    scores.globalActionPriority =
      "Danger : Réduire drastiquement la charge d'entraînement.";
  } else if (scores.recoveryStatus.status === "fatigued") {
    scores.globalActionPriority =
      "Récupération Active : Privilégier le repos ou l'intensité très légère.";
  } else if (scores.performanceReadiness.status === "optimal") {
    scores.globalActionPriority =
      "Feu Vert : Fenêtre optimale pour la progression et la haute intensité.";
  } else {
    scores.globalActionPriority =
      "Maintien : Poursuivre l'entraînement selon le plan.";
  }

  // Si pas assez de données
  if (readinessConfidence < 30 && recoveryConfidence < 30) {
    scores.globalActionPriority =
      "Calibrage en cours : Continuez d'importer vos données et de remplir le Hooper.";
  }

  return scores;
};
