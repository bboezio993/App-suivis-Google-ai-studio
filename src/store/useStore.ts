import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set as idbSet, del } from 'idb-keyval';
import { NormalizedMetric, ConnectionState, DataSource, UserProfile, MenstrualLog, GarminImportLog, GarminActivity, HooperLog, SessionRPE, LifeContextLog, EngineScores, WeeklyScreeningLog, MealLog, PainLog, RejectedMetric } from '../types';
import { runAnalysisEngine } from '../services/analysisEngine/engine';
import { syncMetricsToFirestore, syncLogToFirestore, syncProfileToFirestore, syncActivitiesToFirestore } from '../services/firebaseSync';
import { metricRegistry } from '../domain/metrics/metricRegistry';
import { assessDataQuality } from '../domain/dataQuality/dataQualityService';

// Custom storage for IndexedDB
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface AppState {
  metrics: NormalizedMetric[];
  rejectedMetrics: RejectedMetric[];
  connections: Record<DataSource, ConnectionState>;
  userProfile: UserProfile;
  menstrualLogs: MenstrualLog[];
  garminImportLogs: GarminImportLog[];
  garminActivities: GarminActivity[];
  hooperLogs: HooperLog[];
  sessionRpeLogs: SessionRPE[];
  weeklyScreeningLogs: WeeklyScreeningLog[];
  mealLogs: MealLog[];
  painLogs: PainLog[];
  contextLogs: LifeContextLog[];
  engineScores: EngineScores | null;
  addMetric: (metric: NormalizedMetric) => void;
  addMetrics: (metrics: NormalizedMetric[]) => void;
  updateConnection: (source: DataSource, status: ConnectionState['status']) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addMenstrualLog: (log: MenstrualLog) => void;
  addGarminImportLog: (log: GarminImportLog) => void;
  updateGarminImportLog: (id: string, updates: Partial<GarminImportLog>) => void;
  addGarminActivities: (activities: GarminActivity[]) => void;
  addHooperLog: (log: HooperLog) => void;
  addSessionRPE: (log: SessionRPE) => void;
  addWeeklyScreeningLog: (log: WeeklyScreeningLog) => void;
  addMealLog: (log: MealLog) => void;
  addPainLog: (log: PainLog) => void;
  addContextLog: (log: LifeContextLog) => void;
  computeEngineScores: () => void;
}

const initialProfile: UserProfile = {
  general: { name: 'Athlète Elite', age: 28, gender: 'female', height: 175, weight: 65, activityLevel: 'athlete', primaryGoal: 'Performance' },
  health: { conditions: [], allergies: [], injuries: [], medications: [] },
  sport: { primarySport: 'Triathlon', trainingFrequency: 6, weeklyVolume: 12, intensity: 'variable' },
  preferences: { units: 'metric', enableMenstrualTracking: true, notificationsEnabled: true, dataSharingConsent: true }
};

