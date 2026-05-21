import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { NutritionLogger } from "../features/nutrition/NutritionLogger";
import { 
  Droplets, 
  Apple, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Flame, 
  Activity, 
  Scale, 
  Wine,
  TrendingDown,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nutrition() {
  const mealLogs = useStore(state => state.mealLogs);
  const addMetric = useStore(state => state.addMetric);
  const metrics = useStore(state => state.metrics);
  const userProfile = useStore(state => state.userProfile);
  const garminActivities = useStore(state => state.garminActivities);

  const [waterCups, setWaterCups] = useState(3); // default logged water cups (250ml each)

  const todayStr = new Date().toISOString().split("T")[0];
  const todayMeals = mealLogs.filter(log => log.date === todayStr);

  // Compute daily totals
  let dailyCalories = 0;
  let dailyProtein = 0;
  let dailyCarbs = 0;
  let dailyFat = 0;

  todayMeals.forEach(meal => {
    meal.items.forEach(it => {
      dailyCalories += it.calories || 0;
      dailyProtein += it.protein || 0;
      dailyCarbs += it.carbs || 0;
      dailyFat += it.fat || 0;
    });
  });

  // Calculate Garmin-based expenditures
  const dailyActiveCalFromMetrics = metrics.find(m => m.type === "active_calories" && m.timestamp.startsWith(todayStr))?.value || 0;
  const dailyActivityCalFromSessions = garminActivities
    .filter(a => a.date.startsWith(todayStr))
    .reduce((acc, a) => acc + (a.calories || 0), 0);
  
  const recentActivities = garminActivities.slice(0, 7);
  const avgActiveCal = recentActivities.length > 0 
    ? recentActivities.reduce((acc, a) => acc + (a.calories || 0), 0) / recentActivities.length
    : 450;

  const activeBurn = dailyActiveCalFromMetrics > 0 ? dailyActiveCalFromMetrics : (dailyActivityCalFromSessions > 0 ? dailyActivityCalFromSessions : avgActiveCal);

  const weightKg = userProfile?.general?.weight || 68;
  const bmr = Math.round(10 * weightKg + 6.25 * (userProfile?.general?.height || 172) - 5 * (userProfile?.general?.age || 26) + 4);
  const targetCalories = Math.round(bmr + activeBurn);
  const energyBalance = dailyCalories - targetCalories;

  // Dynamic targets (1.8g/kg protein, 4g/kg carbohydrate, 1g/kg fat)
  const targetProtein = Math.round(weightKg * 1.8);
  const targetCarbs = Math.round(weightKg * 4.0);
  const targetFat = Math.round(weightKg * 1.0);

  // Hydration tracking
  const handleAddWater = () => {
    setWaterCups(curr => curr + 1);
    addMetric({
      id: `water_${Date.now()}`,
      source: "manual",
      timestamp: new Date().toISOString(),
      type: "hydration_volume",
      value: 250,
      unit: "ml",
      confidenceScore: 100
    });
  };

  const currentWaterVolMl = waterCups * 250;
  const targetWaterVolMl = 2500;

  return (
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nutrition & Métabolisme</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adaptez vos apports réels aux dépenses physiques estimées pour optimiser votre récupération.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono py-1 px-2">
          Couche F Active
        </Badge>
      </div>

      {/* Main dashboard widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Calories Ring & Balance */}
        <div className="bento-card p-6 border border-border/60">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Balance Énergétique</span>
            <span className={`text-3xl font-black font-mono block mt-1 ${energyBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {energyBalance > 0 ? '+' : ''}{energyBalance} <span className="text-xs font-normal text-muted-foreground">kcal</span>
            </span>
          </div>
          <div className="space-y-1.5 mt-4">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Apports (Alimentation) :</span>
              <span className="text-emerald-500">+{dailyCalories}</span>
            </div>
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Métabolisme (BMR) :</span>
              <span className="text-red-400">-{bmr}</span>
            </div>
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Dépense Active (Garmin) :</span>
              <span className="text-red-400">-{Math.round(activeBurn)}</span>
            </div>
          </div>
        </div>

        {/* Protein bar */}
        <div className="bento-card p-6 flex flex-col justify-between h-48 border border-border/60">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Protéines (Bâtisseur)</span>
            <span className="text-3xl font-black font-mono block mt-1 text-indigo-400">
              {dailyProtein}g <span className="text-xs font-normal text-muted-foreground">/ {targetProtein}g</span>
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Seuil de synthèse musculaire :</span>
              <span>{Math.round(Math.min(100, (dailyProtein / targetProtein) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (dailyProtein / targetProtein) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Carbohydrates bar */}
        <div className="bento-card p-6 flex flex-col justify-between h-48 border border-border/60">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Glucides (Glycogène)</span>
            <span className="text-3xl font-black font-mono block mt-1 text-amber-500">
              {dailyCarbs}g <span className="text-xs font-normal text-muted-foreground">/ {targetCarbs}g</span>
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Recharge énergétique :</span>
              <span>{Math.round(Math.min(100, (dailyCarbs / targetCarbs) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (dailyCarbs / targetCarbs) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Liquid Hydration tracker card */}
        <div className="bento-card p-6 flex flex-col justify-between h-48 border border-border/60">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Suivi Hydratation</span>
              <span className="text-3xl font-black font-mono block mt-1 text-sky-400">
                {currentWaterVolMl / 1000} <span className="text-xs font-normal text-muted-foreground">/ {targetWaterVolMl / 1000} L</span>
              </span>
            </div>
            <Button 
              onClick={handleAddWater}
              size="sm" 
              className="w-8 h-8 rounded-full bg-sky-500 text-white hover:bg-sky-600 flex items-center justify-center p-0 shrink-0"
            >
              <Plus size={15} />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Hydratation active :</span>
              <span>{Math.min(100, Math.round((currentWaterVolMl / targetWaterVolMl) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-400 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (currentWaterVolMl / targetWaterVolMl) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logger module split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bento-card p-6">
          <NutritionLogger />
        </div>

        {/* Nutritional guidelines and historical logs sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bento-card p-6 border border-border">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-1.5">
              <Info size={16} className="text-primary" />
              Équivalents Évolution Cru v. Cuit
            </h4>
            <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <p>
                Rappelez-vous que la cuisson multiplie le poids de vos glucides par réabsorption d'eau :
              </p>
              <div className="p-3 bg-secondary/15 rounded-xl border space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span>Pâtes crues (&times;2.7)</span>
                  <span>100g &rarr; 270g cuit</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span>Riz blanc cru (&times;2.8)</span>
                  <span>100g &rarr; 280g cuit</span>
                </div>
              </div>
              <p className="text-[11px]">
                Renseignez toujours l'état réel (cru ou cuit) de votre aliment pour préserver le modèle d'apport.
              </p>
            </div>
          </div>

          {/* Slipped inline list of historical meals logged today */}
          <div className="bento-card p-6 border border-border">
            <h4 className="font-bold text-sm mb-3">Repas loggés aujourd'hui</h4>
            {todayMeals.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Aucun repas saisi pour aujourd'hui</div>
            ) : (
              <div className="space-y-3">
                {todayMeals.map((log) => (
                  <div key={log.id} className="p-3 border rounded-xl border-border bg-secondary/5 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase text-[10px] text-primary">{log.mealType}</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {log.items.reduce((sum, item) => sum + (item.calories || 0), 0)} kcal
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight truncate">
                      {log.items.map(it => `${it.foodName} (${it.gramsSelected}g)`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
