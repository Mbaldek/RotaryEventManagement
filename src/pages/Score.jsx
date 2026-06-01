// Score — page de scoring JURÉ publique, SANS COMPTE (name-pick + slug + PIN).
//
// Phase scoring sans compte (cf. docs/blueprints/jury-no-account-scoring.md).
// Flux : /Score?s=<slug> → écran PIN → choisir son nom (jurés approuvés de la
// session) → noter chaque startup (ordre de passage) avec le ScoringPanel Élysée.
//
// Sécurité : aucune table touchée en direct. TOUT passe par 4 RPC anon gardées
// slug+PIN (revalidés côté serveur à chaque appel) :
//   - rsa_public_score_context(slug, pin)         → meta + statut + poids + roster + startups
//   - rsa_public_my_scores(slug, pin, jury_name)  → reprise (scores soumis + brouillons)
//   - rsa_public_save_draft(slug, pin, …)         → autosave (status='live')
//   - rsa_public_submit_score(slug, pin, …)       → soumission finale (status='live')
//
// Identité = le NOM choisi (jury_name), pas un compte. Scores name-keyed dans
// jury_scores / jury_score_drafts. Poids des critères = paramètre de session.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Lock, AlertTriangle, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';
import RotaryWheel from '@/components/design/RotaryWheel';
import { NAVY, INK, GOLD, CREAM2, MUTED, SERIF, TINT_SAGE, GREEN_TODAY } from '@/components/design/tokens';
import { supabase } from '@/lib/supabase';
import { useLang, LANGS } from '@/lib/platform/i18n';
import {
  CRITERIA,
  SCORE_FIELDS,
  MAX_WEIGHTED,
  getCriterion,
  resolveSessionWeights,
} from '@/lib/rsa/constants';
import ScoringPanel from '@/components/rsa/jury/ScoringPanel';

// Clés de persistance (slug-scopées) — confiance assumée, contexte Rotary.
const LS_IDENTITY = (slug) => `rsa_score_identity::${slug}`;
const SS_PIN = (slug) => `rsa_score_pin::${slug}`;

