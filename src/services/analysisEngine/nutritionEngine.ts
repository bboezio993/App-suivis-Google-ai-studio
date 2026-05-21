import { AppState } from "../../store/useStore";
import { ModularEngineResult } from "./types";
import { Driver } from "./engine";

export function runNutritionEngine(state: AppState): ModularEngineResult {
  const todayStr = new Date().toISOString().split("T")[0];

  const todayMealLogs = state.mealLogs.filter((ml) => ml.date === todayStr);
  let totalConsCal = 0;
  let totalPro = 0;
  let totalCar = 0;
  let totalFat = 0;

  todayMealLogs.forEach((meal) => {
    meal.items.forEach((it) => {
      totalConsCal += it.calories || 0;
      totalPro += it.protein || 0;
      totalCar += it.carbs || 0;
      totalFat += it.fat || 0;
    });
  });

  const weightKg = state.userProfile?.general?.weight || 70;
  const bmr = 10 * weightKg + 6.25 * (state.userProfile?.general?.height || 175) - 5 * (state.userProfile?.general?.age || 28) + 5;
  const activeCalToday = state.metrics
    .filter((m) => (m.type === "active_calories" || m.type === "activity_calories") && m.timestamp.startsWith(todayStr))
    .reduce((a, b) => a + b.value, 0);

  const totalExpenditure = bmr + (activeCalToday || 500);
  const energyBalance = totalConsCal - totalExpenditure;

  // Availability: (Energy Intake - Active Exercise Energy) / Fat-Free-Mass (FFM guessed @ 80%)
  const ffm = weightKg * 0.8;
  const activeExerciseCal = state.garminActivities
    .filter((a) => a.date.startsWith(todayStr))
    .reduce((sum, act) => sum + (act.calories || 0), 0);
  
  const hasSufficientNutritionData = todayMealLogs.length >= 2 || totalConsCal > 800;
  const energyAvailability = (ffm > 0 && hasSufficientNutritionData) ? (totalConsCal - activeExerciseCal) / ffm : null;

  const dataUsed = ["meal_logs"];
  const dataMissing: string[] = [];
  const limits: string[] = [];
  const positiveDrivers: Driver[] = [];
  const negativeDrivers: Driver[] = [];

  let nutritionScore = 50;
  let confidence = 0;

  if (hasSufficientNutritionData) {
    confidence = 90;
    const proRatio = Math.min(2, totalPro / (weightKg * 1.6));
    const carbsRatio = Math.min(2, totalCar / (weightKg * 4));
    let eaScore = 15;
    if (energyAvailability !== null) {
      eaScore = energyAvailability >= 30 ? 20 : 5;
    }
    nutritionScore = Math.round((proRatio * 50) + (carbsRatio * 30) + eaScore);
    
    positiveDrivers.push({
      metricId: "protein_intake",
      label: "Apport Protéique",
      impact: proRatio >= 0.8 ? "positive" : "neutral",
      value: `${totalPro.toFixed(0)}g`,
      note: `Ratio : ${(totalPro / weightKg).toFixed(1)}g/kg (cible: 1.6g/kg).`
    });
  } else {
    dataMissing.push("meal_logs_today");
    nutritionScore = 45;
    confidence = 30;
    limits.push("Absence de logs alimentaires suffisants pour modéliser précisément le ravitaillement métabolique ou la disponibilité énergétique.");
  }

  nutritionScore = Math.min(100, Math.max(0, nutritionScore));

  let status: "optimal" | "adequate" | "deficit" | "risk" = "adequate";
  if (nutritionScore > 80) status = "optimal";
  else if (nutritionScore < 40) status = "risk";
  else if (nutritionScore < 60) status = "deficit";

  let secureWording = "Disponibilité énergétique adéquate pour soutenir l'effort et la régulation cellulaire basale.";
  if (status === "risk" || status === "deficit") {
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
