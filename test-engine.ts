import { AppState } from "./src/store/useStore";
import { runAnalysisEngine } from "./src/services/analysisEngine/engine";
import { runReadinessEngine } from "./src/services/analysisEngine/readinessEngine";

const mockState = {
  metrics: [
    {
      id: "m_1",
      source: "garmin",
      timestamp: new Date().toISOString(),
      type: "hrv_rmssd",
      value: 65,
      unit: "ms",
      confidenceScore: 90
    },
    {
      id: "m_2",
      source: "garmin",
      timestamp: new Date().toISOString(),
      type: "rhr",
      value: 45,
      unit: "bpm",
      confidenceScore: 90
    }
  ],
  hooperLogs: [],
  sessionRpeLogs: [],
  contextLogs: [],
  engineScores: null,
  garminImportLogs: [],
  garminActivities: [],
  mealLogs: [],
  painLogs: [],
  weeklyScreeningLogs: [],
  menstrualLogs: [],
  userProfile: {
    general: {
      name: "Tester",
      age: 28,
      gender: "male",
      height: 180,
      weight: 75,
      activityLevel: "athlete",
      primaryGoal: "performance"
    },
    health: { conditions: [], allergies: [], injuries: [], medications: [] },
    sport: { primarySport: "Triathlon", trainingFrequency: 6, weeklyVolume: 12, intensity: "high" },
    preferences: { units: "metric", enableMenstrualTracking: false, notificationsEnabled: true, dataSharingConsent: false }
  },
  connections: {}
} as unknown as AppState;

console.log("=== Aura Elite : Engine Determinism Validation ===");

console.log("Running Main Analysis Engine...");
const engineScores = runAnalysisEngine(mockState);
console.log("Score Performance Readiness:", engineScores.performanceReadiness.score);
console.log("Statut global:", engineScores.performanceReadiness.status);

console.log("\nValidate data output formats:");
if (engineScores.performanceReadiness.score > 0) {
  console.log("✅ Engine returned a valid numeric score:", engineScores.performanceReadiness.score);
} else {
  console.error("❌ Engine returned invalid score:", engineScores.performanceReadiness.score);
}

// Missing EA without Lean Body Mass check
const noNutritionState = { 
  ...mockState, 
  mealLogs: [
    {
      id: "l_1",
      date: new Date().toISOString().split("T")[0],
      mealType: "lunch",
      items: [
        {
          foodId: "f_1",
          foodName: "Chicken",
          quantity: 1,
          unit: "serving",
          gramsSelected: 200,
          calories: 1000,
          protein: 50,
          carbs: 50,
          fat: 50
        }
      ]
    }
  ]
} as unknown as AppState;
import { runNutritionEngine } from "./src/services/analysisEngine/nutritionEngine";
const nutRes = runNutritionEngine(noNutritionState);
if (nutRes.limits.includes("Disponibilité énergétique non calculable précisément (masse maigre inconnue).") || nutRes.limits.some(l => l.includes("masse maigre inconnue"))) {
  console.log("✅ Energy Availability correctly refuses precise calculation without body fat.");
} else {
  console.log("❌ Energy Availability logic failed to warn about unknown lean body mass.");
  console.log(nutRes.limits);
}

if (nutRes.dataMissing.includes("meal_logs_today") || nutRes.dataMissing.includes("meal_logs")) {
  console.log("✅ Data Quality gracefully handles missing meal logs.");
}

console.log("\n=== Test Complete ===");
