export type ReadinessScore = number; // 0-100

export type DataSource = "garmin" | "manual" | "derived";

export interface UserProfile {
  general: {
    name: string;
    age: number | null;
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | "";
    height: number | null; // cm
    weight: number | null; // kg
    activityLevel:
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "athlete"
      | "";
    primaryGoal: string;
  };
  health: {
    conditions: string[];
    allergies: string[];
    injuries: string[];
    medications: string[];
  };
  sport: {
    primarySport: string;
    trainingFrequency: number; // sessions per week
    weeklyVolume: number; // hours
    intensity: "low" | "medium" | "high" | "variable" | "";
  };
  preferences: {
    units: "metric" | "imperial";
    enableMenstrualTracking: boolean;
    notificationsEnabled: boolean;
    dataSharingConsent: boolean;
  };
}

export interface MenstrualLog {
  id: string;
  date: string; // ISO 8601
  flow: "none" | "spotting" | "light" | "medium" | "heavy";
  painLevel: number; // 0-10
  symptoms: string[]; // e.g., 'cramps', 'headache', 'bloating', 'fatigue', 'mood_swings'
  sleepQuality: number; // 0-100
  notes: string;
}

export interface NormalizedMetric {
  id: string;
  source: DataSource;
  sourceId?: string; // Reference to the import log or file
  timestamp: string; // ISO 8601
  type:
    | "hrv_rmssd"
    | "rhr"
    | "sleep_duration"
    | "sleep_efficiency"
    | "sleep_quality"
    | "rpe"
    | "acwr"
    | "stress"
    | "calories"
    | "training_load"
    | "steps"
    | "body_battery"
    | "mood"
    | "soreness"
    | "weight"
    | "subjective_fatigue"
    | "subjective_stress"
    | "subjective_sleep_quality"
    | "subjective_soreness"
    | "subjective_mood"
    | "motivation"
    | "pain_score"
    | "digestive_comfort"
    | "appetite"
    | "energy_level"
    | "notes_context"
    | "spo2"
    | "respiration"
    | "vo2max"
    | "ftp"
    | "lthr"
    | "sleep_score";
  value: number;
  unit: string;
  confidenceScore: number; // 0-100 (Couche A: Qualité de la donnée)
}

// Couche G: Monitoring Quotidien (Hooper Index étendu)
export interface HooperLog {
  id: string;
  date: string; // YYYY-MM-DD
  fatigue: number; // 1-7 (1 = Très en forme, 7 = Épuisé)
  stress: number; // 1-7 (1 = Très détendu, 7 = Très stressé)
  sleepQuality: number; // 1-7 (1 = Excellent, 7 = Très mauvais)
  soreness: number; // 1-7 (1 = Aucune douleur, 7 = Très douloureux)
  mood: number; // 1-7 (1 = Très motivé/Heureux, 7 = Déprimé/Apathique)
  notes?: string;
}

// Couche C: RPE de séance (Session RPE)
export interface SessionRPE {
  id: string;
  activityId: string; // Lien avec GarminActivity
  date: string;
  rpe: number; // 1-10 (Échelle de Borg modifiée CR10)
  durationMinutes: number;
  feeling: number; // 1-5 (1 = Très mauvais, 5 = Très bon)
  pain?: string; // Localisation douleur si existante
}

// Couche G: Screening Hebdomadaire (Santé Mentale)
export interface WeeklyScreeningLog {
  id: string;
  date: string;
  pssScore: number; // Perceived Stress Scale (0-40)
  phq9Score: number; // Patient Health Questionnaire (0-27)
  gad7Score: number; // Generalized Anxiety Disorder (0-21)
}

// Couche B: Structure de Baseline Individuelle
export interface BaselineStats {
  currentValue: number;
  mean7d: number;
  std7d: number;
  mean28d: number;
  std28d: number;
  zScore7d: number; // (current - mean7d) / std7d
  zScore28d: number;
  cv28d: number; // Coefficient de variation (std/mean)
  trend: "increasing" | "decreasing" | "stable";
}

