// /Resultats — Palmarès public anonyme (V3 Vague 2 — feature C).
//
// Route publique (anon) qui affiche le palmarès d'une édition du Rotary Startup
// Award. Une seule requête à la vue `public.public_palmares` (cf.
// supabase/migrations/20260601_rsa_v3_public_palmares.sql et
// docs/hardening/m4c-public-results-rls.md).
//
// - Aucune PII (pas d'email, pas de contact) — la vue projette uniquement les
//   colonnes safe et embarque le snapshot `final_ranking` jsonb.
// - Photo champion OPT-IN (décision C.2) : affichée uniquement si la startup
//   classée #1 a coché `champion_photo_optin = true` dans /MonDossier.
// - i18n FR / EN / DE via useLang + dico local `T` (cf. ./results-public/i18n.js).
// - SEO : <title>, <meta description>, og:title/description/image — injectés
//   via document.head côté client (pas de react-helmet-async dans le projet,
//   suffisant pour une SPA — le crawler Google JS exécute la page).
// - Sitemap.xml : entrée /Resultats ajoutée en public/sitemap.xml.
// - Design : tokens Élysée (NAVY/GOLD/CREAM), Playfair pour titres, framer-motion
//   pour les entrées (cohérent Wave 5 polish).

import React, { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Trophy, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import {
  PageShell,
  TopNav,
  Footer,
  Eyebrow,
  Skeleton,
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  FOCUS_RING_CLASS,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';

// Hero variant : H-Reveal-Curtain (catalog §16.1) — voile CREAM se lève en
// 600ms révélant le year giant tabular + Eyebrow + serif title.
// Signature micro : M-Editorial-Veil. Cf. design-upgrade-blueprint §4.14.
// Le voile n'apparaît QUE sur l'état "palmarès publié" (pas loading/error/no-results).
import { useLang } from '@/lib/platform/i18n';
import {
  useResults,
  useNextEditionHint,
  useOpenEditionLink,
} from '@/components/rsa/results-public/useResults';
import { T as RES_T, formatDate, formatPrize } from '@/components/rsa/results-public/i18n';
import { championPhotoPublicUrl } from '@/lib/rsa/storage';
import StatsRail from '@/components/rsa/results-public/StatsRail';
import RetrospectiveTimeline from '@/components/rsa/results-public/RetrospectiveTimeline';
import {
  getSessionPalette,
  getSessionEmoji,
} from '@/components/rsa/concours-dashboard/sessionTheme';

// Resolve a public_palmares view row into the session shape sessionTheme expects
// (id / kind / name / theme / config). The view doesn't expose theme_color, so
// fallback to the deterministic hash palette via session_id + index in club.
function viewRowToSession(row, isFinale = false) {
  return {
    id: row.session_id,
    kind: isFinale ? 'finale' : (row.session_kind || 'qualifying'),
    name: row.session_name,
    theme: row.session_theme,
    config: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO meta — injection directe dans <head>, sans dépendance externe.
// ─────────────────────────────────────────────────────────────────────────────
function useDocumentSeo({ title, description, ogImage, canonical }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const prevTitle = document.title;
    if (title) document.title = title;

    const upsertMeta = (selector, attrs) => {
      let el = document.head.querySelector(selector);
      const created = !el;
      if (created) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return { el, created };
    };

    const created = [];
    if (description) {
      const { created: c } = upsertMeta('meta[name="description"]', { name: 'description', content: description });
      if (c) created.push('meta[name="description"]');
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    }
    if (title) {
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
      upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    }
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    if (ogImage) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    }
    if (canonical) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, ogImage, canonical]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers présentation
// ─────────────────────────────────────────────────────────────────────────────
const RANK_LABEL = {
  1: { fr: 'Or', en: 'Gold', de: 'Gold' },
  2: { fr: 'Argent', en: 'Silver', de: 'Silber' },
  3: { fr: 'Bronze', en: 'Bronze', de: 'Bronze' },
};

// Libellés locaux à cette page (le dico canonique results-public/i18n.js est hors
// périmètre de ce correctif — on évite l'inline t({fr,en,de}) en les regroupant ici).
const T = {
  noRanking: { fr: 'Aucun classement.', en: 'No ranking.', de: 'Keine Rangliste.' },
  editionLabel: { fr: 'Édition', en: 'Edition', de: 'Ausgabe' },
};

function PodiumDot({ rank }) {
  // Or, argent, bronze — pastilles sobres, alignées à la palette Élysée.
  const palette = {
    1: { bg: 'linear-gradient(135deg,#e4c66e,#b48a30)', color: NAVY },
    2: { bg: 'linear-gradient(135deg,#cfd1d6,#9097a1)', color: NAVY },
    3: { bg: 'linear-gradient(135deg,#d6a878,#a8703d)', color: '#fff' },
  };
  const p = palette[rank] || { bg: CREAM2, color: NAVY };
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0"
      style={{ background: p.bg, color: p.color, fontFamily: SERIF }}
    >
      {rank}
    </span>
  );
}

function ChampionPortrait({ path, name }) {
  // Cercle médaillon. Si pas de photo opt-in, fallback initiale typo.
  const url = path ? championPhotoPublicUrl(path) : null;
  const initial = (name || '').trim().charAt(0).toUpperCase() || '·';
  return (
    <div
      className="relative w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-full shrink-0"
      style={{
        background: url ? `url(${url}) center/cover no-repeat` : 'linear-gradient(135deg,#fdf6e8,#e4c66e)',
        border: `2px solid ${GOLD}`,
        boxShadow: '0 4px 18px rgba(15,31,61,0.12)',
      }}
      aria-hidden={!!url}
      role={url ? 'img' : undefined}
      aria-label={url ? name : undefined}
    >
      {!url && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[44px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {initial}
        </span>
      )}
      <span
        aria-hidden
        className="absolute -bottom-2 -right-2 inline-flex items-center justify-center w-9 h-9 rounded-full"
        style={{ background: GOLD, color: NAVY, boxShadow: '0 2px 6px rgba(15,31,61,0.2)' }}
      >
        <Trophy className="w-4 h-4" />
      </span>
    </div>
  );
}

// Une ligne podium pour une session.
function PodiumRow({ entry, lang }) {
  const t = (d) => d[lang] || d.fr;
  const rank = entry.final_rank;
  const rankLabel = RANK_LABEL[rank] ? t(RANK_LABEL[rank]) : `#${rank}`;
  return (
    <li
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      <PodiumDot rank={rank} />
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] leading-tight truncate"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          title={entry.name}
        >
          {entry.name || '—'}
        </p>
        <p className="text-[11px] mt-0.5 uppercase tracking-[0.12em]" style={{ color: MUTED }}>
          {rankLabel}
        </p>
      </div>
      {entry.avg != null && (
        <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>
          {Number(entry.avg).toFixed(2)} / 5
        </span>
      )}
    </li>
  );
}

function SessionCard({ session, lang, t, index }) {
  const ranking = Array.isArray(session.final_ranking) ? session.final_ranking : [];
  const top3 = ranking.filter((r) => r.final_rank <= 3).sort((a, b) => a.final_rank - b.final_rank);
  const date = formatDate(session.session_date, lang);
  // V3 visual sweep — palette + emoji par session (hash session_id + index club).
  const themed = viewRowToSession(session, false);
  const palette = getSessionPalette(themed, index || 0);
  const emoji = getSessionEmoji(themed);
  const tT = t(RES_T);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative rounded-[4px] p-5 pl-6 md:p-6 md:pl-7 overflow-hidden"
      style={{ background: '#fff', border: `1px solid ${CREAM2}` }}
    >
      {/* Color rail left — palette de la session */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 4, background: palette.primary }}
      />

      <header className="mb-3">
        <p
          className="text-[10.5px] uppercase tracking-[0.18em] font-semibold flex items-center gap-1.5"
          style={{ color: palette.primary }}
        >
          {emoji && <span aria-hidden style={{ fontSize: 12 }}>{emoji}</span>}
          {session.session_theme || tT.sessionLabel(session.session_position ?? '?')}
        </p>
        <h3
          className="text-[20px] md:text-[22px] leading-tight mt-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {session.session_name}
        </h3>
        {date && (
          <p className="text-[12.5px] mt-1.5" style={{ color: MUTED }}>
            {date}
          </p>
        )}
      </header>
      {top3.length > 0 ? (
        <ul role="list" className="mt-2">
          {top3.map((e) => (
            <PodiumRow key={`${session.session_id}_${e.final_rank}`} entry={e} lang={lang} />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] italic" style={{ color: MUTED }}>
          {t(T.noRanking)}
        </p>
      )}
    </motion.article>
  );
}

// V3 visual sweep — chip "Issu de X" colorée par la palette session source.
// Affichée sous le nom d'un finaliste du podium / lauréat pour reconstituer
// la provenance thématique. sourceSession est une row palmares (qualifying)
// retrouvée par matching name → final_ranking[rank=1].name.
function SourceSessionChip({ sourceSession, indexInClub, lang, t }) {
  if (!sourceSession) return null;
  const themed = viewRowToSession(sourceSession, false);
  const palette = getSessionPalette(themed, indexInClub || 0);
  const emoji = getSessionEmoji(themed);
  const label = sourceSession.session_theme || sourceSession.session_name || '—';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full mt-1.5"
      style={{
        background: palette.light,
        color: palette.primary,
        border: `1px solid ${palette.border}`,
      }}
      title={label}
    >
      {emoji && <span aria-hidden style={{ fontSize: 11 }}>{emoji}</span>}
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Resultats() {
  const { lang, t } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const editionParam = searchParams.get('edition') || null;
  const reduce = useReducedMotion();

  const { palmares, isLoading, isError, refetch, availableEditions } = useResults(editionParam);
  const nextHintQ = useNextEditionHint();
  const openEditionQ = useOpenEditionLink();

  const tT = t(RES_T);
  const year = palmares?.edition?.year ?? nextHintQ.data?.year ?? null;
  const finaleDate = formatDate(palmares?.edition?.finale_date, lang);
  const grandPrize = formatPrize(palmares?.edition?.prize_main, lang);
  const specialPrize = formatPrize(palmares?.edition?.prize_special, lang);

  const seoTitle = useMemo(() => {
    if (palmares?.edition?.year) {
      return `${tT.eyebrow(palmares.edition.year)} — ${tT.titleLead}`;
    }
    return tT.htmlTitle;
  }, [palmares?.edition?.year, tT]);

  const seoDescription = useMemo(() => {
    if (palmares?.laureat) {
      return `${tT.titleLead} ${palmares?.edition?.year} — ${tT.grandLaureat}: ${palmares.laureat.name}.`;
    }
    return tT.subtitleLead;
  }, [palmares, tT]);

  const ogImage = palmares?.championPhotoPath
    ? championPhotoPublicUrl(palmares.championPhotoPath)
    : (typeof window !== 'undefined' ? `${window.location.origin}/favicon.svg` : null);

  const canonical = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const base = `${window.location.origin}/Resultats`;
    return palmares?.edition?.id ? `${base}?edition=${encodeURIComponent(palmares.edition.id)}` : base;
  }, [palmares?.edition?.id]);

  useDocumentSeo({
    title: seoTitle,
    description: seoDescription,
    ogImage,
    canonical,
  });

  const onYearChange = (e) => {
    const value = e.target.value;
    if (!value) {
      setSearchParams({});
    } else {
      setSearchParams({ edition: value });
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell width="wide" nav={<TopNav wordmark={tT.titleLead} subtitle={tT.eyebrow(year || '')} />}>
        <div className="flex items-center gap-3 mb-8" role="status" aria-live="polite">
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: GOLD }}
            aria-label={tT.loadingTitle}
          />
          <p className="text-[14px]" style={{ color: INK }}>{tT.loadingTitle}</p>
        </div>
        <div className="space-y-4">
          <Skeleton height={48} width="50%" />
          <Skeleton height={24} width="33%" />
          <Skeleton height={160} />
        </div>
      </PageShell>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <PageShell width="wide" nav={<TopNav wordmark={tT.titleLead} />}>
        <div className="flex items-start gap-3" role="alert">
          <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: DANGER }} aria-hidden />
          <div>
            <h1 className="text-[22px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {tT.errorTitle}
            </h1>
            <p className="text-[14px] mb-4" style={{ color: INK }}>{tT.errorBody}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className={`text-[13.5px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
              style={{ background: NAVY }}
            >
              {tT.retry}
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Pas encore public / aucune édition publiée ────────────────────────────
  if (!palmares || !palmares.hasResults) {
    const hint = nextHintQ.data;
    const hintDate = formatDate(hint?.finale_date, lang);
    return (
      <PageShell width="wide" nav={<TopNav wordmark={tT.titleLead} />}>
        <Eyebrow>{tT.eyebrow(hint?.year || new Date().getFullYear())}</Eyebrow>
        <h1 className="text-[34px] md:text-[42px] leading-tight mt-2 mb-4" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {hint ? tT.notPublicTitle : tT.noEditionTitle}
        </h1>
        <p className="text-[15px] max-w-[640px]" style={{ color: INK }}>
          {hint ? tT.notPublicBody(hintDate) : tT.noEditionBody(hint?.year)}
        </p>
        <Footer width="wide" left={tT.footerLine(new Date().getFullYear())} />
      </PageShell>
    );
  }

  // ── Palmarès publié ────────────────────────────────────────────────────────
  const ed = palmares.edition;
  const top3Finale = (palmares.finalistsFromFinale || [])
    .filter((r) => r.final_rank <= 3)
    .sort((a, b) => a.final_rank - b.final_rank);

  // V3 visual sweep — résolution finalist.name → session source (qualifying).
  // Le finaliste = vainqueur (rank=1) d'une session qualif. On cache un map
  // { startupName: { sourceSession, indexInClub } } pour que les chips
  // session-source colorées affichées dans le podium / grand lauréat soient
  // déterministes (même couleur que la session card associée).
  const finalistSourceMap = (() => {
    const m = {};
    const qual = palmares.qualifyingSessions || [];
    qual.forEach((qs, i) => {
      const ranking = Array.isArray(qs.final_ranking) ? qs.final_ranking : [];
      const winner = ranking.find((r) => Number(r.final_rank) === 1);
      const name = winner?.name || winner?.startup_name;
      if (name) m[name] = { sourceSession: qs, indexInClub: i };
    });
    return m;
  })();

  return (
    <PageShell width="wide" nav={<TopNav wordmark={tT.titleLead} subtitle={tT.eyebrow(ed.year)} />}>
      {/* Signature M-Editorial-Veil — voile CREAM se lève en 600ms au mount. */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{ background: CREAM }}
        />
      )}

      {/* Header H-Reveal-Curtain — eyebrow + giant year tabular + serif title. */}
      <motion.section
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
        className="mb-12 md:mb-16"
      >
        <div className="flex items-baseline gap-5 md:gap-7 flex-wrap">
          <span
            className="tabular-nums shrink-0"
            style={{
              fontFamily: SERIF,
              color: NAVY,
              fontSize: 'clamp(72px, 11vw, 128px)',
              lineHeight: 0.9,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            {ed.year}
          </span>
          <div className="min-w-0 flex-1">
            <Eyebrow>{tT.eyebrow(ed.year)}</Eyebrow>
            <h1
              className="text-[28px] md:text-[36px] leading-[1.05] mt-2"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {tT.titleLead}{' '}
              <em style={{ color: GOLD, fontStyle: 'italic' }}>{tT.titleItalic(ed.year)}</em>
            </h1>
          </div>
        </div>

        {finaleDate && (
          <p className="mt-5 text-[14px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            <Calendar className="inline w-4 h-4 mr-2 -mt-0.5" />
            {tT.subtitleFinale(finaleDate)}
          </p>
        )}
        <p className="mt-4 text-[16px] max-w-[640px]" style={{ color: INK, lineHeight: 1.65 }}>
          {tT.subtitleLead}
        </p>

        {/* Sélecteur d'édition (apparait si >1 édition disponible) */}
        {availableEditions && availableEditions.length > 1 && (
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <label
              htmlFor="edition-select"
              className="text-[11px] uppercase tracking-[0.15em]"
              style={{ color: MUTED }}
            >
              {t(T.editionLabel)}
            </label>
            <select
              id="edition-select"
              value={ed.id}
              onChange={onYearChange}
              className={`text-[14px] rounded-[4px] px-3 py-1.5 ${FOCUS_RING_CLASS}`}
              style={{ background: '#fff', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {availableEditions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.year})
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.section>

      {/* V3 visual sweep — Stats rail (4 KPI compacts sous le Hero). */}
      <StatsRail palmares={palmares} />

      {/* Grand Lauréat */}
      {palmares.laureat && (() => {
        const laureatSource = finalistSourceMap[palmares.laureat.name] || null;
        return (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="rounded-[10px] p-6 md:p-10 mb-14"
            style={{
              background: 'linear-gradient(135deg,#fdf6e8,#faf2dc)',
              border: `1px solid ${CREAM2}`,
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
              <ChampionPortrait path={palmares.championPhotoPath} name={palmares.championName || palmares.laureat.name} />
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] uppercase tracking-[0.18em] mb-1" style={{ color: GOLD }}>
                  {tT.grandLaureat}
                </p>
                <h2
                  className="text-[36px] md:text-[44px] leading-tight"
                  style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                >
                  {palmares.laureat.name}
                </h2>
                {laureatSource && (
                  <SourceSessionChip
                    sourceSession={laureatSource.sourceSession}
                    indexInClub={laureatSource.indexInClub}
                    lang={lang}
                    t={t}
                  />
                )}
                {grandPrize && (
                  <p className="mt-3 text-[15px]" style={{ color: INK }}>
                    <span className="uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                      {tT.grandPrize}
                    </span>{' '}
                    <span style={{ fontFamily: SERIF, color: NAVY }}>{grandPrize}</span>
                  </p>
                )}
                {palmares.laureat.avg != null && (
                  <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
                    {tT.avg}: {Number(palmares.laureat.avg).toFixed(2)} / 5
                    {palmares.laureat.n != null && ` (${tT.onN(palmares.laureat.n)} ${Number(palmares.laureat.n) > 1 ? tT.jurors : tT.juror})`}
                  </p>
                )}
              </div>
            </div>
          </motion.section>
        );
      })()}

      {/* Prix spécial (rank 2) */}
      {palmares.specialPrize && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-[4px] p-5 md:p-6 mb-14"
          style={{ background: '#fff', border: `1px solid ${CREAM2}` }}
        >
          <p className="text-[10.5px] uppercase tracking-[0.18em] mb-1" style={{ color: GOLD }}>
            {tT.specialPrize}
          </p>
          <h3
            className="text-[24px] md:text-[28px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {palmares.specialPrize.name}
          </h3>
          {specialPrize && (
            <p className="mt-2 text-[14px]" style={{ color: INK }}>
              <span style={{ fontFamily: SERIF, color: NAVY }}>{specialPrize}</span>
            </p>
          )}
        </motion.section>
      )}

      {/* V3 visual sweep — Timeline rétrospective (parcours année). */}
      <RetrospectiveTimeline palmares={palmares} />

      {/* Finalistes (top 3 finale) — podium 3 cartes en hauteurs différentes.
          Ordre visuel : 2e à gauche, 1er au centre (taller + scale-up), 3e à droite.
          V3 : chip source session colorée sous chaque finaliste. */}
      {top3Finale.length > 0 && (() => {
        const byRank = (r) => top3Finale.find((e) => e.final_rank === r) || null;
        const first = byRank(1);
        const second = byRank(2);
        const third = byRank(3);
        const PodiumCard = ({ entry, position }) => {
          if (!entry) return <div aria-hidden />;
          const t2 = (d) => d[lang] || d.fr;
          const rankLabel = RANK_LABEL[entry.final_rank] ? t2(RANK_LABEL[entry.final_rank]) : `#${entry.final_rank}`;
          const isFirst = position === 'center';
          const source = finalistSourceMap[entry.name] || null;
          return (
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.4 + (isFirst ? 0 : 0.1) }}
              className="rounded-[4px] flex flex-col items-center text-center"
              style={{
                background: 'white',
                border: `1px solid ${isFirst ? GOLD : CREAM2}`,
                padding: isFirst ? '28px 18px 24px' : '20px 14px 18px',
                minHeight: isFirst ? 220 : 180,
                transform: isFirst ? 'translateY(-12px)' : 'none',
              }}
            >
              <PodiumDot rank={entry.final_rank} />
              <p
                className="mt-3 text-[11px] uppercase tracking-[0.14em] font-medium"
                style={{ color: isFirst ? GOLD : MUTED }}
              >
                {rankLabel}
              </p>
              <h3
                className={`mt-2 leading-tight ${isFirst ? 'text-[20px] md:text-[24px]' : 'text-[15px] md:text-[17px]'}`}
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {entry.name || '—'}
              </h3>
              {source && (
                <SourceSessionChip
                  sourceSession={source.sourceSession}
                  indexInClub={source.indexInClub}
                  lang={lang}
                  t={t}
                />
              )}
              {entry.avg != null && (
                <p className="mt-2 text-[11.5px] tabular-nums" style={{ color: MUTED }}>
                  {Number(entry.avg).toFixed(2)} / 5
                </p>
              )}
            </motion.article>
          );
        };
        return (
          <section className="mb-16">
            <header className="mb-6">
              <p className="text-[10.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                {tT.finalists}
              </p>
              <h2
                className="text-[28px] md:text-[34px] leading-tight mt-1"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {tT.finalistsLead}
              </h2>
            </header>
            <div className="grid grid-cols-3 gap-3 md:gap-5 items-end">
              <PodiumCard entry={second} position="left" />
              <PodiumCard entry={first} position="center" />
              <PodiumCard entry={third} position="right" />
            </div>
          </section>
        );
      })()}

      {/* Sessions qualificatives */}
      {palmares.qualifyingSessions.length > 0 && (
        <section className="mb-16">
          <header className="mb-6">
            <p className="text-[10.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              {tT.sessions}
            </p>
            <h2
              className="text-[28px] md:text-[34px] leading-tight mt-1"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {tT.sessionsLead}
            </h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {palmares.qualifyingSessions.map((session, idx) => (
              <SessionCard
                key={session.session_id}
                session={session}
                lang={lang}
                t={t}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* Partners / soutien */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-[4px] p-6 md:p-8 mb-14"
        style={{ background: '#fff', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[10.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
          {tT.partnersTitle}
        </p>
        <p className="text-[14.5px] mt-2 max-w-[640px]" style={{ color: INK }}>
          {tT.partnersBody}
        </p>
      </motion.section>

      {/* Footer + CTA candidater */}
      <Footer
        width="wide"
        left={tT.footerLine(ed.year)}
        right={
          <>
            <a
              href="https://rotary-startup.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: NAVY }}
              className={`hover:underline rounded-[2px] ${FOCUS_RING_CLASS}`}
            >
              {tT.landingLink}
            </a>
            {openEditionQ.data?.id && (
              <Link
                to={`/MonDossier?edition=${encodeURIComponent(openEditionQ.data.id)}`}
                className={`inline-flex items-center gap-1.5 rounded-[2px] ${FOCUS_RING_CLASS}`}
                style={{ color: NAVY }}
              >
                {tT.applyCta}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            )}
          </>
        }
      />
    </PageShell>
  );
}
