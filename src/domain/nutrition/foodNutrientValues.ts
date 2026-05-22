import { FoodNutrientValue } from "./foodTypes";

export const foodNutrientDatabase: Record<string, FoodNutrientValue[]> = {
  // Keyed by foodId
  "poulet_blanc": [
    { nutrientId: "sodium", valuePer100g: 50, unit: "mg", isMissing: false, confidence: 90, source: "Ciqual 2020" },
    { nutrientId: "potassium", valuePer100g: 250, unit: "mg", isMissing: false, confidence: 90, source: "Ciqual 2020" },
    { nutrientId: "iron", valuePer100g: 1.2, unit: "mg", isMissing: false, confidence: 90, source: "Ciqual 2020" },
    { nutrientId: "vit_d", isMissing: true, missingReason: "not_measured", confidence: 0, unit: "mcg" }
  ],
  "saumon_cru": [
    { nutrientId: "vit_d", valuePer100g: 10, unit: "mcg", isMissing: false, confidence: 85, source: "Ciqual 2020" },
    { nutrientId: "sodium", valuePer100g: 40, unit: "mg", isMissing: false, confidence: 85, source: "Ciqual 2020" }
  ],
  "pates_crues": [
    { nutrientId: "fiber", valuePer100g: 3, unit: "g", isMissing: false, confidence: 90, source: "Ciqual 2020" },
    { nutrientId: "sodium", valuePer100g: 2, unit: "mg", isMissing: false, confidence: 90, source: "Ciqual 2020" }
  ]
};