// Moteur de Fusion: Les 6 Scores Principaux
export interface EngineScores {
  date: string;
  performanceReadiness: {
    score: number;
    confidence: number;
    status: "optimal" | "normal" | "low" | "danger";
  };
  recoveryStatus: {
    score: number;
    confidence: number;
    status: "recovered" | "adapting" | "fatigued" | "exhausted";
  };
  sleepHealth: {
    score: number;
    confidence: number;
    status: "optimal" | "adequate" | "debt" | "severe_debt";
  };
  nutritionAdequacy: {
    score: number;
    confidence: number;
    status: "optimal" | "adequate" | "deficit" | "risk";
  };
  psychologicalLoad: {
    score: number;
    confidence: number;
    status: "low" | "moderate" | "high" | "overload";
  };
  medicalRisk: {
    flags: string[];
    level: "none" | "monitor" | "warning" | "clinical_referral";
  };
  globalActionPriority: string; // ex: "Priorité Sommeil", "Feu Vert Entraînement", "Risque RED-S"
  acwr?: number; // Acute:Chronic Workload Ratio
}

export interface ConnectionState {
  source: DataSource;
  status: "disconnected" | "connected" | "error" | "syncing";
  lastSync?: string;
  name: string;
  icon: string;
  description: string;
}

export interface DailyMetrics {
  date: string;
  hrv: number; // Variabilité de la fréquence cardiaque
  rhr: number; // Fréquence cardiaque au repos
  sleepDuration: number; // en heures
  sleepQuality: number; // 0-100
  rpe: number; // Intensité perçue (0-10)
  stressLevel: number; // 0-10
  mood: string;
  soreness: number; // 0-10
  weight: number;
}

export interface Recommendation {
  id: string;
  category: "training" | "nutrition" | "recovery" | "lifestyle";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  scientificBasis?: string;
}

export interface AnalysisResult {
  readinessScore: ReadinessScore;
  status: "optimal" | "stable" | "strained" | "critical";
  summary: string;
  recommendations: Recommendation[];
  trends: {
    hrv: "up" | "down" | "stable";
    recovery: "improving" | "declining" | "stable";
  };
}

// --- Garmin Import Hub Types ---

export type GarminImportType = "history" | "wellness" | "activity";

export interface GarminImportLog {
  id: string;
  type: GarminImportType;
  filename: string;
  importDate: string; // ISO 8601
  dateCovered?: string; // For wellness/activity, the specific date it covers
  status:
    | "success"
    | "partial"
    | "error"
    | "duplicate"
    | "warning"
    | "processing";
  recordsAdded: number;
  recordsIgnored?: number;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface GarminActivity {
  id: string; // Robust hash or composite key
  sourceId?: string; // Reference to the import log
  date: string; // ISO 8601
  type: string;
  title: string;
  distance: number; // km
  duration: string; // HH:MM:SS
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  tss: number | null;
  // ... other metrics can be added as needed
}

export interface MealItem {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  gramsSelected: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  rawCookedState?: "raw" | "cooked";
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "intra_workout" | "post_workout";
  items: MealItem[];
  photoIds?: string[];
  hungerBefore?: number; // 1-5
  satietyAfter?: number; // 1-5
  digestionAfter?: number; // 1-5
  notes?: string;
}

export interface PainLog {
  id: string;
  date: string; // YYYY-MM-DD
  location: string; // e.g., 'Knee', 'Lower Back'
  side: "left" | "right" | "bilateral" | "none";
  type: "muscular" | "tendinous" | "articular" | "osseux" | "nervous" | "unknown";
  intensityRest: number; // 0-10
  intensityActive: number; // 0-10
  onset: "onset_sudden" | "onset_gradual";
  aggravatedBy?: string;
  relievedBy?: string;
  impact: string; // 'none' | 'modified_training' | 'no_training'
  notes?: string;
}

