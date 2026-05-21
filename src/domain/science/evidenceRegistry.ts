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
    claim: "Une baisse significative de la HRV RMSSD par rapport à la baseline individuelle de l'athlète indique une surcharge du système nerveux autonome parasympathique.",
    evidenceLevel: "systematic_review",
    applicability: "Athlètes de tous niveaux pratiquant des sports d'endurance ou de force.",
    limitations: [
      "Souffre de forte variabilité selon l'heure de mesure (préférer les valeurs de sommeil complet).",
      "Très sensible à la consommation d'alcool, de repas tardifs et au stress psychologique aigu."
    ],
    userFacingExplanation: "Une HRV basse signifie que votre corps est en train de lutter activement pour s'adapter à une fatigue physique ou mentale. Votre niveau de récupération global est potentiellement restreint."
  },
  rhr_elevated: {
    id: "rhr_elevated",
    topic: "Rythme Cardiaque de Repos (RHR)",
    claim: "Une augmentation de la fréquence cardiaque au repos de plus de 3-5 bpm par rapport à la moyenne à long terme est une forte indication de fatigue systémique, de stress psychologique ou de début de maladie.",
    evidenceLevel: "controlled_trial",
    applicability: "Idéalement mesuré en continu durant la phase stable du sommeil.",
    limitations: [
      "Peut être masqué par l'usage de bêta-bloquants.",
      "Fortement corrélé à la déshydratation temporaire ou d'un entraînement en soirée."
    ],
    userFacingExplanation: "Un rythme cardiaque au repos plus élevé que d'habitude suggère que votre organisme travaille plus dur au calme pour maintenir son homéostasie. Cela peut provenir d'un stress résiduel ou d'une mauvaise récupération."
  },
  sleep_debt: {
    id: "sleep_debt",
    topic: "Sommeil",
    claim: "Une restriction chronique de sommeil (< 6h par nuit ou dette accumulée de > 4h sur une semaine) dégrade grandement les réserves d'énergie aérobie, la force maximale et augmente de 2.5x le risque de douleurs musculo-squelettiques.",
    evidenceLevel: "controlled_trial",
    applicability: "Ajustable selon le profil génétique du dormeur (court vs long dormeur).",
    limitations: [
      "Le besoin absolu de sommeil est très individuel.",
      "La qualité globale perçue (efficacité) est parfois plus prédictive que la durée exacte chez certains athlètes."
    ],
    userFacingExplanation: "Vos nuits récentes n'ont pas permis de reconstituer vos réserves. La dette de sommeil dégrade la vitesse de réaction, la synthèse protéique musculaire et augmente votre susceptibilité aux signaux de douleur."
  },
  acwr_caution: {
    id: "acwr_caution",
    topic: "Charge d'Entraînement (ACWR)",
    claim: "Un Acute:Chronic Workload Ratio (ratio charge aiguë / chronique) supérieur à 1.5 augmente significativement le risque de fatigue prolongée dans les 7-10 jours.",
    evidenceLevel: "systematic_review",
    applicability: "S'applique principalement aux sports d'endurance, de course à pied et de football.",
    limitations: [
      "Le ratio exact est sensible aux données manquantes.",
      "Ne prend pas en compte les variations de l'état psychologique qui agissent comme multiplicateurs."
    ],
    userFacingExplanation: "Votre volume/intensité d'entraînement a augmenté trop rapidement cette semaine par rapport à votre moyenne habituelle. Votre corps n'est pas encore adapté à un tel pic de stimulus."
  },
  rpe_mismatch: {
    id: "rpe_mismatch",
    topic: "Ressenti vs Capteur (RPE)",
    claim: "Un RPE subjectif anormalement élevé pour une charge externe faible (foulées lentes, puissance basse) montre une fatigue centrale ou une surcharge mentale sous-jacente.",
    evidenceLevel: "expert_consensus",
    applicability: "Analysé lors de la saisie post-séance par rapport aux zones de FC Garmin.",
    limitations: [
      "Demande une sincérité totale et un calibrage de l'échelle par l'utilisateur.",
      "N'est pas directement quantifiable par formule brute."
    ],
    userFacingExplanation: "Vous avez trouvé la séance d'aujourd'hui plus dure que ce que la montre indique. Ce décalage confirme que votre énergie disponible était basse, signalant un besoin de lever le pied."
  },
  low_energy_availability: {
    id: "low_energy_availability",
    topic: "Disponibilité Énergétique (EA)",
    claim: "Une faible disponibilité énergétique (intake alimentaire - exercice < 30 kcal/kg masse maigre/jour) prolongée perturbe l'axe hypothalamo-hypophysaire, réduisant les niveaux hormonaux d'adaptation.",
    evidenceLevel: "guideline",
    applicability: "Surtout critique chez les femmes athlètes de disciplines d'endurance avec esthétique ou catégorie de poids.",
    limitations: [
      "Difficile à estimer sans mesure de l'intake calorique exact et de la composition corporelle précise."
    ],
    userFacingExplanation: "Votre alimentation actuelle ne couvre peut-être pas les besoins combinés de votre quotidien et de vos séances sportives de haute intensité."
  }
};