const initialConnections: Record<DataSource, ConnectionState> = {
  garmin: { source: 'garmin', status: 'disconnected', name: 'Garmin Connect', icon: 'garmin', description: 'Import par fichiers ZIP, CSV, JSON ou FIT (Sommeil, HRV, Activités, Charge).' },
  manual: { source: 'manual', status: 'connected', name: 'Saisie Manuelle', icon: 'edit', description: 'Formulaires journaliers, RPE, nutrition, hydratation, douleurs.' },
  derived: { source: 'derived', status: 'connected', name: 'Aura Analytics (Calculé)', icon: 'cpu', description: 'Indicateurs de charge ACWR, Readiness, scores fatigues cumulés.' }
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      metrics: [],
      rejectedMetrics: [],
      connections: initialConnections,
      userProfile: initialProfile,
      menstrualLogs: [],
      garminImportLogs: [],
      garminActivities: [],
      hooperLogs: [],
      sessionRpeLogs: [],
      weeklyScreeningLogs: [],
      mealLogs: [],
      painLogs: [],
      contextLogs: [],
      engineScores: null,
      addMetric: (metric) => {
        if (!metricRegistry[metric.type]) {
          console.warn(`[Store] Rejected unregistered metric type: ${metric.type}`);
          set((state) => ({
            rejectedMetrics: [...state.rejectedMetrics, { id: crypto.randomUUID(), metric, reason: "Unregistered metric type", source: metric.source, timestamp: metric.timestamp, typeProposed: metric.type, value: metric.value, unit: metric.unit, confidenceScore: metric.confidenceScore || 0 }]
          }));
          return;
        }
        const quality = assessDataQuality(metric);
        metric.confidenceScore = quality.finalConfidence;
        
        if (quality.finalConfidence < 50) {
          console.warn(`[Store] Rejected low quality metric (${quality.finalConfidence}%):`, metric);
          set((state) => ({
            rejectedMetrics: [...state.rejectedMetrics, { id: crypto.randomUUID(), metric, reason: `Low quality (${quality.finalConfidence}%)`, source: metric.source, timestamp: metric.timestamp, typeProposed: metric.type, value: metric.value, unit: metric.unit, confidenceScore: quality.finalConfidence }]
          }));
          return;
        }
        
        set((state) => ({ metrics: [...state.metrics, metric] }));
        get().computeEngineScores();
      },
      addMetrics: (metrics) => {
        const rejected: RejectedMetric[] = [];
        const validMetrics = metrics.filter(m => {
          if (!metricRegistry[m.type]) {
            console.warn(`[Store] Rejected unregistered metric type: ${m.type}`);
            rejected.push({ id: crypto.randomUUID(), metric: m, reason: "Unregistered metric type", source: m.source, timestamp: m.timestamp, typeProposed: m.type, value: m.value, unit: m.unit, confidenceScore: m.confidenceScore || 0, importLogId: m.sourceId });
            return false;
          }
          const quality = assessDataQuality(m);
          m.confidenceScore = quality.finalConfidence;
          
          if (quality.finalConfidence < 50) {
             console.warn(`[Store] Rejected low quality metric (${quality.finalConfidence}%):`, m);
             rejected.push({ id: crypto.randomUUID(), metric: m, reason: `Low quality (${quality.finalConfidence}%)`, source: m.source, timestamp: m.timestamp, typeProposed: m.type, value: m.value, unit: m.unit, confidenceScore: quality.finalConfidence, importLogId: m.sourceId });
             return false;
          }
          return true;
        });
        set((state) => {
          const metricMap = new Map(state.metrics.map(m => [m.id, m]));
          validMetrics.forEach(m => {
            const existing = metricMap.get(m.id);
            // Update if it doesn't exist, or if the new one has a higher confidence score
            if (!existing || m.confidenceScore >= existing.confidenceScore) {
              metricMap.set(m.id, m);
            }
          });
          return {
            metrics: Array.from(metricMap.values()),
            rejectedMetrics: [...state.rejectedMetrics, ...rejected]
          };
        });
        
        // Debounce computation to avoid huge performance hit during mass imports
        if ((window as any).engineDebounce) clearTimeout((window as any).engineDebounce);
        (window as any).engineDebounce = setTimeout(() => {
          get().computeEngineScores();
        }, 1000);
      },
      updateConnection: (source, status) => set((state) => ({
        connections: {
          ...state.connections,
          [source]: { 
            ...state.connections[source], 
            status, 
            lastSync: status === 'connected' ? new Date().toISOString() : state.connections[source].lastSync 
          }
        }
      })),
      updateUserProfile: (profile) => {
        set((state) => {
           const newProfile = { ...state.userProfile, ...profile };
           // Don't sync if called from the firebase real-time listener (usually profile comes fully populated and matching)
           // If called from the UI, we should sync to firestore
           syncProfileToFirestore(newProfile).catch(() => {});
           return { userProfile: newProfile };
        });
      },
      addMenstrualLog: (log) => set((state) => ({ menstrualLogs: [...state.menstrualLogs, log] })),
      addGarminImportLog: (log) => set((state) => ({ garminImportLogs: [log, ...state.garminImportLogs] })),
      updateGarminImportLog: (id, updates) => set((state) => ({
        garminImportLogs: state.garminImportLogs.map(log => log.id === id ? { ...log, ...updates } : log)
      })),
      addGarminActivities: (activities) => {
        set((state) => {
          const activityMap = new Map(state.garminActivities.map(a => [a.id, a]));
          activities.forEach(a => {
            activityMap.set(a.id, a); // Upsert activity
          });
          // Sort by date descending
          const sortedActivities = Array.from(activityMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return { garminActivities: sortedActivities };
        });
        
        // Debounce computation to avoid huge performance hit during mass imports
        if ((window as any).engineDebounce) clearTimeout((window as any).engineDebounce);
        (window as any).engineDebounce = setTimeout(() => {
          get().computeEngineScores();
        }, 1000);
      },
      addHooperLog: (log) => {
        set((state) => {
          const filtered = state.hooperLogs.filter(l => l.date !== log.date);
          return { hooperLogs: [...filtered, log].sort((a, b) => a.date.localeCompare(b.date)) };
        });
        get().computeEngineScores();
      },
      addSessionRPE: (log) => {
        set((state) => {
          const filtered = state.sessionRpeLogs.filter(l => l.activityId !== log.activityId);
          return { sessionRpeLogs: [...filtered, log] };
        });
        get().computeEngineScores();
      },
      addWeeklyScreeningLog: (log) => {
        set((state) => {
          const filtered = state.weeklyScreeningLogs.filter(l => l.date !== log.date);
          return { weeklyScreeningLogs: [...filtered, log].sort((a, b) => a.date.localeCompare(b.date)) };
        });
        get().computeEngineScores();
      },
      addMealLog: (log) => {
        set((state) => {
          const filtered = state.mealLogs.filter(l => l.id !== log.id);
          return { mealLogs: [...filtered, log] };
        });
        // Integrate into global metrics so that nutrition calculations get processed in real-time
        get().computeEngineScores();
      },
      addPainLog: (log) => {
        set((state) => {
          const filtered = state.painLogs.filter(l => l.id !== log.id);
          return { painLogs: [...filtered, log] };
        });
        get().computeEngineScores();
      },
      addContextLog: (log) => {
        set((state) => {
          const filtered = state.contextLogs.filter(l => l.id !== log.id);
          return { contextLogs: [...filtered, log] };
        });
        get().computeEngineScores();
      },
      computeEngineScores: () => {
        const state = get();
        const scores = runAnalysisEngine(state);
        set({ engineScores: scores });
      }
    }),
    {
      name: 'aura-elite-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
