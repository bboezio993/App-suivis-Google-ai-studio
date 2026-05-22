import { AppState } from "../../store/useStore";
import { ModularEngineResult } from "./types";
import { Driver } from "./engine";
import { buildNutritionDaySummary } from "./mealLogEngine";

export function runNutritionEngine(state: AppState): ModularEngineResult {
  const todayStr = new Date().toISOString().split("T")[0];

  const summary = buildNutritionDaySummary(state.mealLogs, todayStr);
  const totalConsCal = summary.totalCalories;
  const totalPro = summary.totalProtein;
  const totalCar = summary.totalCarbs;
  const totalFat = summary.totalFat;
  const limits: string[] = [...summary.limits];

  const weightKg = state.userProfile?.general?.weight;
  const heightCm = state.userProfile?.general?.height;
  const age = state.userProfile?.general?.age;
  const gender = state.userProfile?.general?.gender;

  let bmr: number | null = null;
  if (weightKg && heightCm && age && gender) {
     const s = gender === 'female' ? -161 : 5;
     bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;
  }

  const activeCalToday = state.metrics
    .filter((m) => (m.type === "active_calories" || m.type === "activity_calories") && m.timestamp.startsWith(todayStr))
    .reduce((a, b) => a + b.value, 0);

  const totalExpenditure = bmr !== null ? bmr + activeCalToday : null;
  const energyBalance = totalExpenditure !== null ? totalConsCal - totalExpenditure : null;

  let ffm: number | null = null;
  if (state.userProfile?.general?.weight) {
    if ((state.userProfile as any)?.general?.bodyFatPercentage) {
      ffm = state.userProfile.general.weight * (1 - (state.userProfile as any).general.bodyFatPercentage / 100);
    }
  }

  const activeExerciseCal = state.garminActivities
    .filter((a) => a.date.startsWith(todayStr))
    .reduce((sum, act) => sum + (act.calories || 0), 0);
  
  const hasSufficientNutritionData = summary.isComplete || summary.presentMeals.length >= 3;
  
  const energyAvailability = (ffm !== null && hasSufficientNutritionData) ? (totalConsCal - activeExerciseCal) / ffm : null;

  const dataUsed = ["meal_logs"];
  const dataMissing: string[] = [];
  const positiveDrivers: Driver[] = [];
  const negativeDrivers: Driver[] = [];

  let nutritionScore = 50;
  let confidence = summary.confidence;

  if (bmr === null) {
      limits.push("Dépense de base (BMR) non calculable précisément (profil biométrique incomplet).");
  }

  if (hasSufficientNutritionData) {
    if (bmr === null) confidence -= 20;
    if (ffm === null) confidence -= 10;
    confidence = Math.max(10, confidence);

    let eaScore = 20; 
    let proRatio = 1;
    let carbsRatio = 1;
    
    if (weightKg) {
      proRatio = Math.min(2, totalPro / (weightKg * 1.6));
      carbsRatio = Math.min(2, totalCar / (weightKg * 4));
    } else {
      limits.push("Analyse des ratios macro-nutritionnels impossible (poids manquant).");
    }
    
    if (energyAvailability !== null) {
      eaScore = energyAvailability >= 30 ? 20 : 5;
    } else {
      limits.push("Disponibilité énergétique non calculable précisément (masse maigre inconnue).");
      eaScore = 15; // neutral contribution
    }
    
    nutritionScore = Math.round((proRatio * 40) + (carbsRatio * 40) + eaScore);
    
    positiveDrivers.push({
      metricId: "protein_intake",
      label: "Apport Protéique",
      impact: proRatio >= 0.8 ? "positive" : "neutral",
      value: `${totalPro.toFixed(0)}g`,
      note: weightKg ? `Ratio : ${(totalPro / weightKg).toFixed(1)}g/kg (cible: 1.6g/kg).` : `Total protéique absorbé`
    });
  } else {
    dataMissing.push("meal_logs_today");
    nutritionScore = 50;
    // confidence handled by summary 
  }

  nutritionScore = Math.min(100, Math.max(0, nutritionScore));

  let status: "optimal" | "adequate" | "deficit" | "watch" = "adequate";
  if (nutritionScore > 80) status = "optimal";
  else if (nutritionScore < 40) status = "watch";
  else if (nutritionScore < 60) status = "deficit";

  let secureWording = "Disponibilité énergétique adéquate pour soutenir l'effort et la régulation cellulaire basale.";
  if (status === "watch" || status === "deficit") {
    secureWording = "Disponibilité énergétique possiblement basse si les apports nutritionnels saisis sont complets.";
  }

  return {
    score: nutritionScore,
    status,
    confidence,
    positiveDrivers,
    negativeDrivers,
    dataUsed,
    dataMissing,
    limits,
    secureWording
  };
}