const T = {
  title: { fr: 'Rotary Startup Award', en: 'Rotary Startup Award', de: 'Rotary Startup Award' },
  pinTitle: { fr: 'Code d’accès', en: 'Access code', de: 'Zugangscode' },
  pinHint: {
    fr: 'Entrez le code communiqué par l’organisateur.',
    en: 'Enter the code provided by the organizer.',
    de: 'Geben Sie den vom Veranstalter mitgeteilten Code ein.',
  },
  pinBtn: { fr: 'Valider', en: 'Continue', de: 'Weiter' },
  pinError: {
    fr: 'Lien ou code incorrect.',
    en: 'Invalid link or code.',
    de: 'Link oder Code ungültig.',
  },
  unknownTitle: { fr: 'Lien invalide', en: 'Invalid link', de: 'Ungültiger Link' },
  unknownBody: {
    fr: 'Ce lien ne correspond à aucune session. Vérifiez le lien communiqué par l’organisateur.',
    en: 'This link does not match any session. Check the link provided by the organizer.',
    de: 'Dieser Link entspricht keiner Session. Prüfen Sie den Link des Veranstalters.',
  },
  whoTitle: { fr: 'Qui êtes-vous ?', en: 'Who are you?', de: 'Wer sind Sie?' },
  noJurors: {
    fr: 'Aucun juré approuvé pour cette session. Contactez l’organisateur.',
    en: 'No approved jurors for this session yet. Please contact the organizer.',
    de: 'Noch keine bestätigten Juroren für diese Session. Bitte den Veranstalter kontaktieren.',
  },
  scoringAs: { fr: 'Vous notez', en: 'Scoring as', de: 'Bewertung als' },
  notYou: { fr: 'Pas vous ? Changer', en: 'Not you? Switch', de: 'Nicht Sie? Wechseln' },
  progress: { fr: 'Progression', en: 'Progress', de: 'Fortschritt' },
  autosaved: {
    fr: 'Enregistrement auto — reprenez sur n’importe quel appareil.',
    en: 'Auto-saved — resume on any device.',
    de: 'Automatisch gespeichert — auf jedem Gerät fortsetzen.',
  },
  rulesTitle: { fr: 'Règles de notation', en: 'Scoring rules', de: 'Bewertungsregeln' },
  rulesIntro: {
    fr: 'Notez chaque startup sur 6 critères, de 0 à 5. Le poids de chaque critère est indiqué.',
    en: 'Score each startup on 6 criteria, 0 to 5. Each criterion’s weight is shown.',
    de: 'Bewerten Sie jedes Startup in 6 Kriterien, 0 bis 5. Das Gewicht jedes Kriteriums ist angegeben.',
  },
  rulesShow: { fr: 'Voir les critères', en: 'Show criteria', de: 'Kriterien anzeigen' },
  rulesHide: { fr: 'Masquer les critères', en: 'Hide criteria', de: 'Kriterien ausblenden' },
  bDraftT: { fr: 'Session pas encore ouverte', en: 'Session not open yet', de: 'Session noch nicht geöffnet' },
  bDraftB: {
    fr: 'Le scoring s’ouvrira au début de la session. Revenez sur ce lien à tout moment.',
    en: 'Scoring opens at the start of the session. Return to this link anytime.',
    de: 'Die Bewertung öffnet zu Sessionbeginn. Kehren Sie jederzeit zu diesem Link zurück.',
  },
  bLockedT: { fr: 'Scoring fermé', en: 'Scoring closed', de: 'Bewertung geschlossen' },
  bLockedB: {
    fr: 'La session est verrouillée. Vos notes soumises sont enregistrées.',
    en: 'The session is locked. Your submitted scores are saved.',
    de: 'Die Session ist gesperrt. Ihre eingereichten Bewertungen sind gespeichert.',
  },
  bPublishedT: { fr: 'Résultats publiés', en: 'Results published', de: 'Ergebnisse veröffentlicht' },
  bPublishedB: {
    fr: 'Merci d’avoir noté cette session. Le classement final a été publié.',
    en: 'Thank you for scoring this session. The final ranking has been published.',
    de: 'Danke für Ihre Bewertung. Das Endergebnis wurde veröffentlicht.',
  },
  statusDraft: { fr: 'Pas encore ouverte', en: 'Not open', de: 'Nicht geöffnet' },
  statusLive: { fr: '● En direct', en: '● Live', de: '● Live' },
  statusLocked: { fr: 'Verrouillée', en: 'Locked', de: 'Gesperrt' },
  statusPublished: { fr: 'Publiée', en: 'Published', de: 'Veröffentlicht' },
  submittedToast: { fr: 'Notes envoyées', en: 'Scores submitted', de: 'Bewertungen eingereicht' },
  submitErr: { fr: 'Échec de l’envoi — réessayez.', en: 'Submit failed — please retry.', de: 'Einreichen fehlgeschlagen — bitte erneut.' },
};

const DRAFT_SHAPE = [...SCORE_FIELDS, 'comment'];
function pickShape(row) {
  const out = {};
  if (!row) return out;
  for (const k of DRAFT_SHAPE) if (row[k] != null) out[k] = row[k];
  return out;
}

