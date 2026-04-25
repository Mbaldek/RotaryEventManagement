// Rotary Startup Award 2026 — shared constants
// Session IDs are the canonical identifier in session_config / startup_confirmations / jury_scores.
// jury_profiles.assigned_sessions stores the human LABEL (FR) instead of the ID — we map both ways here.

export const SESSIONS = [
  {
    id: "s1_foodtech",
    label: "FoodTech & Économie circulaire",
    labelEn: "FoodTech & Circular Economy",
    labelDe: "FoodTech & Kreislaufwirtschaft",
    emoji: "🌾",
    date: "Jeudi 30 avril · 18h",
    dateEn: "Thursday April 30 · 6pm",
    dateDe: "Donnerstag, 30. April · 18 Uhr",
    color: "#5a7a1a",
    light: "#eef5e0",
    border: "#c0d890",
  },
  {
    id: "s2_social",
    label: "Impact social & Edtech",
    labelEn: "Social Impact & Edtech",
    labelDe: "Soziale Wirkung & Edtech",
    emoji: "🤝",
    date: "Mercredi 6 mai · 18h",
    dateEn: "Wednesday May 6 · 6pm",
    dateDe: "Mittwoch, 6. Mai · 18 Uhr",
    color: "#8a2040",
    light: "#fbe8ee",
    border: "#e8a8bc",
  },
  {
    id: "s3_tech",
    label: "Tech, AI, Fintech & Mobilité",
    labelEn: "Tech, AI, Fintech & Mobility",
    labelDe: "Tech, KI, Fintech & Mobilität",
    emoji: "💻",
    date: "Mercredi 13 mai · 18h",
    dateEn: "Wednesday May 13 · 6pm",
    dateDe: "Mittwoch, 13. Mai · 18 Uhr",
    color: "#4a2a7a",
    light: "#f0eaf8",
    border: "#c8b0e8",
  },
  {
    id: "s4_health",
    label: "Healthtech & Biotech",
    labelEn: "Healthtech & Biotech",
    labelDe: "Healthtech & Biotech",
    emoji: "🏥",
    date: "Mardi 19 mai · 18h",
    dateEn: "Tuesday May 19 · 6pm",
    dateDe: "Dienstag, 19. Mai · 18 Uhr",
    color: "#1a5fa8",
    light: "#e8f0fb",
    border: "#a8c8f0",
  },
  {
    id: "s5_greentech",
    label: "Greentech & Environnement",
    labelEn: "Greentech & Environment",
    labelDe: "Greentech & Umwelt",
    emoji: "🌱",
    date: "Jeudi 21 mai · 18h",
    dateEn: "Thursday May 21 · 6pm",
    dateDe: "Donnerstag, 21. Mai · 18 Uhr",
    color: "#1d6b4f",
    light: "#e8f5ee",
    border: "#b0d8c4",
  },
  {
    id: "final_grande",
    label: "Grande Finale",
    labelEn: "Grand Final",
    labelDe: "Großes Finale",
    emoji: "🏆",
    date: "À définir",
    dateEn: "TBD",
    dateDe: "TBD",
    color: "#c9a84c",
    light: "#fdf6e8",
    border: "#e8d090",
    isFinal: true,
  },
];

export const FINAL_SESSION_ID = "final_grande";

export const SESSION_BY_ID = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));
export const SESSION_BY_LABEL = Object.fromEntries(SESSIONS.map((s) => [s.label, s]));

export const QUALIFYING_SESSIONS = SESSIONS.filter((s) => !s.isFinal);

export function getSessionLabel(session, lang = "fr") {
  if (!session) return "";
  if (lang === "en") return session.labelEn || session.label;
  if (lang === "de") return session.labelDe || session.label;
  return session.label;
}

export function getSessionDate(session, lang = "fr") {
  if (!session) return "";
  if (lang === "en") return session.dateEn || session.date;
  if (lang === "de") return session.dateDe || session.date;
  return session.date;
}

