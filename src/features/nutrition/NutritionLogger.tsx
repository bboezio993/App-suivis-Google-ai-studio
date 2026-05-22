import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { internalFoodDatabase, servingUnits, convertPortionToGrams, internalRecipes } from '../../domain/nutrition/foodDatabase';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Search, ChevronRight, Apple, Flame, Award, AlertTriangle, Clipboard, BookOpen } from 'lucide-react';
import { MealItem, MealLog, Recipe } from '../../types';

export function NutritionLogger() {
  const addMealLog = useStore(state => state.addMealLog);
  const storeRecipes = useStore(state => state.recipes) || [];
  const addRecipeToStore = useStore(state => state.addRecipe);
  const deleteRecipeFromStore = useStore(state => state.deleteRecipe);
  const userProfile = useStore(state => state.userProfile);

  const [mealType, setMealType] = useState<MealLog['mealType']>('breakfast');
  const [search, setSearch] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState('g');
  
  // Interactive Tab Selection
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes'>('ingredients');

  // Custom Recipe Creator states
  const [showRecipeCreator, setShowRecipeCreator] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeSaveSuccess, setRecipeSaveSuccess] = useState(false);

  // Allergies
  const clinicalAllergies = userProfile?.health?.allergies || [];
  const [bypassAllergenFoodId, setBypassAllergenFoodId] = useState<string | null>(null);

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

  const isAllergic = (foodName: string) => {
    const nameLower = foodName.toLowerCase();
    for (const allergy of clinicalAllergies) {
      const aLower = allergy.toLowerCase().trim();
      if (!aLower) continue;
      
      // Gluten
      if (aLower === "gluten" && (nameLower.includes("pâte") || nameLower.includes("pates") || nameLower.includes("avoine") || nameLower.includes("farine") || nameLower.includes("pain") || nameLower.includes("blé") || nameLower.includes("orge"))) {
        return "Gluten";
      }
      // Lactose
      if (aLower === "lactose" && (nameLower.includes("whey") || nameLower.includes("lait") || nameLower.includes("fromage") || nameLower.includes("yaourt") || nameLower.includes("crème") || nameLower.includes("creme") || nameLower.includes("beurre"))) {
        return "Lactose (Produits laitiers)";
      }
      // Eggs
      if (aLower === "oeufs" || aLower === "oeuf" || aLower === "œuf" || aLower === "œufs") {
        if (nameLower.includes("oeuf") || nameLower.includes("œuf")) {
          return "Œuf de poule";
        }
      }
      // Fish
      if (aLower === "poisson" && (nameLower.includes("saumon") || nameLower.includes("poisson") || nameLower.includes("cabillaud") || nameLower.includes("thon") || nameLower.includes("sardine"))) {
        return "Poisson";
      }
      // Nuts
      if ((aLower === "arachide" || aLower === "arachides" || aLower === "noix" || aLower === "amandes") && (nameLower.includes("amande") || nameLower.includes("noix") || nameLower.includes("cacahuète") || nameLower.includes("noisette") || nameLower.includes("beurre de cacahuète") || nameLower.includes("arachide"))) {
        return "Arachides / Fruits à coque";
      }
      if (nameLower.includes(aLower)) {
        return allergy;
      }
    }
    return null;
  };

  const handleCreateRecipe = () => {
    if (!recipeName || items.length === 0) return;
    const newRecipe: Recipe = {
      id: `recipe_${Date.now()}`,
      name: recipeName,
      description: recipeDescription || "Mélange personnalisé de récupération",
      items: items.map(it => ({
        foodId: it.foodId,
        foodName: it.foodName,
        quantity: it.quantity,
        unit: it.unit,
        gramsSelected: it.gramsSelected
      }))
    };
    addRecipeToStore(newRecipe);
    setRecipeName('');
    setRecipeDescription('');
    setShowRecipeCreator(false);
    setRecipeSaveSuccess(true);
    setTimeout(() => setRecipeSaveSuccess(false), 3000);
  };

  const handleImportRecipe = (recipe: Recipe) => {
    const resolvedItems = recipe.items.map(it => {
      const dbFood = internalFoodDatabase.find(f => f.id === it.foodId);
      const calories = dbFood ? Math.round(dbFood.calories * (it.gramsSelected / 100)) : 0;
      const protein = dbFood ? Number((dbFood.protein * (it.gramsSelected / 100)).toFixed(1)) : 0;
      const carbs = dbFood ? Number((dbFood.carbs * (it.gramsSelected / 100)).toFixed(1)) : 0;
      const fat = dbFood ? Number((dbFood.fat * (it.gramsSelected / 100)).toFixed(1)) : 0;

      return {
        foodId: it.foodId,
        foodName: it.foodName,
        quantity: it.quantity,
        unit: it.unit,
        gramsSelected: it.gramsSelected,
        calories,
        protein,
        carbs,
        fat
      };
    });

    setItems([...items, ...resolvedItems]);
  };

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

      {recipeSaveSuccess && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
          <Check size={16} />
          Recette enregistrée avec succès dans votre base d'athlète !
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Search, Selections & Recipes catalog */}
        <div className="lg:col-span-7 space-y-4 border-r border-border/60 pr-0 lg:pr-6">
          {/* Selection tabs */}
          <div className="flex border-b border-border/80">
            <button
              onClick={() => { setActiveTab('ingredients'); setSelectedFoodId(''); }}
              type="button"
              className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'ingredients' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Apple size={14} />
                Ingrédients individuels
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('recipes'); setSelectedFoodId(''); }}
              type="button"
              className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${
                activeTab === 'recipes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <BookOpen size={14} />
                Recettes ({internalRecipes.length + storeRecipes.length})
              </span>
            </button>
          </div>

          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as any)}
                  className="text-xs font-bold rounded-lg border border-border bg-secondary/35 p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="breakfast">Petit-Déjeuner 🍳</option>
                  <option value="lunch">Déjeuner 🥗</option>
                  <option value="dinner">Dîner 🍲</option>
                  <option value="snack">Collation 🍎</option>
                  <option value="pre_workout">Pré-Workout ⚡</option>
                  <option value="intra_workout">Intra-Workout 💧</option>
                  <option value="post_workout">Post-Workout 🥛</option>
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
                    foundFoods.map(f => {
                      const allergen = isAllergic(f.name);
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            handleSelectFood(f.id);
                            setBypassAllergenFoodId(null);
                          }}
                          className={`w-full text-left p-2 hover:bg-secondary/40 rounded-lg text-xs flex justify-between items-center transition-all ${
                            allergen ? 'border-l-2 border-red-500 pl-3 bg-red-500/5' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{f.name}</span>
                              {allergen && (
                                <Badge variant="outline" className="border-red-500/20 text-red-500 text-[8px] font-bold px-1.5">
                                  ⚠️ Allergène : {allergen}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground block">{f.category}</span>
                          </div>
                          <Badge variant="secondary" className="font-mono text-[9px]">{f.calories} kcal/100g</Badge>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="space-y-4">
              <p className="text-[11px] text-muted-foreground">
                Sélectionnez une formule pré-enregistrée ou créée par vos soins pour configurer rapidement des groupes d'aliments.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {[...internalRecipes, ...storeRecipes].map((rcp) => {
                  const containedAllergens = rcp.items
                    .map(it => isAllergic(it.foodName))
                    .filter((allergen): allergen is string => allergen !== null);

                  const uniqueAllergens = Array.from(new Set(containedAllergens));

                  const totCals = rcp.items.reduce((sum, item) => {
                    const dbFood = internalFoodDatabase.find(f => f.id === item.foodId);
                    return sum + (dbFood ? Math.round(dbFood.calories * (item.gramsSelected / 100)) : 0);
                  }, 0);
                  const totProts = rcp.items.reduce((sum, item) => {
                    const dbFood = internalFoodDatabase.find(f => f.id === item.foodId);
                    return sum + (dbFood ? Number((dbFood.protein * (item.gramsSelected / 100)).toFixed(1)) : 0);
                  }, 0);

                  return (
                    <div 
                      key={rcp.id}
                      className={`p-3 border rounded-xl flex flex-col justify-between h-44 bg-background transition-all hover:border-indigo-500/40 relative ${
                        uniqueAllergens.length > 0 ? 'border-red-500/20 bg-red-500/[0.01]' : 'border-border'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h6 className="font-bold text-xs leading-none mt-0.5">{rcp.name}</h6>
                          {storeRecipes.some(r => r.id === rcp.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecipeFromStore(rcp.id);
                              }}
                              type="button"
                              className="text-red-500 hover:bg-red-500/10 p-1 rounded shrink-0"
                              title="Supprimer cette recette personnalisée"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        {rcp.description && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                            {rcp.description}
                          </p>
                        )}
                        {uniqueAllergens.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1 p-1 bg-red-500/5 rounded-md border border-red-500/10">
                            <AlertTriangle size={10} className="text-red-500 shrink-0" />
                            <span className="text-[9px] font-semibold text-red-500 truncate">
                              Allergie : {uniqueAllergens.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-2 mt-2 flex justify-between items-center">
                        <div className="text-[9px] font-mono text-muted-foreground">
                          <span className="font-bold text-foreground">{totCals} kcal</span> • {Math.round(totProts)}g prot
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleImportRecipe(rcp)}
                          disabled={uniqueAllergens.length > 0}
                          className={`text-[10px] h-7 px-2.5 rounded-lg py-1 font-semibold ${
                            uniqueAllergens.length > 0
                              ? 'bg-secondary text-muted-foreground cursor-not-allowed border-none'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          Importer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
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

              {isAllergic(selectedFood.name) && bypassAllergenFoodId !== selectedFood.id ? (
                <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-xl space-y-3">
                  <div className="flex gap-2.5 text-red-500 items-start">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold font-sans">Alerte Clinique d'Allergène</span>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Cet ingrédient contient du <span className="text-red-500 font-bold">{isAllergic(selectedFood.name)}</span> répertorié dans vos allergies d'athlète. Par sécurité, l'accès est consigné.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1 border-t border-red-500/10">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setSelectedFoodId('')}
                      className="text-[10px] text-muted-foreground py-1 h-7 border-border bg-background"
                    >
                      Annuler la sélection
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setBypassAllergenFoodId(selectedFood.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1 h-7 font-bold rounded-lg"
                    >
                      Contourner l'alerte
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold block text-muted-foreground mb-1">Unité portion :</label>
                      <select 
                        value={unit} 
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full text-xs rounded-lg border border-border bg-background p-2 focus:ring-1 focus:ring-primary focus:outline-none"
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

                  <div className="flex gap-2 pt-1">
                    <Button 
                      onClick={handleAddItemToMeal} 
                      type="button" 
                      className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 text-xs py-1.5 font-bold"
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
                </>
              )}
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
            <div className="space-y-4">
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
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-1">Faim avant</label>
                  <select 
                    value={hungerBefore} 
                    onChange={(e) => setHungerBefore(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="1">Faible</option>
                    <option value="3">Moyenne</option>
                    <option value="5">Intense</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-1">Satiété après</label>
                  <select 
                    value={satietyAfter} 
                    onChange={(e) => setSatietyAfter(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="1">Affamé</option>
                    <option value="3">Idéal</option>
                    <option value="5">Surchargé</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block uppercase mb-1">Digestion</label>
                  <select 
                    value={digestionAfter} 
                    onChange={(e) => setDigestionAfter(Number(e.target.value))}
                    className="w-full text-xs rounded border border-border bg-background p-1 focus:ring-1 focus:ring-primary focus:outline-none"
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
                className="w-full text-[10px] rounded border border-border bg-background p-2 h-14 focus:ring-1 focus:ring-primary focus:outline-none"
              />

              <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
                <Button 
                  onClick={handleSaveMealLog} 
                  className="w-full bg-[#0071E3] hover:bg-[#0071E3]/90 text-white py-2 font-bold text-xs"
                >
                  Enregistrer le repas complet
                </Button>

                {!showRecipeCreator ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRecipeCreator(true)}
                    className="w-full text-[10px] text-indigo-400 hover:text-indigo-500 border-indigo-500/10 hover:border-indigo-500/20 py-2"
                  >
                    Enregistrer comme Recette Personnalisée 📋
                  </Button>
                ) : (
                  <div className="p-3 border rounded-xl border-indigo-500/20 bg-indigo-500/[0.01] flex flex-col gap-3">
                    <div>
                      <h6 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <Clipboard size={12} />
                        Sauvegarde de formule
                      </h6>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Enregistrez ces proportions d'ingrédients pour un futur import instantané.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Ex: Shaker d'Après Course Élite ⚡"
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        className="w-full text-xs p-2 bg-background border border-border rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Ex: Whey + Banane frais (Facultatif)"
                        value={recipeDescription}
                        onChange={(e) => setRecipeDescription(e.target.value)}
                        className="w-full text-xs p-2 bg-background border border-border rounded-lg"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowRecipeCreator(false)}
                        className="text-[10px] h-7 px-2.5 text-muted-foreground"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateRecipe}
                        disabled={!recipeName}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] h-7 px-3.5"
                      >
                        Créer Recette
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
