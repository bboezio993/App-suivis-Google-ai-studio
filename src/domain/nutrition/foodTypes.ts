export interface NutrientDefinition {
  id: string;
  name: string;
  unit: "g" | "mg" | "mcg" | "kcal" | "IU";
  category: "macro" | "micro_mineral" | "micro_vitamin" | "other";
}

export interface FoodNutrientValue {
  nutrientId: string;
  valuePer100g?: number;
  isMissing: boolean;
  confidence: number;
  sourceOverride?: string;
  reasonIfMissing?: string;
}

export interface FoodItem {
  id: string;
  source: "ciqual" | "usda_fdc" | "user" | "internal";
  sourceFoodId?: string;
  sourceVersion?: string;
  sourceName?: string;
  importDate?: string;
  name: string;
  normalizedName: string;
  brand?: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  locale: "fr" | "en" | "multi";
  defaultUnit: "g" | "ml" | "piece" | "serving";
  ediblePortionFactor?: number;
  densityGPerMl?: number;
  rawCookedState?: "raw" | "cooked" | "prepared" | "unknown";
  confidence: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Base macros (for quick computation)
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  sugars?: number; // g
  saturatedFat?: number; // g
  sodium?: number; // mg
  
  // Extended micronutrients
  micronutrients?: FoodNutrientValue[];
}

export interface ServingUnit {
  id: string;
  foodId?: string;
  label: string;
  gramsEquivalent?: number;
  mlEquivalent?: number;
  unitType: "mass" | "volume" | "piece" | "household" | "serving";
  confidence: number;
  assumptions?: string;
}

export interface MealItem {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: "g" | "ml" | "piece" | "serving" | string;
  gramsSelected: number;
  conversionConfidence?: number;
  conversionAssumptions?: string;
  
  sourceFoodId?: string;
  nutritionVersion?: string;
  missingNutrients?: string[];

  sourceType?: "food" | "recipe";
  recipeId?: string;
  recipeServingCount?: number;
  recipeServingWeightGrams?: number;

  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  rawCookedState?: "raw" | "cooked";
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "intra_workout" | "post_workout";
  items: MealItem[];
  photoIds?: string[];
  hungerBefore?: number; // 1-5
  satietyAfter?: number; // 1-5
  digestionAfter?: number; // 1-5
  notes?: string;
}

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  gramsSelected: number;
  conversionConfidence?: number;
  conversionAssumptions?: string;
  rawCookedState?: "raw" | "cooked" | "prepared" | "unknown";
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  items: RecipeIngredient[];
  finalWeightGrams?: number;
  numberOfPortions?: number;
  totalNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  nutritionPerPortion?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt?: string;
  nutritionVersion?: string;
}

export interface NutritionDaySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  hydrationMl: number;
  mealCount: number;
  completenessScore: number;
  confidenceScore: number;
  limits: string[];
  missingValues: string[];
}

export interface CookingYieldFactor {
  foodId?: string;
  category?: string;
  fromState: "raw" | "cooked";
  toState: "raw" | "cooked";
  factor: number; // weight multiplier: raw * factor = cooked
  confidence: number;
  note: string;
}

