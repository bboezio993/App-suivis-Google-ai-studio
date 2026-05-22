import React from "react";
import { useStore } from "../store/useStore";
import { NutritionLogger } from "../features/nutrition/NutritionLogger";
import { buildNutritionDaySummary } from "../services/analysisEngine/mealLogEngine";
import { analyzeNutritionDay } from "../services/analysisEngine/nutritionEngine";
import { 
  Droplets, 
  Apple, 
  AlertCircle, 
  Plus, 
  Flame, 
  Activity, 
  Scale, 
  Info,
  Clock,
  ShieldAlert,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Heart,
  Sliders,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nutrition() {
  const storeState = useStore();
  const addMetric = useStore(state => state.addMetric);

  const todayStr = new Date().toISOString().split("T")[0];
  
  // High fidelity structures from our central engines
  const summary = buildNutritionDaySummary(storeState.mealLogs, todayStr, storeState.metrics);
  const analysis = analyzeNutritionDay(storeState, todayStr);

  const todayMeals = storeState.mealLogs.filter(log => log.date === todayStr);
  const weightKg = storeState.userProfile?.general?.weight;

  // Macro targets (derived dynamically from analysis targets)
  const targetCalories = analysis.targets?.calories ?? 2400;
  const targetProtein = analysis.targets?.protein ?? (weightKg ? Math.round(weightKg * 1.8) : 110);
  const targetCarbs = analysis.targets?.carbs ?? (weightKg ? Math.round(weightKg * 4.0) : 260);
  const targetFat = analysis.targets?.fat ?? 75;
  const targetWaterHtml = analysis.targets?.hydration ?? 2500;
  const targetFiber = analysis.targets?.fiber ?? 30;
  const targetSodium = analysis.targets?.sodium ?? 2300;
  const currentObjective = analysis.targets?.objective ?? "performance";

  // Goal customization state and functions
  const userGoal = storeState.userProfile?.nutritionGoal || {
    calories: { value: 2400, isUserDefined: false },
    proteinGPerKg: { value: 1.8, isUserDefined: false },
    carbsGPerKg: { value: 4.0, isUserDefined: false },
    fat: { value: 75, isUserDefined: false },
    fiber: { value: 30, isUserDefined: false },
    hydration: { value: 2500, isUserDefined: false },
    sodium: { value: 2300, isUserDefined: false },
    objective: "performance"
  };

  const handleUpdateGoalField = (field: string, val: any) => {
    const updatedGoal = {
      ...userGoal,
      [field]: field === "objective" ? val : { value: Number(val), isUserDefined: true }
    };
    storeState.updateUserProfile({
      nutritionGoal: updatedGoal
    });
  };

  const handleResetGoals = () => {
    const w = weightKg || 65;
    const defaultGoal = {
      calories: { value: Math.round(w * 35), isUserDefined: false },
      proteinGPerKg: { value: 1.8, isUserDefined: false },
      carbsGPerKg: { value: 4.0, isUserDefined: false },
      fat: { value: Math.round(w * 1.1), isUserDefined: false },
      fiber: { value: 30, isUserDefined: false },
      hydration: { value: 2500, isUserDefined: false },
      sodium: { value: 2300, isUserDefined: false },
      objective: "performance" as const
    };
    storeState.updateUserProfile({
      nutritionGoal: defaultGoal
    });
  };

  const handleAddWater = () => {
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

  // List of micronutrients for P6 block
  const trackingMicros = [
    { id: "sodium", name: "Sodium", normalMin: targetSodium, normalMax: 2300, unit: "mg" },
    { id: "potassium", name: "Potassium", normalMin: 3500, normalMax: 4700, unit: "mg" },
    { id: "calcium", name: "Calcium", normalMin: 1000, normalMax: 1200, unit: "mg" },
    { id: "magnesium", name: "Magnésium", normalMin: 400, normalMax: 420, unit: "mg" },
    { id: "iron", name: "Fer", normalMin: 14, normalMax: 18, unit: "mg" },
    { id: "zinc", name: "Zinc", normalMin: 11, normalMax: 15, unit: "mg" },
    { id: "vitC", name: "Vitamine C", normalMin: 90, normalMax: 110, unit: "mg" },
    { id: "vitD", name: "Vitamine D", normalMin: 15, normalMax: 50, unit: "mcg" },
    { id: "vitB12", name: "Vitamine B12", normalMin: 2.4, normalMax: 4.0, unit: "mcg" }
  ];

  return (
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nutrition & Métabolisme</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Adaptez vos apports réels aux dépenses physiques réelles sans fallbacks biométriques arbitraires.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono py-1 px-2 text-xs">
            Aura Engine V1
          </Badge>
          <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 font-mono py-1 px-2 text-xs">
            Indice de confiance : {analysis.confidence}%
          </Badge>
        </div>
      </div>

      {/* Main dashboard macro widgets - Fluid Grid-5 columns list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Card 1: Calories & Balance */}
        <div className="bento-card p-5 border border-border/60 flex flex-col justify-between h-44">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Balance Énergétique</span>
            {analysis.energyBalance !== null ? (
              <span className={`text-2xl font-black font-mono block mt-1 ${analysis.energyBalance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {analysis.energyBalance > 0 ? '+' : ''}{analysis.energyBalance} <span className="text-xs font-normal text-muted-foreground">kcal</span>
              </span>
            ) : (
              <span className="text-xs font-semibold flex items-center gap-1 text-muted-foreground mt-2">
                <AlertCircle size={14} className="text-orange-400 shrink-0" /> Profil incomplet
              </span>
            )}
          </div>
          <div className="space-y-1 mt-2 text-[11px] font-medium text-muted-foreground">
            <div className="flex justify-between">
              <span>Consommé :</span>
              <span className="text-emerald-500 font-bold">+{summary.totalCalories} / {targetCalories}</span>
            </div>
            {analysis.estimatedExpenditureKcal !== null ? (
              <div className="flex justify-between">
                <span>Dépense (BMR+Act.) :</span>
                <span className="text-red-400 font-bold">-{analysis.estimatedExpenditureKcal} kcal</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Active Garmin :</span>
                <span className="text-red-400 font-bold">
                  -{storeState.garminActivities
                    .filter(a => a.date && a.date.startsWith(todayStr))
                    .reduce((acc, a) => acc + (a.calories || 0), 0)} kcal
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Proteins */}
        <div className="bento-card p-5 flex flex-col justify-between h-44 border border-border/60">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Protéines</span>
              {userGoal.proteinGPerKg.isUserDefined && (
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[8px] py-0 px-1">Manuel</Badge>
              )}
            </div>
            <span className="text-2xl font-black font-mono block mt-1 text-indigo-400">
              {summary.totalProtein}g <span className="text-xs font-normal text-muted-foreground">/ {targetProtein}g</span>
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>Ratio : {analysis.proteinGPerKg !== null ? `${analysis.proteinGPerKg} g/kg` : "—"}</span>
              <span>{Math.round(Math.min(100, (summary.totalProtein / targetProtein) * 100))}%</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (summary.totalProtein / targetProtein) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Card 3: Carbohydrates */}
        <div className="bento-card p-5 flex flex-col justify-between h-44 border border-border/60">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Glucides</span>
              {userGoal.carbsGPerKg.isUserDefined && (
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[8px] py-0 px-1">Manuel</Badge>
              )}
            </div>
            <span className="text-2xl font-black font-mono block mt-1 text-amber-500">
              {summary.totalCarbs}g <span className="text-xs font-normal text-muted-foreground">/ {targetCarbs}g</span>
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>Ratio : {analysis.carbsGPerKg !== null ? `${analysis.carbsGPerKg} g/kg` : "—"}</span>
              <span>{Math.round(Math.min(100, (summary.totalCarbs / targetCarbs) * 100))}%</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (summary.totalCarbs / targetCarbs) * 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Card 4: Energy Availability (EA) - B3 Requirement */}
        <div className="bento-card p-5 flex flex-col justify-between h-44 border border-border/60">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Disponibilité Énergétique (EA)</span>
            <span className="text-2xl font-black font-mono block mt-1 text-rose-400">
              {analysis.energyAvailability !== null ? (
                `${Math.round(analysis.energyAvailability)} kcal`
              ) : (
                "N/A"
              )}
            </span>
          </div>
          <div className="space-y-1">
            {analysis.energyAvailability !== null ? (
              <>
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground leading-tight">
                  <span>Masse Maigre</span>
                  <span className={analysis.energyAvailability >= 45 ? "text-emerald-400" : analysis.energyAvailability >= 30 ? "text-amber-400" : "text-rose-400"}>
                    {analysis.energyAvailability >= 45 ? "Optimal" : analysis.energyAvailability >= 30 ? "Adéquat" : "Vigilance LEA"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {analysis.energyAvailability < 30 
                    ? "Peut suggérer des apports limités pour soutenir l'effort et la santé." 
                    : "Soutien physiologique adéquat des fonctions systémiques."}
                </p>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground leading-tight">
                  Données de % de gras ou de pesées insuffisantes pour évaluer la disponibilité active.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Liquid Hydration tracker card */}
        <div className="bento-card p-5 flex flex-col justify-between h-44 border border-border/60">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Hydratation</span>
              <span className="text-2xl font-black font-mono block mt-1 text-sky-400">
                {(summary.totalHydrationMl / 1000).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ {(targetWaterHtml / 1000).toFixed(1)} L</span>
              </span>
            </div>
            <Button 
              onClick={handleAddWater}
              size="sm" 
              className="w-7 h-7 rounded-full bg-sky-500 text-white hover:bg-sky-600 flex items-center justify-center p-0 shrink-0"
              id="btn-add-water-fast"
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>Saisie hydrique :</span>
              <span>{Math.min(100, Math.round((summary.totalHydrationMl / targetWaterHtml) * 100))}%</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-400 rounded-full transition-all" 
                style={{ width: `${Math.min(100, (summary.totalHydrationMl / targetWaterHtml) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main split layout spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Logger is the primary module */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bento-card p-6">
            <NutritionLogger />
          </div>

          {/* P6 - Micronutriments section */}
          <div className="bento-card p-6 border border-border/60">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Apple size={18} className="text-emerald-500" />
                Micronutriments & Oligo-éléments
              </h3>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Base FoodNutrient database
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Consommations micronutritionnelles agrégées directement depuis les bases de données nutritionnelles (CIQUAL / USDA).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trackingMicros.map(m => {
                const cov = analysis.micronutrientCoverage[m.id];
                const info = summary.micronutrients?.find(nut => nut.nutrientId === m.id);
                const isUnmeas = cov?.status === "unmeasured" || !info || info.isMissing;
                const value = cov?.value || 0;
                const percentage = isUnmeas ? 0 : Math.min(100, Math.round((value / m.normalMin) * 100));

                return (
                  <div key={m.id} className="p-3 border rounded-xl bg-secondary/15 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-foreground block">{m.name}</span>
                        <span className="text-[9px] text-muted-foreground">cible min : {m.normalMin} {m.unit}</span>
                      </div>
                      
                      {isUnmeas ? (
                        <Badge variant="outline" className="border-orange-500/20 bg-orange-500/5 text-orange-400 text-[8px] font-mono">
                          Non mesuré
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={`text-[8px] font-mono ${cov?.status === "met" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-amber-500/20 bg-amber-500/5 text-amber-500"}`}>
                          {cov?.status === "met" ? "Atteint" : "Bas"}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-mono font-black text-sm">
                          {isUnmeas ? "— " : value} <span className="text-[9px] font-normal text-muted-foreground">{m.unit}</span>
                        </span>
                        {!isUnmeas && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {percentage}%
                          </span>
                        )}
                      </div>

                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${cov?.status === "met" ? "bg-emerald-500" : "bg-amber-500"}`} 
                          style={{ width: `${percentage}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar right */}
        <div className="lg:col-span-4 space-y-6">

          {/* Goals Editor Box (Fulfills P1-5) */}
          <div className="bento-card p-5 border border-border border-l-4 border-l-emerald-500 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-1.5">
                <Sliders size={16} className="text-emerald-500" />
                Objectifs Métabolisme & Cibles
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetGoals}
                className="h-7 text-[10px] px-2 flex gap-1 items-center hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <RotateCcw size={10} /> Recalculer
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Personnalisez librement vos cibles nutritionnelles sans contraintes algorithmiques de régimes restrictifs.
            </p>

            <div className="space-y-3 pt-1">
              {/* Objective */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase block">Objectif global</label>
                <select 
                  value={currentObjective}
                  onChange={(e) => handleUpdateGoalField("objective", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="maintenance">Maintenance métabolique</option>
                  <option value="performance">Soutien de Performance athlétique</option>
                  <option value="recovery">Récupération systémique active</option>
                  <option value="recomposition">Recomposition corporelle prudente</option>
                  <option value="other">Autre / Équilibre</option>
                </select>
              </div>

              {/* Calories input */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Calories (kcal)</label>
                  <Badge className={`text-[8px] border-none py-0 px-1 font-mono ${userGoal.calories.isUserDefined ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                    {userGoal.calories.isUserDefined ? "Manuel" : "Estimé"}
                  </Badge>
                </div>
                <input 
                  type="number" 
                  value={userGoal.calories.value}
                  onChange={(e) => handleUpdateGoalField("calories", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono"
                />
              </div>

              {/* Protein and Carbs dual input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block">Protéines (g/kg)</label>
                  </div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={userGoal.proteinGPerKg.value}
                    onChange={(e) => handleUpdateGoalField("proteinGPerKg", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block">Glucides (g/kg)</label>
                  </div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={userGoal.carbsGPerKg.value}
                    onChange={(e) => handleUpdateGoalField("carbsGPerKg", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Fat, Fiber and Hydration inputs (g and ml) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Lipides (g)</label>
                  <input 
                    type="number" 
                    value={userGoal.fat.value}
                    onChange={(e) => handleUpdateGoalField("fat", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Fibres (g)</label>
                  <input 
                    type="number" 
                    value={userGoal.fiber.value}
                    onChange={(e) => handleUpdateGoalField("fiber", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Hydr. (ml)</label>
                  <input 
                    type="number" 
                    value={userGoal.hydration.value}
                    onChange={(e) => handleUpdateGoalField("hydration", e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Sodium input */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Sodium cible (mg)</label>
                  <Badge className={`text-[8px] border-none py-0 px-1 font-mono ${userGoal.sodium.isUserDefined ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                    {userGoal.sodium.isUserDefined ? "Manuel" : "Estimé"}
                  </Badge>
                </div>
                <input 
                  type="number" 
                  value={userGoal.sodium.value}
                  onChange={(e) => handleUpdateGoalField("sodium", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono"
                />
              </div>

            </div>
          </div>

          {/* B1 Block - Diagnostic de complétude des données & limitations summary */}
          <div className="bento-card p-6 border border-border border-l-4 border-l-amber-500">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" />
              Diagnostic de Complétude des Données
            </h4>
            
            {analysis.limitations.length === 0 ? (
              <div className="py-4 text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Saisie complète et conforme détectée pour aujourd’hui.
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.limitations.map((lim, idx) => (
                  <div key={idx} className="flex gap-2 p-2 bg-secondary/20 rounded-lg text-xs hover:bg-secondary/30 transition-colors">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-[11px] leading-tight">{lim}</span>
                  </div>
                ))}
              </div>
            )}

            {/* General metrics counts inside layout */}
            <div className="pt-3 border-t border-border mt-4 grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-secondary/15 p-2 rounded-lg text-center">
                <span className="text-muted-foreground block text-[8px] uppercase font-bold">Portions approx.</span>
                <span className="font-mono font-bold text-foreground">{summary.approximatedPortions}</span>
              </div>
              <div className="bg-secondary/15 p-2 rounded-lg text-center">
                <span className="text-muted-foreground block text-[8px] uppercase font-bold">Sans source</span>
                <span className="font-mono font-bold text-foreground">{summary.foodsWithoutSource}</span>
              </div>
            </div>
          </div>

          {/* B5 - Timing péri-effort (autour des séances Garmin) */}
          <div className="bento-card p-6 border border-border border-l-4 border-l-indigo-500">
            <h4 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
              <Dumbbell size={16} className="text-indigo-400" />
              Timing Ravitaillement Péri-Effort
            </h4>
            
            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
              Vérifie la répartition de vos apports alimentaires par rapport à vos séances physiques Garmin détectées.
            </p>

            <div className="bg-secondary/30 p-2.5 rounded-xl flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground">Timing d'effort</span>
              <Badge className="bg-indigo-500 text-white font-mono text-[10px]">
                {analysis.mealTiming.score}/100
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              {analysis.mealTiming.notes.map((note, idx) => (
                <div key={idx} className="p-2.5 bg-secondary/15 rounded-xl border border-secondary text-[11px] leading-relaxed flex gap-2">
                  <Lightbulb size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{note}</span>
                </div>
              ))}
              
              {analysis.mealTiming.notes.length === 0 && (
                <div className="py-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Apports d'efforts de séance alignés.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 mt-4">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Status ravitaillement</span>
              <div className="flex justify-between items-center bg-secondary/20 p-2 rounded-lg text-xs font-mono">
                <span className="text-muted-foreground">{analysis.trainingFueling.status}</span>
                <span className="font-bold text-indigo-400">{analysis.trainingFueling.score}%</span>
              </div>
            </div>
          </div>

          {/* Slipped inline list of historical meals logged today */}
          <div className="bento-card p-6 border border-border">
            <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-3">Repas loggés aujourd'hui</h4>
            {todayMeals.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Aucun repas saisi pour aujourd'hui</div>
            ) : (
              <div className="space-y-3">
                {todayMeals.map((log) => (
                  <div key={log.id} className="p-3 border rounded-xl border-border bg-secondary/5 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase text-[9px] text-primary">{log.mealType}</span>
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
          
        </div>

      </div>
    </div>
  );
}