// Scoring criteria — weights per pre-migration RsaScore.jsx (commit b4c3fec).
// Weighted max = 5 (0.2*5*4 + 0.1*5*2 = 4 + 1 = 5).
// Root `label`/`desc`/`anchors` keep the English text for backwards compat with existing
// admin consumers (LiveTab, ScoreCell). Jury-facing screens use `getCriterion(c, lang)`.
export const CRITERIA = [
  {
    id: "score_value_prop",
    label: "Value Proposition",
    weight: 0.2,
    desc: "Clarity of the problem addressed, strength of the customer pain, uniqueness and relevance of the solution.",
    anchors: {
      0: "No clear problem or value proposition",
      1: "Problem identified but solution unclear",
      2: "Real problem, generic solution",
      3: "Clear problem + differentiated solution",
      4: "Strong differentiation, validated by early customers",
      5: "Critical pain point + uniquely positioned solution with proven traction",
    },
    i18n: {
      fr: {
        label: "Proposition de valeur",
        desc: "Clarté du problème adressé, intensité du besoin client, unicité et pertinence de la solution.",
        anchors: {
          0: "Pas de problème ni de proposition de valeur clairs",
          1: "Problème identifié mais solution floue",
          2: "Problème réel, solution générique",
          3: "Problème clair + solution différenciée",
          4: "Forte différenciation, validée par les premiers clients",
          5: "Pain point critique + solution unique avec traction avérée",
        },
      },
      de: {
        label: "Wertversprechen",
        desc: "Klarheit des adressierten Problems, Stärke des Kundenschmerzpunkts, Einzigartigkeit und Relevanz der Lösung.",
        anchors: {
          0: "Kein klares Problem oder Wertversprechen",
          1: "Problem identifiziert, aber Lösung unklar",
          2: "Reales Problem, generische Lösung",
          3: "Klares Problem + differenzierte Lösung",
          4: "Starke Differenzierung, von ersten Kunden validiert",
          5: "Kritischer Schmerzpunkt + einzigartig positionierte Lösung mit nachgewiesener Traktion",
        },
      },
    },
  },
  {
    id: "score_market",
    label: "Market & Scalability",
    weight: 0.2,
    desc: "Market size (TAM/SAM/SOM), accessibility, growth dynamics, and potential for geographic or sector expansion.",
    anchors: {
      0: "Market not defined",
      1: "Vague market reference",
      2: "Market identified but not quantified",
      3: "Quantified market with realistic segmentation",
      4: "Large credible market with clear go-to-market",
      5: "Large, quantified, high-growth market with scalable expansion plan",
    },
    i18n: {
      fr: {
        label: "Marché & Scalabilité",
        desc: "Taille de marché (TAM/SAM/SOM), accessibilité, dynamiques de croissance, potentiel d'expansion géographique ou sectorielle.",
        anchors: {
          0: "Marché non défini",
          1: "Référence au marché vague",
          2: "Marché identifié mais non quantifié",
          3: "Marché quantifié avec segmentation réaliste",
          4: "Marché large et crédible avec go-to-market clair",
          5: "Marché large, quantifié, à forte croissance avec plan d'expansion scalable",
        },
      },
      de: {
        label: "Markt & Skalierbarkeit",
        desc: "Marktgröße (TAM/SAM/SOM), Zugänglichkeit, Wachstumsdynamik und Potenzial für geografische oder sektorale Expansion.",
        anchors: {
          0: "Markt nicht definiert",
          1: "Vage Marktreferenz",
          2: "Markt identifiziert, aber nicht quantifiziert",
          3: "Quantifizierter Markt mit realistischer Segmentierung",
          4: "Großer, glaubwürdiger Markt mit klarer Go-to-Market-Strategie",
          5: "Großer, quantifizierter, stark wachsender Markt mit skalierbarem Expansionsplan",
        },
      },
    },
  },
  {
    id: "score_business_model",
    label: "Business Model",
    weight: 0.2,
    desc: "Revenue logic, pricing model, unit economics, path to profitability.",
    anchors: {
      0: "No business model",
      1: "Revenue idea with no structure",
      2: "Model defined but fragile economics",
      3: "Clear model with some validated metrics",
      4: "Solid model, good unit economics, path to break-even visible",
      5: "Proven model, strong economics, clear scaling path",
    },
    i18n: {
      fr: {
        label: "Business Model",
        desc: "Logique de revenus, modèle de pricing, unit economics, chemin vers la rentabilité.",
        anchors: {
          0: "Pas de business model",
          1: "Idée de revenus sans structure",
          2: "Modèle défini mais économie fragile",
          3: "Modèle clair avec quelques indicateurs validés",
          4: "Modèle solide, bons unit economics, break-even visible",
          5: "Modèle éprouvé, économie robuste, chemin de scaling clair",
        },
      },
      de: {
        label: "Geschäftsmodell",
        desc: "Umsatzlogik, Preismodell, Unit Economics, Weg zur Profitabilität.",
        anchors: {
          0: "Kein Geschäftsmodell",
          1: "Umsatzidee ohne Struktur",
          2: "Modell definiert, aber wirtschaftlich fragil",
          3: "Klares Modell mit einigen validierten Kennzahlen",
          4: "Solides Modell, gute Unit Economics, Break-Even absehbar",
          5: "Bewährtes Modell, starke Wirtschaftlichkeit, klarer Skalierungspfad",
        },
      },
    },
  },
  {
    id: "score_team",
    label: "Team Execution & Capability",
    weight: 0.2,
    desc: "Founders' backgrounds, complementarity, relevant expertise, ability to execute and adapt.",
    anchors: {
      0: "Incomplete or irrelevant team",
      1: "Team lacks critical skills",
      2: "Relevant team with notable gaps",
      3: "Credible team with most key skills",
      4: "Strong complementary team with relevant track record",
      5: "Exceptional team — domain experts, proven executors, strong cohesion",
    },
    i18n: {
      fr: {
        label: "Équipe — exécution & capacité",
        desc: "Parcours des fondateurs, complémentarité, expertise pertinente, capacité à exécuter et s'adapter.",
        anchors: {
          0: "Équipe incomplète ou non pertinente",
          1: "Compétences critiques manquantes",
          2: "Équipe pertinente avec lacunes notables",
          3: "Équipe crédible avec la plupart des compétences clés",
          4: "Équipe complémentaire solide avec expérience pertinente",
          5: "Équipe exceptionnelle — experts du domaine, exécutants éprouvés, forte cohésion",
        },
      },
      de: {
        label: "Team — Umsetzung & Fähigkeit",
        desc: "Hintergrund der Gründer, Komplementarität, einschlägige Expertise, Fähigkeit zur Umsetzung und Anpassung.",
        anchors: {
          0: "Unvollständiges oder ungeeignetes Team",
          1: "Kritische Kompetenzen fehlen",
          2: "Relevantes Team mit deutlichen Lücken",
          3: "Glaubwürdiges Team mit den meisten Schlüsselkompetenzen",
          4: "Starkes, komplementäres Team mit einschlägiger Erfolgsbilanz",
          5: "Außergewöhnliches Team — Domänenexperten, bewährte Umsetzer, starker Zusammenhalt",
        },
      },
    },
  },
  {
    id: "score_pitch_quality",
    label: "Pitch Quality",
    weight: 0.1,
    desc: "Structure, clarity, storytelling, handling of Q&A, time discipline.",
    anchors: {
      0: "Confusing, off-time, no narrative",
      1: "Basic structure, poor delivery",
      2: "Understandable but lacks conviction",
      3: "Clear and structured, decent delivery",
      4: "Compelling narrative, good Q&A",
      5: "Outstanding — clear, memorable, confident, excellent Q&A",
    },
    i18n: {
      fr: {
        label: "Qualité du pitch",
        desc: "Structure, clarté, storytelling, gestion des Q&R, respect du temps.",
        anchors: {
          0: "Confus, hors temps, pas de narration",
          1: "Structure basique, livraison faible",
          2: "Compréhensible mais manque de conviction",
          3: "Clair et structuré, livraison correcte",
          4: "Narration convaincante, bonne gestion des Q&R",
          5: "Exceptionnel — clair, mémorable, assuré, excellente Q&R",
        },
      },
      de: {
        label: "Pitch-Qualität",
        desc: "Struktur, Klarheit, Storytelling, Q&A-Handling, Zeitdisziplin.",
        anchors: {
          0: "Verwirrend, Zeit überschritten, keine Erzählung",
          1: "Grundstruktur, schwache Präsentation",
          2: "Verständlich, aber ohne Überzeugung",
          3: "Klar und strukturiert, solide Präsentation",
          4: "Überzeugende Erzählung, gute Q&A",
          5: "Herausragend — klar, einprägsam, selbstbewusst, exzellente Q&A",
        },
      },
    },
  },
  {
    id: "score_societal_impact",
    label: "Societal & Environmental Impact",
    weight: 0.1,
    desc: "Positive externalities beyond financial performance — social value, environmental contribution, alignment with Rotary values (service, ethics, community).",
    anchors: {
      0: "No identifiable positive impact",
      1: "Indirect or incidental impact",
      2: "Limited positive contribution",
      3: "Real impact, not yet measured",
      4: "Clear measurable impact with tracking",
      5: "Transformative, measurable, scalable positive impact aligned with Rotary values",
    },
    i18n: {
      fr: {
        label: "Impact sociétal & environnemental",
        desc: "Externalités positives au-delà de la performance financière — valeur sociale, contribution environnementale, alignement avec les valeurs Rotary (service, éthique, communauté).",
        anchors: {
          0: "Aucun impact positif identifiable",
          1: "Impact indirect ou incident",
          2: "Contribution positive limitée",
          3: "Impact réel, pas encore mesuré",
          4: "Impact mesurable clair avec suivi",
          5: "Impact positif transformateur, mesurable, scalable, aligné sur les valeurs Rotary",
        },
      },
      de: {
        label: "Gesellschaftliche & ökologische Wirkung",
        desc: "Positive externe Effekte jenseits der finanziellen Leistung — gesellschaftlicher Mehrwert, ökologischer Beitrag, Ausrichtung an Rotary-Werten (Dienst, Ethik, Gemeinschaft).",
        anchors: {
          0: "Keine erkennbare positive Wirkung",
          1: "Indirekte oder zufällige Wirkung",
          2: "Begrenzter positiver Beitrag",
          3: "Reale Wirkung, noch nicht gemessen",
          4: "Klare, messbare Wirkung mit Tracking",
          5: "Transformative, messbare, skalierbare positive Wirkung im Einklang mit Rotary-Werten",
        },
      },
    },
  },
];

// Return a criterion with label/desc/anchors swapped for the given language.
// Falls back to the root (English) values if the translation is missing.
export function getCriterion(c, lang = "en") {
  if (!c) return c;
  if (lang === "en") return c;
  const t = c.i18n?.[lang];
  if (!t) return c;
  return { ...c, label: t.label ?? c.label, desc: t.desc ?? c.desc, anchors: t.anchors ?? c.anchors };
}

export const SCORE_FIELDS = CRITERIA.map((c) => c.id);
export const MAX_WEIGHTED = CRITERIA.reduce((sum, c) => sum + 5 * c.weight, 0); // 5.0

export function weightedScore(scoreRow) {
  if (!scoreRow) return null;
  let sum = 0;
  for (const c of CRITERIA) {
    const v = scoreRow[c.id];
    if (v == null) return null; // incomplete
    sum += v * c.weight;
  }
  return sum; // 0..5
}

export function criteriaFilledCount(scoreRow) {
  if (!scoreRow) return 0;
  return CRITERIA.filter((c) => scoreRow[c.id] != null).length;
}

export const JURY_STATUS = {
  DRAFT: "draft",
  LIVE: "live",
  LOCKED: "locked",
  PUBLISHED: "published",
};
