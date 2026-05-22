import { MealLog, NutritionDaySummary } from "../../domain/nutrition/foodTypes";
import { NormalizedMetric } from "../../types";

export function buildNutritionDaySummary(mealLogs: MealLog[], dateStr: string, metrics: NormalizedMetric[] = []): NutritionDaySummary {
  const dayLogs = mealLogs.filter(l => l.date === dateStr);
  const dayMetrics = metrics.filter(m => m.timestamp && m.timestamp.startsWith(dateStr));
  
  const hydrationMetric = dayMetrics.find(m => m.type === "hydration_volume");
  
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, water = hydrationMetric ? hydrationMetric.value : 0;
  let sugars = 0, satFat = 0, sodium = 0, potassium = 0, calcium = 0, magnesium = 0, iron = 0, zinc = 0, vitC = 0, vitD = 0, vitB12 = 0;
  
  let missingNutrients: string[] = [];
  let approximatedPortions = 0;
  let missingSourceFoods = 0;
  let recipesWithoutClearPortions = 0;
  
  const presentMeals = new Set(dayLogs.map(l => l.mealType));

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
      if (item.missingNutrients) {
        missingNutrients.push(...item.missingNutrients);
      }
    });
  });

  const isComplete = presentMeals.has("breakfast") && presentMeals.has("lunch") && presentMeals.has("dinner") && calories > 1200;
  
  let confidence = isComplete ? 80 : (dayLogs.length >= 3 ? 50 : 20);
  if (approximatedPortions > 1) confidence -= 10;
  
  const limits = [];
  if (!isComplete) limits.push("Saisie alimentaire probablement incomplète (repas principaux manquants ou < 1200 kcal).");
  if (approximatedPortions > 0) limits.push(`${approximatedPortions} portion(s) évaluée(s) avec une précision incertaine.`);
  if (water === 0) limits.push("Hydratation non renseignée.");
  
  const missingMeals = ["breakfast", "lunch", "dinner"].filter(m => !presentMeals.has(m as any)) as any[];

  return {
    date: dateStr,
    totalCalories: calories,
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    totalFiber: fiber,
    totalSugars: sugars,
    totalSaturatedFat: satFat,
    totalHydrationMl: water, // From items + potential drinks later
    sodium,
    potassium,
    calcium,
    magnesium,
    iron,
    zinc,
    vitC,
    vitD,
    vitB12,
    presentMeals: Array.from(presentMeals) as any,
    missingMeals,
    isComplete,
    confidence,
    limits,
    missingNutrients: Array.from(new Set(missingNutrients)),
    approximatedPortions,
    recipesWithoutClearPortions,
    foodsWithoutSource: missingSourceFoods,
    micronutrients: [] // Will expand later 
  };
}
