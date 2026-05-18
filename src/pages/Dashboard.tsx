import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Heart, 
  Moon, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  Plus, 
  Info,
  Droplets,
  Brain,
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { DailyMetrics, AnalysisResult, Recommendation } from '../types';
import { analyzeHealthData } from '../services/gemini';
import { HooperForm } from '../components/forms/HooperForm';
import { WeeklyScreeningForm } from '../components/forms/WeeklyScreeningForm';
import { EngineScoreCard } from '../components/dashboard/EngineScoreCard';
import { useStore } from '../store/useStore';

export function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { metrics, garminActivities, engineScores, computeEngineScores, userProfile } = useStore();

  // Run engine on mount if needed
  useEffect(() => {
    if (!engineScores) {
      computeEngineScores();
    }
  }, []);

  const handleRefreshAnalysis = async () => {
    computeEngineScores();
    
    // Keep the Gemini analysis for the text summary/recommendations
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const recentMetrics = metrics.filter(m => m.timestamp.startsWith(today));
      
      const mockDaily: DailyMetrics = {
        date: today,
        hrv: recentMetrics.find(m => m.type === 'hrv_rmssd')?.value || 0,
        rhr: recentMetrics.find(m => m.type === 'rhr')?.value || 0,
        sleepDuration: recentMetrics.find(m => m.type === 'sleep_duration')?.value || 0,
        sleepQuality: recentMetrics.find(m => m.type === 'sleep_quality')?.value || 0,
        rpe: recentMetrics.find(m => m.type === 'rpe')?.value || 0,
        stressLevel: recentMetrics.find(m => m.type === 'stress')?.value || 0,
        mood: 'Neutral',
        soreness: 0,
        weight: 0
      };

      const result = await analyzeHealthData(userProfile, [mockDaily]);
      setAnalysis(result);
    } catch (error) {
      console.error("Error refreshing analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = metrics.length > 0 || garminActivities.length > 0;

  if (!hasData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <Activity size={48} className="text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Bienvenue sur Aura Elite</h2>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          Votre tableau de bord est vide. Connectez vos sources de données ou saisissez vos premières métriques pour démarrer l'analyse.
        </p>
        <div className="flex gap-4">
          <Button nativeButton={false} render={<Link to="/connections" />} className="bg-[#0071E3] text-white hover:bg-[#0071E3]/90">
            Connecter des sources
          </Button>
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" className="gap-2">
                <Plus size={16} />
                Saisie Manuelle
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Check-in Quotidien (Hooper)</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] pr-4">
                <HooperForm onComplete={() => {}} />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating Actions */}
        <div className="absolute top-4 right-8 z-10 flex items-center gap-4">
          <Dialog>
            <DialogTrigger render={
              <Button size="sm" variant="outline" className="gap-2 shadow-sm">
                <Brain size={16} />
                Screening Hebdo
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Screening Psychologique (Hebdomadaire)</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] pr-4">
                <WeeklyScreeningForm onComplete={() => {
                  console.log("Screening saved");
                }} />
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={
              <Button size="sm" className="gap-2 shadow-sm bg-[#0071E3] text-white hover:bg-[#0071E3]/90">
                <Plus size={16} />
                Check-in Quotidien
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Check-in Quotidien (Hooper)</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] pr-4">
                <HooperForm onComplete={() => {
                  console.log("Hooper saved");
                }} />
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleRefreshAnalysis} disabled={loading} className="bg-white/50 backdrop-blur-sm">
            {loading ? "Analyse..." : "Rafraîchir l'Analyse"}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Aura Elite Engine</h1>
              <p className="text-muted-foreground">
                Analyse multicouche de votre physiologie et de votre charge d'entraînement.
              </p>
            </div>

            {/* Engine Score Card (Couches C, D, E, G & Fusion) */}
            {engineScores ? (
              <EngineScoreCard scores={engineScores} />
            ) : (
              <div className="p-8 text-center bg-secondary rounded-xl">
                <RefreshCw className="animate-spin mx-auto mb-4 text-muted-foreground" />
                <p>Calcul des scores du moteur en cours...</p>
              </div>
            )}

            {/* AI Summary (Gemini) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Summary */}
                <div className="bento-card bg-white">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-[#0071E3]" />
                    Synthèse IA (Gemini)
                  </h3>
                  {analysis ? (
                    <p className="text-[#1D1D1F] leading-relaxed">
                      {analysis.summary}
                    </p>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Lancez l'analyse pour obtenir votre synthèse personnalisée.</p>
                      <Button onClick={handleRefreshAnalysis} disabled={loading} className="bg-[#0071E3] text-white hover:bg-[#0071E3]/90">
                        {loading ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                        Générer l'analyse
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {analysis && analysis.recommendations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ArrowRight size={18} className="text-[#5856D6]" />
                      Recommandations d'Action
                    </h3>
                    <div className="grid gap-4">
                      {analysis.recommendations.map(rec => (
                        <div key={rec.id} className="bento-card bg-white border border-transparent hover:border-[#E5E5EA] transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-[#1D1D1F]">{rec.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-[#86868B] leading-relaxed">{rec.description}</p>
                          {rec.scientificBasis && (
                            <div className="mt-3 pt-3 border-t border-[#E5E5EA] flex items-start gap-2">
                              <AlertCircle size={14} className="text-[#86868B] shrink-0 mt-0.5" />
                              <p className="text-xs text-[#86868B] italic">{rec.scientificBasis}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Context */}
              <div className="space-y-6">
                <div className="bento-card bg-[#F2F2F7]">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[#86868B]">Contexte Biométrique</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1D1D1F]">Tendance HRV</span>
                      <span className={`text-sm font-medium ${analysis?.trends.hrv === 'up' ? 'text-green-600' : analysis?.trends.hrv === 'down' ? 'text-red-600' : 'text-[#86868B]'}`}>
                        {analysis?.trends.hrv === 'up' ? '↗ En hausse' : analysis?.trends.hrv === 'down' ? '↘ En baisse' : '→ Stable'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#1D1D1F]">Récupération</span>
                      <span className={`text-sm font-medium ${analysis?.trends.recovery === 'improving' ? 'text-green-600' : analysis?.trends.recovery === 'declining' ? 'text-red-600' : 'text-[#86868B]'}`}>
                        {analysis?.trends.recovery === 'improving' ? '↗ S\'améliore' : analysis?.trends.recovery === 'declining' ? '↘ Se dégrade' : '→ Stable'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bento-card">
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[#86868B]">Sources Actives</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Garmin Connect</span>
                      <span className="text-xs text-muted-foreground ml-auto">Il y a 2h</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Saisie Manuelle</span>
                      <span className="text-xs text-muted-foreground ml-auto">Aujourd'hui</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
