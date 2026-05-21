import assert from "node:assert";
import { AppState } from "./src/store/useStore";
import { runAnalysisEngine } from "./src/services/analysisEngine/engine";
import { runNutritionEngine } from "./src/services/analysisEngine/nutritionEngine";
import { metricRegistry } from "./src/domain/metrics/metricRegistry";

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

console.log("=== Aura Elite : Test Suite ===");

// 1. App Engine base tests
const engineScores = runAnalysisEngine(mockState);
assert.ok(engineScores.performanceReadiness.score > 0, "Engine must return a valid numeric score");
assert.notEqual(engineScores.performanceReadiness.status, "danger", "Status should never be danger (medical term)");
assert.notEqual(engineScores.performanceReadiness.status as any, "clinical_referral", "Should not use medical terminology");
console.log("✅ Main Analysis Engine runs without medical terminology and outputs scores");

// 2. Nutrition Engine tests
const noNutritionState = { 
  ...mockState, 
  userProfile: {
    ...mockState.userProfile,
    general: {
      ...mockState.userProfile.general,
      // Intentionally missing bodyFatPercentage
    }
  },
  mealLogs: [
    {
      id: "l_1",
      date: new Date().toISOString().split("T")[0],
      mealType: "breakfast",
      items: [{ foodId: "f_1", foodName: "Eggs", quantity: 1, unit: "serving", gramsSelected: 200, calories: 500, protein: 30, carbs: 10, fat: 20 }]
    },
    {
      id: "l_2",
      date: new Date().toISOString().split("T")[0],
      mealType: "lunch",
      items: [{ foodId: "f_2", foodName: "Chicken", quantity: 1, unit: "serving", gramsSelected: 200, calories: 600, protein: 40, carbs: 50, fat: 20 }]
    },
    {
      id: "l_3",
      date: new Date().toISOString().split("T")[0],
      mealType: "dinner",
      items: [{ foodId: "f_3", foodName: "Fish", quantity: 1, unit: "serving", gramsSelected: 200, calories: 400, protein: 30, carbs: 30, fat: 10 }]
    }
  ]
} as unknown as AppState;

const nutRes = runNutritionEngine(noNutritionState);
assert.ok(
  nutRes.limits.some(l => l.includes("masse maigre inconnue")), 
  "Energy Availability logic must warn about unknown lean body mass"
);
console.log("✅ Nutrition Engine correctly refuses precise calculation without robust mass data");

// Test incomplete day
const noNutritionStateIncomplete = {
  ...noNutritionState,
  mealLogs: [noNutritionState.mealLogs[0]]
} as unknown as AppState;
const nutResIncomplete = runNutritionEngine(noNutritionStateIncomplete);
assert.ok(
  nutResIncomplete.limits.some(l => l.includes("incomplète")), 
  "Nutrition logic must warn about incomplete day (only 1 meal)"
);
assert.ok(nutResIncomplete.confidence <= 50, "Confidence should be capped if meal logs are incomplete");
console.log("✅ Nutrition Engine correctly refuses precise calculation without sufficient meal logs");

// 3. Metric Registry tests
assert.ok(metricRegistry["stress_score"], "stress_score must be registered");
assert.ok(metricRegistry["respiration_rate"], "respiration_rate must be registered");
assert.ok(metricRegistry["hydration_volume"], "hydration_volume must be registered");
console.log("✅ Metric Registry contains expected types");

console.log("=== All Tests Passed ===");