export default function Score() {
  const [params] = useSearchParams();
  const slug = params.get('s') || '';
  const { lang, setLang, t } = useLang();

  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [ctx, setCtx] = useState(null);          // { session, status, weights, jurors, startups }
  const [phase, setPhase] = useState('pin');      // 'pin' | 'pick' | 'score'
  const [authError, setAuthError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [slugInvalid, setSlugInvalid] = useState(false);

  const [juryName, setJuryName] = useState('');
  const [scores, setScores] = useState({});       // { [startup_name]: jury_scores row }
  const [drafts, setDrafts] = useState({});        // { [startup_name]: { score_*, comment } }
  const [expanded, setExpanded] = useState(null);
  const [savingName, setSavingName] = useState(null);
  const [submittingName, setSubmittingName] = useState(null);

  const weights = useMemo(() => resolveSessionWeights(ctx?.weights), [ctx?.weights]);
  const status = ctx?.status || 'draft';
  const scoringOpen = status === 'live';

  // ── Vérification slug+PIN → contexte ──────────────────────────────────────
  const verify = useCallback(async (candidatePin) => {
    if (!slug) { setSlugInvalid(true); return; }
    setVerifying(true);
    setAuthError(false);
    try {
      const { data, error } = await supabase.rpc('rsa_public_score_context', {
        p_slug: slug,
        p_pin: candidatePin,
      });
      if (error) throw error;
      setCtx(data);
      setPin(candidatePin);
      try { sessionStorage.setItem(SS_PIN(slug), candidatePin); } catch { /* ignore */ }
      // Restaure l'identité mémorisée pour ce slug
      let restored = '';
      try {
        const saved = localStorage.getItem(LS_IDENTITY(slug));
        if (saved && (data.jurors || []).some((j) => j.full_name === saved)) restored = saved;
      } catch { /* ignore */ }
      setJuryName(restored);
      setPhase(restored ? 'score' : 'pick');
    } catch {
      setAuthError(true);
    } finally {
      setVerifying(false);
    }
  }, [slug]);

  // Auto-tentative avec un PIN mémorisé (reprise sans re-saisie pendant la session).
  useEffect(() => {
    if (!slug) { setSlugInvalid(true); return; }
    let cancelled = false;
    try {
      const savedPin = sessionStorage.getItem(SS_PIN(slug));
      if (savedPin && !cancelled) { verify(savedPin); }
    } catch { /* ignore */ }
    return () => { cancelled = true; };
  }, [slug, verify]);

  // ── Charge scores + brouillons du juré sélectionné ────────────────────────
  useEffect(() => {
    if (!juryName || !ctx || !pin) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('rsa_public_my_scores', {
          p_slug: slug, p_pin: pin, p_jury_name: juryName,
        });
        if (error) throw error;
        if (cancelled) return;
        const byScore = {};
        for (const r of data?.scores || []) byScore[r.startup_name] = r;
        const byDraft = {};
        for (const d of data?.drafts || []) byDraft[d.startup_name] = pickShape(d);
        setScores(byScore);
        setDrafts(byDraft);
      } catch {
        if (!cancelled) { setScores({}); setDrafts({}); }
      }
    })();
    return () => { cancelled = true; };
  }, [juryName, ctx, pin, slug]);

  function pickJuror(name) {
    setJuryName(name);
    setPhase('score');
    try { localStorage.setItem(LS_IDENTITY(slug), name); } catch { /* ignore */ }
  }

  function switchJuror() {
    setJuryName('');
    setScores({});
    setDrafts({});
    setExpanded(null);
    setPhase('pick');
    try { localStorage.removeItem(LS_IDENTITY(slug)); } catch { /* ignore */ }
  }

  // ── Autosave (le ScoringPanel débounce déjà ~600 ms) ──────────────────────
  const saveDraft = useCallback(async (startupName, patch) => {
    setDrafts((prev) => {
      const merged = { ...(prev[startupName] || {}), ...patch };
      const full = SCORE_FIELDS.reduce((acc, f) => { acc[f] = merged[f] ?? null; return acc; }, {});
      setSavingName(startupName);
      supabase.rpc('rsa_public_save_draft', {
        p_slug: slug, p_pin: pin, p_jury_name: juryName, p_startup_name: startupName,
        p_scores: full, p_comment: merged.comment ?? null,
      }).then(
        () => setSavingName((n) => (n === startupName ? null : n)),
        () => setSavingName((n) => (n === startupName ? null : n)),
      );
      return { ...prev, [startupName]: merged };
    });
  }, [slug, pin, juryName]);

  const submitScore = useCallback(async (startupName, { scores: s, comment }) => {
    setSubmittingName(startupName);
    try {
      const { error } = await supabase.rpc('rsa_public_submit_score', {
        p_slug: slug, p_pin: pin, p_jury_name: juryName, p_startup_name: startupName,
        p_scores: s, p_comment: comment ?? null,
      });
      if (error) throw error;
      setScores((prev) => ({ ...prev, [startupName]: { startup_name: startupName, ...s, comment: comment ?? null } }));
      setDrafts((prev) => { const next = { ...prev }; delete next[startupName]; return next; });
      toast.success(t(T.submittedToast));
      // Avance vers la prochaine startup non soumise
      const list = ctx?.startups || [];
      const idx = list.findIndex((x) => x.name === startupName);
      const nextItem = list.find((x, i) => i > idx && !scores[x.name]);
      setExpanded(nextItem ? nextItem.name : null);
    } catch {
      toast.error(t(T.submitErr));
    } finally {
      setSubmittingName(null);
    }
  }, [slug, pin, juryName, ctx, scores, t]);

  // ── Rendu : slug invalide ─────────────────────────────────────────────────
  if (slugInvalid || !slug) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center pt-24 px-6">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <h1 className="text-[20px] mb-2" style={{ color: NAVY, fontFamily: SERIF }}>{t(T.unknownTitle)}</h1>
          <p className="text-[14px]" style={{ color: INK }}>{t(T.unknownBody)}</p>
        </div>
      </Shell>
    );
  }

  // ── Rendu : écran PIN ─────────────────────────────────────────────────────
  if (phase === 'pin') {
    return (
      <Shell>
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <RotaryWheel size={48} decorative />
          <h1 className="text-[15px] uppercase tracking-[0.18em] mt-4 mb-1" style={{ color: MUTED }}>{t(T.title)}</h1>
          <h2 className="text-[22px] mb-1" style={{ color: NAVY, fontFamily: SERIF }}>{t(T.pinTitle)}</h2>
          <p className="text-[13px] mb-5 text-center max-w-xs" style={{ color: INK }}>{t(T.pinHint)}</p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (pinInput.trim()) verify(pinInput.trim()); }}
            className="w-full max-w-[220px] flex flex-col items-center gap-3"
          >
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setAuthError(false); }}
              maxLength={6}
              autoFocus
              aria-label={t(T.pinTitle)}
              className="w-full text-center text-[28px] tracking-[0.5em] tabular-nums rounded-[4px] px-3 py-3 outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#c9a84c]"
              style={{ background: 'white', color: NAVY, border: `1px solid ${authError ? '#a23b2d' : CREAM2}` }}
            />
            {authError && <p className="text-[12px]" style={{ color: '#a23b2d' }}>{t(T.pinError)}</p>}
            <button
              type="submit"
              disabled={verifying || !pinInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-2.5 rounded-[4px] disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {t(T.pinBtn)} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-6"><LangSwitcher lang={lang} setLang={setLang} /></div>
        </div>
      </Shell>
    );
  }

  // ── Rendu : name-pick / scoring ───────────────────────────────────────────
  const session = ctx?.session || {};
  const jurors = ctx?.jurors || [];
  const startups = ctx?.startups || [];
  const submittedCount = Object.keys(scores).length;

  return (
    <Shell>
      <header className="px-4 py-5" style={{ background: '#fbf9f5', borderBottom: `1px solid ${CREAM2}` }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <RotaryWheel size={34} decorative />
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] truncate" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>
              {session.name || t(T.title)}
            </h1>
            <p className="text-[12px]" style={{ color: MUTED }}>
              {session.session_date || ''}{session.session_date ? ' · ' : ''}{t(T.title)}
            </p>
          </div>
          <StatusBadge status={status} t={t} />
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <RulesBlock weights={weights} lang={lang} t={t} />

        {status === 'draft' && <Banner tone="info" title={t(T.bDraftT)} body={t(T.bDraftB)} />}
        {status === 'locked' && <Banner tone="warn" title={t(T.bLockedT)} body={t(T.bLockedB)} />}
        {status === 'published' && <Banner tone="success" title={t(T.bPublishedT)} body={t(T.bPublishedB)} />}

        {phase === 'pick' && (
          <section className="space-y-3">
            <h2 className="text-[12px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{t(T.whoTitle)}</h2>
            {jurors.length === 0 ? (
              <div className="rounded-[4px] p-4 text-[13px]" style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}>
                {t(T.noJurors)}
              </div>
            ) : (
              <div className="grid gap-2">
                {jurors.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => pickJuror(j.full_name)}
                    className="flex items-center gap-3 p-3 rounded-[4px] text-left transition-colors hover:border-[#c9a84c]"
                    style={{ background: 'white', border: `1px solid ${CREAM2}` }}
                  >
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                      style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}>
                      {initials(j.full_name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] truncate" style={{ color: NAVY, fontWeight: 500 }}>{j.full_name}</span>
                      {(j.qualite || j.organisation) && (
                        <span className="block text-[12px] truncate" style={{ color: MUTED }}>
                          {[j.qualite, j.organisation].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {phase === 'score' && (
          <section className="space-y-3">
            <div className="rounded-[4px] p-3 sm:p-4" style={{ background: '#fdf6e8', border: `1px solid ${GOLD}` }}>
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                  style={{ background: NAVY, color: 'white' }}>{initials(juryName)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{t(T.scoringAs)}</div>
                  <div className="text-[16px] truncate" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>{juryName}</div>
                </div>
                <button onClick={switchJuror}
                  className="flex-shrink-0 text-[12px] px-3 py-2 rounded-[4px]"
                  style={{ background: 'white', border: `1px solid ${GOLD}`, color: NAVY }}>
                  {t(T.notYou)}
                </button>
              </div>
              <div className="mt-3 pt-3 flex items-center justify-between gap-3 text-[12px]" style={{ borderTop: `1px solid ${CREAM2}` }}>
                <span style={{ color: INK }}>
                  {t(T.progress)} : <strong className="tabular-nums" style={{ color: NAVY }}>{submittedCount}/{startups.length}</strong>
                </span>
                <span className="text-right truncate" style={{ color: MUTED }}>{t(T.autosaved)}</span>
              </div>
            </div>

            {startups.length === 0 ? (
              <div className="rounded-[4px] p-4 text-[13px]" style={{ background: 'white', border: `1px solid ${CREAM2}`, color: MUTED }}>
                —
              </div>
            ) : (
              <div className="space-y-2">
                {startups.map((s, i) => (
                  <ScoringPanel
                    key={s.id}
                    startup={s}
                    index={i}
                    expanded={expanded === s.name}
                    onToggle={() => setExpanded((prev) => (prev === s.name ? null : s.name))}
                    draft={drafts[s.name] || null}
                    myScore={scores[s.name] || null}
                    onSaveDraft={({ patch }) => saveDraft(s.name, patch)}
                    onSubmit={(payload) => submitScore(s.name, payload)}
                    savingDraft={savingName === s.name}
                    submitting={submittingName === s.name}
                    readOnly={!scoringOpen}
                    weights={weights}
                    hideDocuments
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </Shell>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: '#fafaf8' }}>
      <style>{`body{background:#fafaf8}`}</style>
      {children}
    </div>
  );
}

function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function LangSwitcher({ lang, setLang }) {
  return (
    <div className="inline-flex rounded-full p-0.5 text-[11px]" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className="px-2.5 py-0.5 rounded-full uppercase tracking-[0.08em] font-medium transition-colors"
          style={lang === l ? { background: NAVY, color: 'white' } : { color: MUTED, background: 'transparent' }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    draft: { label: t(T.statusDraft), bg: '#efece4', color: MUTED },
    live: { label: t(T.statusLive), bg: TINT_SAGE, color: GREEN_TODAY },
    locked: { label: t(T.statusLocked), bg: '#fdf6e8', color: NAVY },
    published: { label: t(T.statusPublished), bg: '#fdf6e8', color: GOLD },
  };
  const m = map[status] || map.draft;
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.1em] px-2 py-1 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function Banner({ tone, title, body }) {
  const accent = tone === 'warn' ? '#a23b2d' : tone === 'success' ? GREEN_TODAY : NAVY;
  const Icon = tone === 'warn' ? Lock : AlertTriangle;
  return (
    <div className="rounded-[4px] p-3 flex gap-3" style={{ background: 'white', border: `1px solid ${CREAM2}`, borderLeft: `2px solid ${accent}` }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: NAVY }}>{title}</div>
        <div className="text-[12px] mt-0.5" style={{ color: INK }}>{body}</div>
      </div>
    </div>
  );
}

// Bloc « Règles de notation » — l'explicatif des 6 critères (format apprécié de
// l'ancienne page), avec le POIDS DE LA SESSION et les ancrages 0/3/5.
function RulesBlock({ weights, lang, t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[4px]" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px]" style={{ color: NAVY, fontWeight: 500 }}>{t(T.rulesTitle)}</div>
          <div className="text-[12px] mt-0.5" style={{ color: MUTED }}>{open ? t(T.rulesHide) : t(T.rulesShow)}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: MUTED }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <p className="text-[12.5px] pt-3" style={{ color: INK }}>{t(T.rulesIntro)}</p>
          <ol className="space-y-3">
            {CRITERIA.map((raw, i) => {
              const c = getCriterion(raw, lang);
              const pct = Math.round((weights?.[raw.id] ?? raw.weight) * 100);
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px]" style={{ color: NAVY, fontWeight: 500 }}>{i + 1}. {c.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ color: NAVY, background: '#fdf6e8', border: `1px solid ${GOLD}` }}>{pct}%</span>
                  </div>
                  <p className="text-[12px] mt-0.5 leading-snug" style={{ color: INK }}>{c.desc}</p>
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    {[0, 3, 5].map((n) => (
                      <React.Fragment key={n}>
                        <span className="text-[11px] font-semibold" style={{ color: MUTED }}>{n}</span>
                        <span className="text-[11px]" style={{ color: INK }}>{c.anchors?.[n] ?? ''}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] pt-2" style={{ color: MUTED, borderTop: `1px solid ${CREAM2}` }}>
            Max {MAX_WEIGHTED.toFixed(0)} / 5
          </p>
        </div>
      )}
    </div>
  );
}
