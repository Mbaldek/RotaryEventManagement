// QueueList — editorial list of submitted dossiers (Élysée, NOT a data table).
// Renders one stacked row per startup with name + meta line + pills + chevron.
// Calls onOpen(startupId) when a row is clicked / activated.
//
// V3 visual sweep : ajout d'une barre couleur gauche par VERDICT d'éligibilité
// (eligible=sage, flagged=ochre, excluded=brick) pour permettre un scan visuel
// rapide de la queue. Fallback sur le decision effective si pas de verdict.
// Cf. project_concours_v2_visual_pattern (mémoire) — pattern étendu à Selection.

import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import StatusBadge from './StatusBadge';
import { UI } from './i18n';
import {
  formatShortDate,
  needsAdminValidation,
  pickEffectiveReview,
} from './constants';

// ── Barre couleur gauche : verdict (priorité) → decision (fallback) → neutral
const VERDICT_RAIL = {
  eligible: '#1d6b4f', // sage
  flagged:  '#9a6400', // ochre
  excluded: '#a23b2d', // brick
};
const DECISION_RAIL = {
  eligible:      '#1d6b4f',
  liste_attente: '#9a6400',
  rejete:        '#a23b2d',
  a_examiner:    null, // pas de rail si pas encore décidé
};
function pickRailColor(startup, effective) {
  const verdict = startup?.eligibility?.verdict;
  if (verdict && VERDICT_RAIL[verdict]) return VERDICT_RAIL[verdict];
  if (effective?.decision && DECISION_RAIL[effective.decision]) {
    return DECISION_RAIL[effective.decision];
  }
  return null;
}

function MetaLine({ startup, lang }) {
  const sectorsList = Array.isArray(startup?.sectors) ? startup.sectors : [];
  const sectorPreview = sectorsList.slice(0, 2);
  const extra = sectorsList.length - sectorPreview.length;

  const bits = [
    startup?.country,
    formatShortDate(startup?.creation_date, lang),
  ].filter(Boolean);

  return (
    <div className="text-[12px] leading-snug" style={{ color: MUTED }}>
      <span>{bits.join(' · ')}</span>
      {sectorPreview.length > 0 && (
        <span>
          {bits.length > 0 ? ' · ' : ''}
          {sectorPreview.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-block px-1.5 py-0.5 rounded-full text-[10px] mr-1"
              style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}`, color: INK }}
            >
              {s}
            </span>
          ))}
          {extra > 0 && <span style={{ color: MUTED }}>+{extra}</span>}
        </span>
      )}
    </div>
  );
}

function ContactLine({ startup }) {
  const parts = [startup?.contact_person, startup?.email].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div className="text-[12px] truncate" style={{ color: INK }}>
      {parts.join(' · ')}
    </div>
  );
}

function ReviewerLine({ effective, t, lang }) {
  if (!effective) return null;
  const when = formatShortDate(effective.reviewed_at, lang);
  const who = effective.reviewer_name || '—';
  return (
    <div className="text-[12px]" style={{ color: MUTED }}>
      {t(UI.byReviewer)} <span style={{ color: INK }}>{who}</span>
      {when && <> · {when}</>}
    </div>
  );
}

function QueueRow({ startup, onOpen, selected, lang, t }) {
  const reviews = Array.isArray(startup?.selection_reviews) ? startup.selection_reviews : [];
  const effective = pickEffectiveReview(reviews);
  const validation = needsAdminValidation(effective);
  const final = !!effective?.is_final;
  const railColor = pickRailColor(startup, effective);

  return (
    <li
      className="relative rounded-[4px] overflow-hidden transition-colors"
      style={{
        background: selected ? '#fbf9f5' : 'white',
        border: `1px solid ${selected ? GOLD : CREAM2}`,
      }}
    >
      {railColor && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 3, background: railColor }}
        />
      )}
      <button
        type="button"
        onClick={() => onOpen?.(startup.id)}
        className={`w-full text-left flex items-start gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] rounded-[4px] ${railColor ? 'pl-5' : ''}`}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3
              className="text-[18px] leading-tight truncate"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {startup?.name || '—'}
              {final && (
                <span
                  aria-hidden
                  className="inline-block w-1.5 h-1.5 rounded-full ml-2 align-middle"
                  style={{ background: GOLD }}
                  title={t(UI.finalCaption)}
                />
              )}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge kind="verdict" verdict={startup?.eligibility?.verdict} />
              <StatusBadge kind="status" status={startup?.status} />
              {validation && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}` }}
                >
                  {t(UI.needsValidation)}
                </span>
              )}
            </div>
          </div>
          <MetaLine startup={startup} lang={lang} />
          <ContactLine startup={startup} />
          <ReviewerLine effective={effective} t={t} lang={lang} />
        </div>
        <ChevronRight className="w-4 h-4 mt-1 shrink-0" style={{ color: GOLD }} aria-hidden />
      </button>
    </li>
  );
}

export default function QueueList({
  pages,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onOpen,
  selectedId,
  onRetry,
}) {
  const { t, lang } = useLang();

  if (isError) {
    return (
      <div
        className="rounded-[4px] p-5 text-center"
        style={{ border: `1px solid ${CREAM2}`, background: 'white' }}
      >
        <p className="text-[14px] mb-3" style={{ color: INK }}>
          {t(UI.loadError)}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] font-medium px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
        >
          {t(UI.retry)}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-[4px] p-4 animate-pulse"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, height: 92 }}
            aria-hidden
          >
            <div className="h-4 w-1/3 rounded" style={{ background: CREAM2 }} />
            <div className="h-3 w-1/2 rounded mt-2.5" style={{ background: CREAM2 }} />
            <div className="h-3 w-1/4 rounded mt-2" style={{ background: CREAM2 }} />
          </li>
        ))}
      </ul>
    );
  }

  const flat = (pages || []).flat();
  if (!flat.length) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ border: `1px solid ${CREAM2}`, background: 'white' }}
      >
        <p className="text-[14px]" style={{ color: INK }}>
          {t(UI.emptyQueue)}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {flat.map((s) => (
          <QueueRow
            key={s.id}
            startup={s}
            onOpen={onOpen}
            selected={selectedId === s.id}
            lang={lang}
            t={t}
          />
        ))}
      </ul>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
          >
            {isFetchingNextPage && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {t(UI.loadMore)}
          </button>
        </div>
      )}
    </>
  );
}
