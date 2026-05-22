import { NutrientDefinition } from "./foodTypes";

export const CoreNutrients: Record<string, NutrientDefinition> = {
  CALORIES: { id: "kcal", name: "Énergie", unit: "kcal", category: "macro" },
  PROTEINS: { id: "protein", name: "Protéines", unit: "g", category: "macro" },
  CARBS: { id: "carbs", name: "Glucides", unit: "g", category: "macro" },
  FAT: { id: "fat", name: "Lipides", unit: "g", category: "macro" },
  FIBER: { id: "fiber", name: "Fibres", unit: "g", category: "macro" },
  SUGAR: { id: "sugar", name: "Sucres", unit: "g", category: "macro" },
  SAT_FAT: { id: "sat_fat", name: "Acides gras saturés", unit: "g", category: "macro" },
  SODIUM: { id: "sodium", name: "Sodium", unit: "mg", category: "micro_mineral" },
  POTASSIUM: { id: "potassium", name: "Potassium", unit: "mg", category: "micro_mineral" },
  CALCIUM: { id: "calcium", name: "Calcium", unit: "mg", category: "micro_mineral" },
  MAGNESIUM: { id: "magnesium", name: "Magnésium", unit: "mg", category: "micro_mineral" },
  IRON: { id: "iron", name: "Fer", unit: "mg", category: "micro_mineral" },
  ZINC: { id: "zinc", name: "Zinc", unit: "mg", category: "micro_mineral" },
  VIT_D: { id: "vit_d", name: "Vitamine D", unit: "mcg", category: "micro_vitamin" },
  VIT_B12: { id: "vit_b12", name: "Vitamine B12", unit: "mcg", category: "micro_vitamin" },
  VIT_C: { id: "vit_c", name: "Vitamine C", unit: "mg", category: "micro_vitamin" },
  CAFFEINE: { id: "caffeine", name: "Caféine", unit: "mg", category: "other" },
  ALCOHOL: { id: "alcohol", name: "Alcool", unit: "g", category: "other" },
  WATER: { id: "water", name: "Eau", unit: "g", category: "macro" }
};
