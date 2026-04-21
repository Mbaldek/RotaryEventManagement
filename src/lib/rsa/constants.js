// Rotary Startup Award 2026 — shared constants
// Session IDs are the canonical identifier in session_config / startup_confirmations / jury_scores.
// jury_profiles.assigned_sessions stores the human LABEL (FR) instead of the ID — we map both ways here.

export const SESSIONS = [
  {
    id: "s1_foodtech",
    label: "FoodTech & Économie circulaire",
    labelEn: "FoodTech & Circular Economy",
    emoji: "🌾",
    date: "Jeudi 30 avril · 18h",
    color: "#5a7a1a",
    light: "#eef5e0",
    border: "#c0d890",
  },
  {
    id: "s2_social",
    label: "Impact social & Edtech",
    labelEn: "Social Impact & Edtech",
    emoji: "🤝",
    date: "Mercredi 6 mai · 18h",
    color: "#8a2040",
    light: "#fbe8ee",
    border: "#e8a8bc",
  },
  {
    id: "s3_tech",
    label: "Tech, AI, Fintech & Mobilité",
    labelEn: "Tech, AI, Fintech & Mobility",
    emoji: "💻",
    date: "Mercredi 13 mai · 18h",
    color: "#4a2a7a",
    light: "#f0eaf8",
    border: "#c8b0e8",
  },
  {
    id: "s4_health",
    label: "Healthtech & Biotech",
    labelEn: "Healthtech & Biotech",
    emoji: "🏥",
    date: "Mardi 19 mai · 18h",
    color: "#1a5fa8",
    light: "#e8f0fb",
    border: "#a8c8f0",
  },
  {
    id: "s5_greentech",
    label: "Greentech & Environnement",
    labelEn: "Greentech & Environment",
    emoji: "🌱",
    date: "Jeudi 21 mai · 18h",
    color: "#1d6b4f",
    light: "#e8f5ee",
    border: "#b0d8c4",
  },
];

export const SESSION_BY_ID = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));
export const SESSION_BY_LABEL = Object.fromEntries(SESSIONS.map((s) => [s.label, s]));

// Scoring criteria — weights per pre-migration RsaScore.jsx (commit b4c3fec).
// Weighted max = 5 (0.2*5*4 + 0.1*5*2 = 4 + 1 = 5).
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
  },
];

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
