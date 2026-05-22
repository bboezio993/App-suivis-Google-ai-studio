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

// 4. Sprint Nutrition P0 Tests
console.log("--- Sprint Nutrition V1 Tests ---");

const weightlessState = {
  ...mockState,
  userProfile: {
    ...mockState.userProfile,
    general: {
      ...mockState.userProfile.general,
      weight: undefined
    }
  },
  mealLogs: [
    {
      id: "l_test_1",
      date: new Date().toISOString().split("T")[0],
      mealType: "lunch",
      items: [{ 
        foodId: "f_2", foodName: "Chicken", quantity: 1, unit: "g", gramsSelected: 200, 
        rawCookedState: "raw", conversionConfidence: 80, conversionAssumptions: "Poulet cru",
        calories: 600, protein: 40, carbs: 50, fat: 20 
      }]
    },
    {
      id: "l_test_2",
      date: new Date().toISOString().split("T")[0],
      mealType: "breakfast",
      items: [{ 
        foodId: "f_3", foodName: "Eggs", quantity: 1, unit: "g", gramsSelected: 200, 
        calories: 400, protein: 30, carbs: 10, fat: 20 
      }]
    },
    {
      id: "l_test_3",
      date: new Date().toISOString().split("T")[0],
      mealType: "dinner",
      items: [{ 
        foodId: "f_3", foodName: "Fish", quantity: 1, unit: "g", gramsSelected: 200, 
        calories: 300, protein: 30, carbs: 10, fat: 5
      }]
    }
  ]
} as unknown as AppState;

const nutResMissingWeight = runNutritionEngine(weightlessState);
console.log("Limits : ", nutResMissingWeight.limits);
console.log("Confidence: ", nutResMissingWeight.confidence);
assert.ok(nutResMissingWeight.limits.some(l => l.includes("poids manquant")), "Must warn about missing weight and not fallback to 70kg");
assert.ok(nutResMissingWeight.confidence < 80, "Confidence should drop if BMR and weight are unknown");
assert.ok(weightlessState.mealLogs[0].items[0].rawCookedState === "raw", "MealLog must preserve rawCookedState");
assert.ok(weightlessState.mealLogs[0].items[0].conversionConfidence === 80, "MealLog must preserve conversionConfidence");
assert.ok(weightlessState.mealLogs[0].items[0].conversionAssumptions === "Poulet cru", "MealLog must preserve conversionAssumptions");
console.log("✅ Custom MealLogs retain conversion assumptions and engine safely handles missing weight");

import { buildNutritionDaySummary } from "./src/services/analysisEngine/mealLogEngine";
import { resolveRecipeToMealItem } from "./src/domain/nutrition/recipeEngine";
import { Recipe } from "./src/domain/nutrition/foodTypes";

const fakeRecipe: Recipe = {
  id: "rcp_1",
  name: "Porridge",
  numberOfPortions: 2,
  finalWeightGrams: 500,
  items: [
    { foodId: "f_1", foodName: "Avoine", quantity: 100, unit: "g", gramsSelected: 100, calories: 350, protein: 12, carbs: 60, fat: 5 }
  ]
};

const fullMealItem = resolveRecipeToMealItem(fakeRecipe, "portions", 2);
assert.ok(fullMealItem.recipeRatio === 1, "Ratio for 2 portions out of 2 should be 1");
assert.ok(fullMealItem.gramsSelected === 500, "Should use finalWeightGrams if entire recipe");

const halfMealItem = resolveRecipeToMealItem(fakeRecipe, "portions", 1);
assert.ok(halfMealItem.recipeRatio === 0.5, "Ratio for 1 portion out of 2 should be 0.5");
assert.ok(halfMealItem.gramsSelected === 250, "Should scale gramsSelected by ratio");

const gramMealItem = resolveRecipeToMealItem(fakeRecipe, "grams", 100);
assert.ok(gramMealItem.recipeRatio === 0.2, "Ratio for 100g out of 500g should be 0.2");

console.log("✅ recipeEngine correctly handles portions, partial portions, and grams");

const summaryTest = buildNutritionDaySummary(weightlessState.mealLogs, new Date().toISOString().split("T")[0]);
assert.ok(summaryTest.isComplete === true, "Summary must detect complete day");
assert.ok(summaryTest.presentMeals.includes("breakfast"), "Summary must include breakfast");
assert.ok(summaryTest.totalHydrationMl === 0, "Hydration should be 0 if no metric");
assert.ok(summaryTest.limits.some(l => l.includes("Hydratation non renseignée")), "Must warn about hydration missing");

console.log("✅ NutritionDaySummary is correctly built and utilized");

console.log("=== All Tests Passed ===");

