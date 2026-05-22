export interface EvidenceItem {
  id: string;
  topic: string;
  claim: string;
  evidenceLevel: "guideline" | "systematic_review" | "controlled_trial" | "observational" | "expert_consensus" | "exploratory";
  applicability: string;
  limitations: string[];
  userFacingExplanation: string;
}

export const evidenceRegistry: Record<string, EvidenceItem> = {
  hrv_low: {
    id: "hrv_low",
    topic: "HRV (RMSSD)",
    claim: "Une baisse significative de la HRV RMSSD par rapport à la baseline individuelle de l'athlète peut suggérer une fatigue temporaire ou une fluctuation de l'équilibre du système nerveux autonome.",
    evidenceLevel: "systematic_review",
    applicability: "Athlètes de tous niveaux pratiquant des sports d'endurance ou de force.",
    limitations: [
      "Souffre de forte variabilité selon l'heure de mesure (préférer les valeurs de sommeil complet).",
      "Très sensible à la consommation d'alcool, de repas tardifs et au stress psychologique aigu."
    ],
    userFacingExplanation: "Une HRV basse signifie que votre organisme s'adapte ou réagit activement pour faire face à une fatigue physique ou mentale. Votre niveau de récupération global est potentiellement restreint et à observer avec prudence."
  },
  rhr_elevated: {
    id: "rhr_elevated",
    topic: "Rythme Cardiaque de Repos (RHR)",
    claim: "Une augmentation de la fréquence cardiaque au repos de plus de 3-5 bpm par rapport à la moyenne à long terme est un signal compatible avec une fatigue systémique ou un stress psychologique, à interpréter avec le contexte.",
    evidenceLevel: "controlled_trial",
    applicability: "Idéalement mesuré en continu durant la phase stable du sommeil.",
    limitations: [
      "Peut être masqué par l'usage de bêta-bloquants.",
      "Fortement corrélé à la déshydratation temporaire ou d'un entraînement en soirée."
    ],
    userFacingExplanation: "Un rythme cardiaque au repos plus élevé que d'habitude suggère que votre organisme travaille plus dur au calme pour maintenir son équilibre interne. Cela peut provenir d'un stress résiduel ou d'une récupération incomplète, sans qu'un diagnostic ne puisse être conclu seul."
  },
  sleep_debt: {
    id: "sleep_debt",
    topic: "Sommeil",
    claim: "Une restriction chronique de sommeil (< 6h par nuit ou dette accumulée de > 4h sur une semaine) dégrade grandement les réserves d'énergie estimées et peut être associée à une sensibilité physique accrue.",
    evidenceLevel: "controlled_trial",
    applicability: "Ajustable selon le profil génétique du dormeur (court vs long dormeur).",
    limitations: [
      "Le besoin absolu de sommeil est très individuel.",
      "La qualité globale perçue (efficacité) est parfois plus prédictive que la durée exacte chez certains athlètes."
    ],
    userFacingExplanation: "Vos nuits récentes n'ont pas permis de reconstituer vos réserves optimales. La dette de sommeil réduit la réactivité perçue et favorise une plus grande susceptibilité aux inconforts physiques."
  },
  acwr_caution: {
    id: "acwr_caution",
    topic: "Charge d'Entraînement (ACWR)",
    claim: "Un Acute:Chronic Workload Ratio (ratio charge aiguë / chronique) supérieur à 1.5 peut être associé à une fatigue prolongée apparaissant sous 7 à 10 jours.",
    evidenceLevel: "systematic_review",
    applicability: "S'applique principalement aux sports d'endurance, de course à pied et de football.",
    limitations: [
      "Le ratio exact est sensible aux données manquantes.",
      "Ne prend pas en compte les variations de l'état psychologique qui agissent comme multiplicateurs."
    ],
    userFacingExplanation: "Votre volume/intensité d'entraînement a augmenté plus vite que votre moyenne habituelle. L'organisme requiert une certaine progressivité pour assimiler convenablement ce pic de stimulus."
  },
  rpe_mismatch: {
    id: "rpe_mismatch",
    topic: "Ressenti vs Capteur (RPE)",
    claim: "Un RPE subjectif anormalement élevé pour une charge externe faible (foulées lentes, puissance basse) est compatible avec une fatigue perçue ou une surcharge mentale sous-jacente.",
    evidenceLevel: "expert_consensus",
    applicability: "Analysé lors de la saisie post-séance par rapport aux zones de FC Garmin.",
    limitations: [
      "Demande une sincérité totale et un calibrage de l'échelle par l'utilisateur.",
      "N'est pas directement quantifiable par formule brute."
    ],
    userFacingExplanation: "Vous avez trouvé la séance d'aujourd'hui plus éprouvante que ce que la montre indique. Ce décalage suggère que vos ressources initiales étaient limitées, invitant simplement à l'écoute de soi."
  },
  low_energy_availability: {
    id: "low_energy_availability",
    topic: "Disponibilité Énergétique (EA)",
    claim: "Une faible disponibilité énergétique estimée (apport alimentaire - exercice < 30 kcal/kg masse maigre/jour) est parfois associée à des variations transitoires de récupération.",
    evidenceLevel: "guideline",
    applicability: "Surtout critique chez les athlètes de disciplines d'endurance.",
    limitations: [
      "Difficile à estimer sans mesure de l'intake calorique exact et de la composition corporelle précise, données insuffisantes pour conclure seul."
    ],
    userFacingExplanation: "Votre alimentation actuelle ne couvre peut-être pas les besoins combinés de votre quotidien et de vos séances de haute intensité, à interpréter avec le reste du contexte."
  }
};
