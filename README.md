# Aura Elite

Aura Elite est une plateforme personnelle de monitoring destinée aux athlètes de haut niveau (et passionnés exigeants) visant l'optimisation de la performance, l'équilibre de la charge d'entraînement, et la prévention du surentraînement.

## Périmètre du Projet

Aura Elite se positionne comme un agrégateur et moteur d’analyse déterministe centré sur :
1. **Garmin** : comme source de données physiologique (HRV, sommeil, biometrie) et sportive (activités, TSS, charges). L'intégration se fait via l'import direct de fichiers ZIP, CSV, FIT ou JSON (pas d'API externe requise en V1).
2. **Saisie Utilisateur** : via des formulaires journaliers subjectifs (Index Hooper, RPE de séance, contexte de vie, hydratation, logs de douleur, menstruations).
3. **Données Dérivées (Engine)** : Notre moteur déterministe (Aura Analytics) calcule longitudinalement l'ACWR (Acute:Chronic Workload Ratio), les z-scores de récupération, les dettes de sommeil, et les bilans énergétiques (si la masse maigre est renseignée).

**Architecture et Philosophie :**
- **Déterministe & Transparent** : Aucun "score magique" généré par une IA. Tous les calculs sont mathématiques et affichent les "drivers" exacts qui les composent (Data Used, Data Missing, Limits).
- **Prudence & Non-Médical** : Aura Elite propose des *recommandations* et des *évaluations de risques* (ex: RED-S ou disponibilité énergétique) en conservant un wording très prudent ("signal de vigilance", "adaptation recommandée"). Aucun diagnostic n'est posé.
- **Explainability Layer** : Les rapports sous forme de textes destinés aux athlètes sont d'abord structurés par un moteur interne, puis reformulés de façon pédagogique en bout de chaîne (ex: Gemini) – uniquement à des fins de *rewrite* littéraire, sans liberté d'action sur les tendances ni sur les chiffres.

## Moteur Modulaire (Analysis Engine)

La chaîne de calcul est séparée en sous-moteurs distincts :
- **Baseline Engine** : Suivi longitudinal robuste (7, 14, 28, 42, 90 jours) avec MAD/Median et indices de maturité des données.
- **Training Load Engine** : Gère l'ACWR et la dynamique des charges.
- **Sleep Engine** : Agrège durée, score, dette de sommeil et RHR nocturne.
- **Recovery Engine** : Fusionne HRV, RHR, et logs subjectifs (Hooper).
- **Nutrition/Context/Mental Engines** : Modélisent le bilan énergétique, le stress et les contraintes externes (voyages, alcool, examens).
- **Readiness Engine & Risk Boundary** : Calculent le score final de disponibilité et évaluent les exceptions cliniques (ex: blessure extrême ou indisposition signalée).

## Données & Vie Privée (Firebase / Local)

Aura Elite suit une conception Data Priority :
- En version Web/Preview : les données sont conservées localement dans `IndexedDB` (persist-middleware de Zustand).
- Si configuré, la synchronisation avec **Firebase Firestore** est active mais requise derrière des Règles de Sécurité fortes (seul l'utilisateur authentifié accède à ses profils, métriques, journaux subjectifs et imports).

## Prochaines Étapes / Roadmap

- Intégration complète de portions alimentaires, base d'ingrédients détaillés et affinage de la Disponibilité Énergétique (EA).
- Implémentation de Firebase Auth pour le déploiement sur plusieurs terminaux.
- Extension du support FIT pour les courbes de puissance Garmin très haute révolution.
- Développement de l'infrastructure de notifications.

## Tests
Pour exécuter les cas de test ou validators internes, référez-vous aux scripts NPM fournis. La plateforme dispose d'un framework d'analyse qualitatif des données (Q/A `assessDataQuality`).
