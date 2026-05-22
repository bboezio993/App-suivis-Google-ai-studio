import { MealLog, NutritionDaySummary, MealItem } from "../../domain/nutrition/foodTypes";
import { foodNutrientDatabase } from "../../domain/nutrition/foodNutrientValues";
import { internalFoodDatabase } from "../../domain/nutrition/foodDatabase";
import { CoreNutrients } from "../../domain/nutrition/nutrientDefinitions";
import { NormalizedMetric } from "../../types";

export function buildNutritionDaySummary(mealLogs: MealLog[], dateStr: string, metrics: NormalizedMetric[] = []): NutritionDaySummary {
  const dayLogs = mealLogs.filter(l => l.date === dateStr);
  const dayMetrics = metrics.filter(m => m.timestamp && m.timestamp.startsWith(dateStr));
  
  const hydrationMetrics = dayMetrics.filter(m => m.type === "hydration_volume");
  const totalHydration = hydrationMetrics.reduce((sum, m) => sum + (m.value || 0), 0);
  
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  let water = totalHydration;
  
  let totalFiber = 0;
  let totalSugars = 0;
  let totalSaturatedFat = 0;
  let totalSodium = 0;
  let totalPotassium = 0;
  let totalCalcium = 0;
  let totalMagnesium = 0;
  let totalIron = 0;
  let totalZinc = 0;
  let totalVitC = 0;
  let totalVitD = 0;
  let totalVitB12 = 0;

  // Track confidence & missing data
  let missingNutrients: string[] = [];
  let approximatedPortions = 0;
  let missingSourceFoods = 0;
  let recipesWithoutClearPortions = 0;

  const presentMeals = new Set(dayLogs.map(l => l.mealType));

  // Initialize a structure to accumulate micronutrients with confidence weighting
  const accumulators: Record<string, { totalVal: number; totalWeight: number; sumConfidenceProduct: number; missingReasons: Set<string>; isPartiallyMissing: boolean }> = {};
  
  // Set up accumulators for each core nutrient
  Object.keys(CoreNutrients).forEach(key => {
    const nutDef = CoreNutrients[key];
    accumulators[nutDef.id] = {
      totalVal: 0,
      totalWeight: 0,
      sumConfidenceProduct: 0,
      missingReasons: new Set<string>(),
      isPartiallyMissing: false
    };
  });

  // Main aggregator helper
  const addIntake = (foodId: string, gramsSelected: number) => {
    const dbFood = internalFoodDatabase.find(f => f.id === foodId);
    const nutrientValues = foodNutrientDatabase[foodId];

    if (nutrientValues && nutrientValues.length > 0) {
      nutrientValues.forEach(nv => {
        const acc = accumulators[nv.nutrientId];
        if (!acc) return; // Not in core definitions

        if (nv.isMissing) {
          acc.isPartiallyMissing = true;
          if (nv.missingReason) acc.missingReasons.add(nv.missingReason);
          missingNutrients.push(nv.nutrientId);
        } else {
          const val = ((nv.valuePer100g || 0) * gramsSelected) / 100;
          acc.totalVal += val;
          acc.totalWeight += gramsSelected;
          acc.sumConfidenceProduct += (nv.confidence || 80) * gramsSelected;
        }
      });

      // Special check: if any core nutrient is omitted from the database entry for this food,
      // flag it as missing/not_measured rather than silently ignoring or forcing to zero.
      Object.keys(CoreNutrients).forEach(key => {
        const nutId = CoreNutrients[key].id;
        if (nutId === "kcal" || nutId === "protein" || nutId === "carbs" || nutId === "fat") return;
        
        const hasNut = nutrientValues.some(nv => nv.nutrientId === nutId);
        if (!hasNut) {
          accumulators[nutId].isPartiallyMissing = true;
          accumulators[nutId].missingReasons.add("not_measured");
          missingNutrients.push(nutId);
        }
      });

    } else if (dbFood) {
      // Fallback to plain food definitions macros/fiber/sodium if nutrient database doesn't have details
      const fallbackValues: { nutrientId: string; val: number }[] = [
        { nutrientId: "fiber", val: dbFood.fiber || 0 },
        { nutrientId: "sugar", val: dbFood.sugars || 0 },
        { nutrientId: "sat_fat", val: dbFood.saturatedFat || 0 },
        { nutrientId: "sodium", val: dbFood.sodium || 0 }
      ];

      fallbackValues.forEach(f => {
        const acc = accumulators[f.nutrientId];
        if (acc) {
          acc.totalVal += (f.val * gramsSelected) / 100;
          acc.totalWeight += gramsSelected;
          acc.sumConfidenceProduct += 60 * gramsSelected; // lower fallback confidence
        }
      });

      // All others are missing
      Object.keys(CoreNutrients).forEach(key => {
        const nutId = CoreNutrients[key].id;
        if (nutId === "kcal" || nutId === "protein" || nutId === "carbs" || nutId === "fat") return;
        if (["fiber", "sugar", "sat_fat", "sodium"].includes(nutId)) return;

        accumulators[nutId].isPartiallyMissing = true;
        accumulators[nutId].missingReasons.add("unknown");
        missingNutrients.push(nutId);
      });
    }
  };

  // Loop through days meals
  dayLogs.forEach(log => {
    log.items.forEach(item => {
      calories += item.calories || 0;
      protein += item.protein || 0;
      carbs += item.carbs || 0;
      fat += item.fat || 0;
      
      if (item.sourceType === "recipe" && !item.recipeServingCount && !item.recipeServingWeightGrams) {
        recipesWithoutClearPortions++;
      }
      
      if (!item.sourceFoodId && item.sourceType !== "recipe") {
        missingSourceFoods++;
      }
      if (item.conversionConfidence && item.conversionConfidence < 80) {
        approximatedPortions++;
      }

      if (item.sourceType === "recipe" && item.expandedIngredients && item.expandedIngredients.length > 0) {
        // Expand recipe ingredients
        const ratio = item.recipeRatio || 1;
        item.expandedIngredients.forEach(ing => {
          const scaledGrams = (ing.gramsSelected || 0) * ratio;
          if (scaledGrams > 0) {
            addIntake(ing.foodId, scaledGrams);
          }
        });
      } else {
        // Direct food item consumption
        if (item.gramsSelected > 0) {
          addIntake(item.foodId, item.gramsSelected);
        }
      }

      if (item.missingNutrients) {
        missingNutrients.push(...item.missingNutrients);
      }
    });
  });

  // Extract totals from accumulators
  totalFiber = accumulators["fiber"]?.totalVal || 0;
  totalSugars = accumulators["sugar"]?.totalVal || 0;
  totalSaturatedFat = accumulators["sat_fat"]?.totalVal || 0;
  totalSodium = accumulators["sodium"]?.totalVal || 0;
  totalPotassium = accumulators["potassium"]?.totalVal || 0;
  totalCalcium = accumulators["calcium"]?.totalVal || 0;
  totalMagnesium = accumulators["magnesium"]?.totalVal || 0;
  totalIron = accumulators["iron"]?.totalVal || 0;
  totalZinc = accumulators["zinc"]?.totalVal || 0;
  totalVitC = accumulators["vit_c"]?.totalVal || 0;
  totalVitD = accumulators["vit_d"]?.totalVal || 0;
  totalVitB12 = accumulators["vit_b12"]?.totalVal || 0;

  const micronutrientsList = Object.keys(CoreNutrients).map(key => {
    const nutDef = CoreNutrients[key];
    const acc = accumulators[nutDef.id];
    
    const confidence = acc.totalWeight > 0 
      ? Math.round(acc.sumConfidenceProduct / acc.totalWeight) 
      : 80;

    return {
      nutrientId: nutDef.id,
      name: nutDef.name,
      value: Number(acc.totalVal.toFixed(2)),
      unit: nutDef.unit,
      isMissing: acc.totalWeight === 0 && acc.isPartiallyMissing,
      missingNotes: acc.totalWeight === 0 ? Array.from(acc.missingReasons).join(", ") || "Donnée indisponible" : undefined,
      confidence
    };
  });

  const isComplete = presentMeals.has("breakfast") && presentMeals.has("lunch") && presentMeals.has("dinner") && calories > 1200;
  
  let confidence = isComplete ? 85 : (dayLogs.length >= 3 ? 60 : 30);
  if (approximatedPortions > 1) confidence -= 15;
  if (recipesWithoutClearPortions > 0) confidence -= 10;
  confidence = Math.max(10, confidence);

  const limits: string[] = [];
  if (!isComplete) limits.push("Saisie alimentaire probablement incomplète (repas principaux manquants ou < 1200 kcal).");
  if (approximatedPortions > 0) limits.push(`${approximatedPortions} portion(s) évaluée(s) avec une précision incertaine.`);
  if (recipesWithoutClearPortions > 0) limits.push(`${recipesWithoutClearPortions} recette(s) sans portion claire consommée(s).`);
  if (water === 0) limits.push("Hydratation non renseignée.");
  
  const missingMeals = (["breakfast", "lunch", "dinner"].filter(m => !presentMeals.has(m as any)) as any[]);

  return {
    date: dateStr,
    totalCalories: calories,
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    totalFiber: Number(totalFiber.toFixed(1)),
    totalSugars: Number(totalSugars.toFixed(1)),
    totalSaturatedFat: Number(totalSaturatedFat.toFixed(1)),
    totalHydrationMl: water,
    sodium: Number(totalSodium.toFixed(0)),
    potassium: Number(totalPotassium.toFixed(0)),
    calcium: Number(totalCalcium.toFixed(0)),
    magnesium: Number(totalMagnesium.toFixed(0)),
    iron: Number(totalIron.toFixed(1)),
    zinc: Number(totalZinc.toFixed(1)),
    vitC: Number(totalVitC.toFixed(1)),
    vitD: Number(totalVitD.toFixed(1)),
    vitB12: Number(totalVitB12.toFixed(2)),
    presentMeals: Array.from(presentMeals) as any,
    missingMeals,
    isComplete,
    confidence,
    limits,
    missingNutrients: Array.from(new Set(missingNutrients)),
    approximatedPortions,
    recipesWithoutClearPortions,
    foodsWithoutSource: missingSourceFoods,
    micronutrients: micronutrientsList
  };
}
