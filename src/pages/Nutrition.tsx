import React from "react";
import { Droplets, Apple, AlertCircle, TrendingUp, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Nutrition() {
  const { garminActivities } = useStore();

  // Calculate average daily calories burned from activities
  const recentActivities = garminActivities.slice(0, 7);
  const avgCaloriesBurned =
    recentActivities.length > 0
      ? recentActivities.reduce((acc, act) => acc + (act.calories || 0), 0) /
        recentActivities.length
      : 0;

  const hasData = garminActivities.length > 0;

  if (!hasData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <Droplets size={48} className="text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Nutrition & Hydratation</h2>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          Le carburant de votre performance. Suivez votre balance énergétique et
          la qualité de vos apports.
        </p>

        <div className="bento-card max-w-2xl w-full text-left mb-8 bg-white">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Apple size={18} className="text-[#34C759]" />
            Périodisation Nutritionnelle
          </h3>
          <p className="text-sm text-[#86868B] mb-4">
            Aura Elite croise vos données d'entraînement avec vos apports pour
            s'assurer que vous êtes en surplus les jours de forte charge (pour
            la récupération) et en maintien les jours de repos.
          </p>
          <div className="flex items-start gap-3 p-4 bg-[#F2F2F7] rounded-xl">
            <AlertCircle size={16} className="text-[#0071E3] shrink-0 mt-0.5" />
            <p className="text-xs text-[#1D1D1F]">
              <strong>Bientôt :</strong> Intégration avec MyFitnessPal et
              MacroFactor pour automatiser l'ingestion de vos macronutriments.
            </p>
          </div>
        </div>

        <Button
          nativeButton={false}
          render={<Link to="/connections" />}
          className="bg-[#34C759] text-white hover:bg-[#34C759]/90"
        >
          Voir les intégrations
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Nutrition & Métabolisme</h2>
          <p className="text-muted-foreground">
            Analyse de votre dépense énergétique et de vos besoins
            nutritionnels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="bento-card bento-gradient"
            style={{
              background: "linear-gradient(135deg, #34C759 0%, #30B0C7 100%)",
            }}
          >
            <div className="bento-title text-white/80">
              Dépense Active Moyenne (7j)
            </div>
            <div className="text-[42px] font-bold leading-tight text-white">
              {avgCaloriesBurned > 0 ? Math.round(avgCaloriesBurned) : "-"}
              <span className="text-xl ml-1 opacity-60 font-normal">kcal</span>
            </div>
            <div className="text-sm text-white/80 mt-1">
              Basé sur vos activités Garmin
            </div>
          </div>

          <div className="bento-card text-center justify-center items-center">
            <div className="bento-title">Statut d'Hydratation</div>
            <div className="text-[42px] font-bold leading-tight text-[#0071E3]">
              -
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Données insuffisantes
            </div>
          </div>

          <div className="bento-card text-center justify-center items-center">
            <div className="bento-title">Besoins Estimés (Aujourd'hui)</div>
            <div className="text-[42px] font-bold leading-tight">
              {avgCaloriesBurned > 0
                ? Math.round(2000 + avgCaloriesBurned)
                : "-"}
              <span className="text-xl ml-1 text-[#86868B] font-normal">
                kcal
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              TMB (Est.) + Dépense Active
            </div>
          </div>
        </div>

        <div className="bento-card mb-8 bg-[#FFF0F0] border border-[#FF3B30]/20">
          <h3 className="font-semibold text-[#FF3B30] flex items-center gap-2 mb-4">
            <Flame size={18} />
            Risque RED-S (Déficit Énergétique Relatif dans le Sport)
          </h3>
          <p className="text-sm text-[#1D1D1F] mb-4">
            Aura Elite analyse votre charge d'entraînement par rapport à votre
            récupération pour détecter les signes de sous-alimentation
            chronique.
          </p>
          <div className="text-xs text-[#86868B] space-y-2">
            <p>Indicateurs surveillés :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Baisse inexpliquée de la RHR ou HRV</li>
              <li>Troubles du sommeil persistants</li>
              <li>Fatigue chronique (via Hooper)</li>
              <li>Aménorrhée (si suivi activé)</li>
            </ul>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
