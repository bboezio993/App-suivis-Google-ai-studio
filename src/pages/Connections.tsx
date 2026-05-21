import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormEngine } from '../features/forms/FormEngine';
import { 
  Database, 
  FileUp, 
  Edit3, 
  Cpu, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Shield,
  Activity,
  Award,
  ChevronRight,
  Heart,
  HelpCircle,
  Moon,
  Droplet
} from 'lucide-react';

export function Connections() {
  const [activeTab, setActiveTab] = useState<'garmin' | 'manual' | 'derived'>('garmin');
  const garminImportLogs = useStore(state => state.garminImportLogs);
  const engineScores = useStore(state => state.engineScores);
  const metrics = useStore(state => state.metrics);
  const activities = useStore(state => state.garminActivities);

  // Compute coverage percentages of metrics for the last 7 days
  const recentMetrics = metrics.filter(m => {
    const timeDiff = Date.now() - new Date(m.timestamp).getTime();
    return timeDiff <= 7 * 24 * 3600 * 1000;
  });

  const getMetricCount = (type: string) => recentMetrics.filter(m => m.type === type).length;
  const hrvCoverage = getMetricCount("hrv_rmssd") > 0 ? "100%" : "0%";
  const rhrCoverage = getMetricCount("rhr") > 0 ? "100%" : "0%";
  const sleepCoverage = getMetricCount("sleep_duration") > 0 ? "100%" : "0%";

  return (
    <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="text-primary w-8 h-8" />
            Sources & Données
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos siphons de données Garmin, remplissez vos formulaires quotidiens et auditez la qualité de vos baselines physiologiques.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-mono py-1 px-2 text-xs">
          Pipeline V1 Actif
        </Badge>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-4 border-b border-border/80 pb-3 mb-8">
        <button
          onClick={() => setActiveTab('garmin')}
          className={`pb-3 text-base font-semibold transition-all relative ${
            activeTab === 'garmin' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {activeTab === 'garmin' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          <div className="flex items-center gap-2">
            <FileUp size={18} />
            Garmin Import Hub
          </div>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 text-base font-semibold transition-all relative ${
            activeTab === 'manual' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {activeTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          <div className="flex items-center gap-2">
            <Edit3 size={18} />
            Saisie Manuelle
          </div>
        </button>

        <button
          onClick={() => setActiveTab('derived')}
          className={`pb-3 text-base font-semibold transition-all relative ${
            activeTab === 'derived' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {activeTab === 'derived' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          <div className="flex items-center gap-2">
            <Cpu size={18} />
            Données Calculées
          </div>
        </button>
      </div>

      {/* Content panes */}
      {activeTab === 'garmin' && (
        <div className="space-y-6">
          {/* Main action card */}
          <div className="bento-card border border-[#0071E3]/20 bg-[#0071E3]/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[11px] font-mono tracking-wider text-[#0071E3] font-bold uppercase">Source Principale</span>
              <h3 className="text-xl font-bold">Import direct d'enregistrements Garmin Connect</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Alimentez les modules physiologiques en important votre archive complète ZIP issue de Garmin Connect, ou directement vos fichiers FIT d'activité et JSON de bien-être.
              </p>
            </div>
            <Button 
              nativeButton={false}
              render={<Link to="/connections/garmin" />}
              className="bg-[#0071E3] hover:bg-[#0071E3]/90 text-white font-medium rounded-xl shrink-0"
            >
              Importer un fichier <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metric coverage checks & Quality */}
            <div className="bento-card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Shield size={18} className="text-[#34C759]" />
                État de couverture & Qualité des données (7j)
              </h3>
              <div className="space-y-4">
                <CoverageBar label="Variabilité Cardiaque (HRV)" coverage={hrvCoverage} color="bg-[#5856D6]" />
                <CoverageBar label="Fréquence Cardiaque au Repos (RHR)" coverage={rhrCoverage} color="bg-[#FF2D55]" />
                <CoverageBar label="Durée de Sommeil" coverage={sleepCoverage} color="bg-[#0071E3]" />
                <CoverageBar label="Nombre de pas" coverage={recentMetrics.filter(m => m.type === "steps").length > 0 ? "100%" : "0%"} color="bg-[#FF9500]" />
              </div>
              <div className="mt-5 p-4 bg-secondary/15 rounded-xl border border-border/60">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 Aura Elite base ses calculs sur des moyennes mobiles sur 7 et 28 jours. Pour optimiser la confiance d'analyse, assurez-vous d'avoir au moins 5 nuits enregistrées sur les 7 derniers jours.
                </p>
              </div>
            </div>

            {/* Recent import history */}
            <div className="bento-card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock size={18} className="text-muted-foreground" />
                Historique récent des Imports
              </h3>
              {garminImportLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-xl border-border bg-secondary/10">
                  <span className="text-xs text-muted-foreground text-center">Aucun import détecté.<br/>Vos fichiers importés s'afficheront ici.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {garminImportLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-xl border-border/80 hover:bg-secondary/20 transition-all">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold font-mono truncate max-w-xs">{log.filename}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Type: <span className="font-mono">{log.type}</span> • {log.recordsAdded} records
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-bold border-none uppercase ${
                        log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                        log.status === 'partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-6">
          <div className="bento-card p-6 bg-secondary/10 border-border/80">
            <h3 className="font-bold text-xl mb-1.5 flex items-center gap-2">
              <Edit3 className="text-[#30B0C7] w-5 h-5" />
              Saisie Manuelle & Logs Subjectifs
            </h3>
            <p className="text-xs text-muted-foreground max-w-3xl mb-5">
              Si vous n'avez pas de montre Garmin à portée de main ou si vous souhaitez enrichir vos métriques objectives, complétez vos ressentis ci-dessous. Ils influencent directement la readiness.
            </p>
            <FormEngine />
          </div>
        </div>
      )}

      {activeTab === 'derived' && (
        <div className="space-y-6">
          <div className="bento-card p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Cpu className="text-primary" size={20} />
              Modèles mathématiques & Indicateurs de charge clinique
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Aura Elite calcule de façon autonome des variables de charge aiguë et chronique sans dépendre d'algorithmes opaques. Voici l'état actuel de vos indicateurs calculés :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CalculatedIndicatorCard 
                icon={<Activity className="text-primary" />}
                title="Readiness d'Aura"
                value={engineScores ? `${engineScores.performanceReadiness.score}/100` : "75/100"}
                desc="Indique la réceptivité du système cardiovasculaire et mécanique pour la haute intensité."
                status={engineScores?.performanceReadiness.status || "normal"}
              />

              <CalculatedIndicatorCard 
                icon={<TrendingUp className="text-purple-500" />}
                title="ACWR (Charge relative)"
                value={engineScores?.acwr ? engineScores.acwr.toFixed(2) : "1.05"}
                desc="Le ratio de votre charge hebdomadaire (aiguë) sur votre charge lissée (chronique)."
                status={engineScores?.acwr && engineScores.acwr > 1.5 ? "danger" : "normal"}
              />

              <CalculatedIndicatorCard 
                icon={<Moon className="text-indigo-400" />}
                title="Sommeil Score Interne"
                value={engineScores ? `${engineScores.sleepHealth.score}/100` : "80/100"}
                desc="Index de santé de sommeil et de résorption de la dette de fatigue cumulative."
                status={engineScores?.sleepHealth.status || "optimal"}
              />
            </div>

            <div className="mt-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
              <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-wide">Surveillance des signaux faibles</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Le Risk Boundary Engine étudie de façon croisée les signaux subjectifs de douleurs actives, de courbatures et de HRV. Si votre check-in matinal signale une fatigue intense, le score de Readiness s'effondrera automatiquement, même si votre montre indique un sommeil récupéré. Le corps de l'athlète a toujours le dernier mot.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverageBar({ label, coverage, color }: { label: string; coverage: string; color: string }) {
  const percent = parseInt(coverage);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{coverage}</span>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function CalculatedIndicatorCard({ icon, title, value, desc, status }: { icon: React.ReactNode; title: string; value: string; desc: string; status: string }) {
  return (
    <div className="p-4 border rounded-xl border-border bg-secondary/15 flex flex-col justify-between h-40">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <Badge variant="outline" className={`text-[10px] font-mono border-none py-0.5 px-2 uppercase ${
          status === 'danger' || status === 'critical' ? 'bg-red-500/10 text-red-500' : 
          status === 'optimal' || status === 'recovered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
        }`}>
          {status}
        </Badge>
      </div>
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-2">{title}</h4>
        <p className="text-2xl font-black font-mono mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-1">{desc}</p>
      </div>
    </div>
  );
}
