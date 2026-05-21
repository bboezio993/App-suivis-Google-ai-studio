import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { internalFoodDatabase, servingUnits, convertPortionToGrams } from '../../domain/nutrition/foodDatabase';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Search, ChevronRight, Apple, Flame, Award } from 'lucide-react';
import { MealItem, MealLog } from '../../types';

export function NutritionLogger() {
  const addMealLog = useStore(state => state.addMealLog);
  const [mealType, setMealType] = useState<MealLog['mealType']>('breakfast');
  const [search, setSearch] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  
  // Temporary list of items in the current meal being composed
  const [items, setItems] = useState<Array<{
    foodId: string;
    foodName: string;
    quantity: number;
    unit: string;
    gramsSelected: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>>([]);

  const [notes, setNotes] = useState('');
  const [hungerBefore, setHungerBefore] = useState(3);
  const [satietyAfter, setSatietyAfter] = useState(3);
  const [digestionAfter, setDigestionAfter] = useState(3);
  const [success, setSuccess] = useState(false);

  // Search filter
  const foundFoods = internalFoodDatabase.filter(food => 
    food.name.toLowerCase().includes(search.toLowerCase()) ||
    food.category.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFood = internalFoodDatabase.find(f => f.id === selectedFoodId);
  const relatedUnits = selectedFoodId ? servingUnits.filter(su => su.foodId === selectedFoodId) : [];

  const handleSelectFood = (foodId: string) => {
    setSelectedFoodId(foodId);
    setSearch('');
    // reset unit & quantity back to defaults
    const food = internalFoodDatabase.find(f => f.id === foodId);
    if (food) {
      setUnit(food.defaultUnit);
      setQuantity(food.defaultUnit === 'piece' ? 1 : 100);
    }
  };

  const handleAddItemToMeal = () => {
    if (!selectedFood) return;

    // Convert portion to grams
    const { grams, confidence, assumptions } = convertPortionToGrams(selectedFood.id, quantity, unit);

    // Calculate nutritional breakdown per 100g base
    const factor = grams / 100;
    const calories = Math.round(selectedFood.calories * factor);
    const protein = Number((selectedFood.protein * factor).toFixed(1));
    const carbs = Number((selectedFood.carbs * factor).toFixed(1));
    const fat = Number((selectedFood.fat * factor).toFixed(1));

    setItems([...items, {
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      quantity,
      unit,
      gramsSelected: grams,
      calories,
      protein,
      carbs,
      fat
    }]);

    // reset selection
    setSelectedFoodId('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSaveMealLog = () => {
    if (items.length === 0) return;

    const newLog: MealLog = {
      id: `meal_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mealType,
      items: items.map(it => ({
        foodId: it.foodId,
        foodName: it.foodName,
        quantity: it.quantity,
        unit: it.unit,
        gramsSelected: it.gramsSelected,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat
      })),
      hungerBefore,
      satietyAfter,
      digestionAfter,
      notes
    };

    addMealLog(newLog);

    setItems([]);
    setNotes('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Calculate total macros currently composed
  const composedCalories = items.reduce((acc, i) => acc + i.calories, 0);
  const composedProtein = items.reduce((acc, i) => acc + i.protein, 0);
  const composedCarbs = items.reduce((acc, i) => acc + i.carbs, 0);
  const composedFat = items.reduce((acc, i) => acc + i.fat, 0);

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-border">
        <h4 className="font-bold text-base flex items-center gap-2">
          <Apple className="text-emerald-500" size={18} />
          Saisie Nutritionnelle de Précision
        </h4>
        <p className="text-xs text-muted-foreground">Recherchez vos aliments pour composer un repas et évaluer les apports macro-nutritionnels.</p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
          <Check size={16} />
          Repas enregistré avec succès et intégré au Moteur Physiologique !
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ingredient searches */}
        <div className="lg:col-span-7 space-y-4 border-r border-border/60 pr-0 lg:pr-6">
          <div className="flex gap-2">
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as any)}
              className="text-xs font-bold rounded-lg border border-border bg-secondary/30 p-2 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="breakfast">Petit-Déjeuner 🍳</option>
              <option value="lunch">Déjeuner 🥗</option>
              <option value="dinner">Dîner 🍲</option>
              <option value="snack">Collation 🍎</option>
              <option value="pre_workout">Pré-Workout ⚡</option>
              <option value="intra_workout">Intra-Workout 💧</option>
              <option value="post_workout">Récupération Post-Workout 🥛</option>
            </select>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher banane, riz, poulet, whey..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background py-2 pl-9 pr-4 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {search && (
            <div className="border rounded-xl border-border bg-background shadow-lg max-h-56 overflow-y-auto p-1.5 space-y-1 z-35 relative">
              {foundFoods.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">Aucun aliment correspondant trouvé.</div>
              ) : (
                foundFoods.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFood(f.id)}
                    className="w-full text-left p-2 hover:bg-secondary/40 rounded-lg text-xs flex justify-between items-center transition-all"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground block">{f.category}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[9px]">{f.calories} kcal/100g</Badge>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedFood && (
            <div className="p-4 border rounded-2xl bg-secondary/10 border-border/80 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="font-bold text-xs text-foreground uppercase tracking-wide">Configuration de l'ingrédient</h5>
                  <p className="text-xs font-semibold text-primary">{selectedFood.name}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono translate-y-[-2px]">
                  Confiance : {selectedFood.confidence}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold block text-muted-foreground mb-1">Unité portion :</label>
                  <select 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs rounded-lg border border-border bg-background p-2"
                  >
                    <option value="g">Grammes (g)</option>
                    <option value="ml">Millilitres (ml)</option>
                    <option value="piece">Unité / Pièce standard</option>
                    {relatedUnits.map(ru => (
                      <option key={ru.id} value={ru.id}>{ru.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold block text-muted-foreground mb-1">Quantité :</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-border bg-background p-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddItemToMeal} 
                  type="button" 
                  className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 text-xs py-1.5"
                >
                  Ajouter au Repas
                </Button>
                <Button 
                  onClick={() => setSelectedFoodId('')} 
                  type="button" 
                  variant="outline" 
                  className="text-xs py-1.5"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Current Composing Meal summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Composition actuelle</h5>
            <Badge variant="outline" className="font-bold text-[10px] bg-emerald-500/10 text-emerald-500">
              {mealType.toUpperCase()}
            </Badge>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl border-border bg-secondary/5 text-center min-h-36">
              <span className="text-xs text-muted-foreground">Aucun aliment ajouté dans ce repas</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 border rounded-xl border-border bg-background shadow-xs hover:border-red-500/20 group transition-all">
                    <div>
                      <p className="text-xs font-bold">{it.foodName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {it.quantity} {it.unit} &rarr; approx {Math.round(it.gramsSelected)}g • {it.calories} kcal
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="opacity-40 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Composition nutrition macros */}
              <div className="p-3 bg-secondary/35 border rounded-xl border-border/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Calories Totales:</span>
                  <span className="font-black font-mono text-emerald-500">{composedCalories} kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t text-[10px] text-center font-semibold">
                  <div className="p-1.5 bg-background rounded-lg">
                    <span className="text-muted-foreground block text-[9px] uppercase">Protéines</span>
                    <span className="font-mono text-indigo-400">{composedProtein}g</span>
                  </div>
                  <div className="p-1.5 bg-background rounded-lg">
                    <span className="text-muted-foreground block text-[9px] uppercase">Glucides</span>
                    <span className="font-mono text-amber-500">{composedCarbs}g</span>
                  </div>
                  <div className="p-1.5 bg-background rounded-lg">
                    <span className="text-muted-foreground block text-[9px] uppercase">Lipides</span>
                    <span className="font-mono text-red-400">{composedFat}g</span>
                  </div>
                </div>
              </div>

              {/* Subjective metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Faim avant</label>
                  <select 
                    value={hungerBefore} 
                    onChange={(e) => setHungerBefore(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1"
                  >
                    <option value="1">Faible</option>
                    <option value="3">Moyenne</option>
                    <option value="5">Intense</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Satiété après</label>
                  <select 
                    value={satietyAfter} 
                    onChange={(e) => setSatietyAfter(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1"
                  >
                    <option value="1">Affamé</option>
                    <option value="3">Idéal</option>
                    <option value="5">Surchargé</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Digestion</label>
                  <select 
                    value={digestionAfter} 
                    onChange={(e) => setDigestionAfter(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1"
                  >
                    <option value="1">Lourde</option>
                    <option value="3">Standard</option>
                    <option value="5">Légère</option>
                  </select>
                </div>
              </div>

              <textarea
                placeholder="Notes de digestion ou suppléments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-[10px] rounded border border-border bg-background p-2 h-14"
              />

              <Button 
                onClick={handleSaveMealLog} 
                className="w-full bg-[#0071E3] hover:bg-[#0071E3]/90 text-white py-2"
              >
                Enregistrer le repas complet
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
