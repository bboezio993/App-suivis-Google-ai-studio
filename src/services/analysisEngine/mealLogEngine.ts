import { MealLog, NutritionDaySummary } from "../../domain/nutrition/foodTypes";

export function buildNutritionDaySummary(mealLogs: MealLog[], dateStr: string): NutritionDaySummary {
  const dayLogs = mealLogs.filter(l => l.date === dateStr);
  
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, water = 0;
  let missingNutrients: string[] = [];
  let approximatedPortions = 0;
  let missingSourceFoods = 0;
  
  const presentMeals = new Set(dayLogs.map(l => l.mealType));

  dayLogs.forEach(log => {
    log.items.forEach(item => {
      calories += item.calories || 0;
      protein += item.protein || 0;
      carbs += item.carbs || 0;
      fat += item.fat || 0;
      
      if (!item.sourceFoodId) {
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
  
  const missingMeals = ["breakfast", "lunch", "dinner"].filter(m => !presentMeals.has(m as any)) as any[];

  return {
    date: dateStr,
    totalCalories: calories,
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    totalFiber: fiber,
    totalHydrationMl: water, // From items + potential drinks later
    presentMeals: Array.from(presentMeals),
    missingMeals,
    isComplete,
    confidence,
    limits,
    missingNutrients: Array.from(new Set(missingNutrients)),
    approximatedPortions,
    recipesWithoutClearPortions: 0,
    foodsWithoutSource: missingSourceFoods,
    micronutrients: [] // Will expand later 
  };
}
