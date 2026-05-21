export interface FoodItem {
  id: string;
  source: "ciqual" | "usda_fdc" | "user" | "internal";
  sourceFoodId?: string;
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
  
  // Custom nutritional profile per 100g (or 100ml)
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber?: number; // g
  sugars?: number; // g
  saturatedFat?: number; // g
  sodium?: number; // mg
}

export interface ServingUnit {
  id: string;
  foodId?: string;
  label: string;
  gramsEquivalent?: number;
  mlEquivalent?: number;
  unitType: "mass" | "volume" | "piece" | "household" | "serving";
  confidence: number;
}

export interface MealItem {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: "g" | "ml" | "piece" | "serving" | string;
  gramsSelected: number;
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

export interface NutrientSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}
