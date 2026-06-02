// QueueTable — tableau filtrable des dossiers (remplace GroupedQueue + QueueList).
//
// Une ligne = une startup. Colonnes : Startup · Club · Statut · Verdict · Secteur
// (multi-tags colorés) · Décision · Contact · Pays/Langue · Soumis · Actions.
// En-têtes triables (tri CLIENT sur les pages chargées). Rail couleur gauche par
// verdict → décision (scan visuel, repris de QueueList).
//
// Actions par ligne : « Ouvrir » (drawer) toujours ; menu ⋯ avec « Valider la
// décision » (1 clic, admin + review en attente) — cf. blueprint, seule action
// sans saisie. Les décisions exigeant cluster/justification passent par le drawer.
//
// Responsive : tableau en md+ (scroll-x de secours), cartes denses en < md.

import React, { useMemo, useState } from 'react';
import { ChevronRight, Loader2, MoreHorizontal, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import StatusBadge from './StatusBadge';
import { UI } from './i18n';
import { sectorLabel, sectorChipColors } from './sectors';
import {
  formatShortDate,
  needsAdminValidation,
  pickEffectiveReview,
} from './constants';

// ── Rail couleur gauche : verdict (priorité) → decision (fallback) → neutral ──
const VERDICT_RAIL = { eligible: '#1d6b4f', flagged: '#9a6400', excluded: '#a23b2d' };
const DECISION_RAIL = {
  eligible: '#1d6b4f', liste_attente: '#9a6400', rejete: '#a23b2d', a_examiner: null,
};
function pickRailColor(startup, effective) {
  const verdict = startup?.eligibility?.verdict;
  if (verdict && VERDICT_RAIL[verdict]) return VERDICT_RAIL[verdict];
  if (effective?.decision && DECISION_RAIL[effective.decision]) return DECISION_RAIL[effective.decision];
  return null;
}

// ── Ordres de tri ────────────────────────────────────────────────────────────
const VERDICT_ORDER = { eligible: 0, flagged: 1, excluded: 2 };

function makeComparator(sort, clubsLookup, lang) {
  if (!sort || !sort.key) return null;
  const sign = sort.dir === 'desc' ? -1 : 1;
  const loc = lang === 'de' ? 'de' : lang === 'en' ? 'en' : 'fr';
  const clubName = (s) => clubsLookup?.get?.(s.club_id)?.name || s.club_id || '';
  return (a, b) => {
    let av;
    let bv;
    switch (sort.key) {
      case 'name':
        return sign * String(a.name || '').localeCompare(String(b.name || ''), loc);
      case 'club':
        return sign * clubName(a).localeCompare(clubName(b), loc);
      case 'status':
        return sign * String(a.status || '').localeCompare(String(b.status || ''), loc);
      case 'verdict':
        av = VERDICT_ORDER[a?.eligibility?.verdict] ?? 99;
        bv = VERDICT_ORDER[b?.eligibility?.verdict] ?? 99;
        return sign * (av - bv);
      case 'submitted':
        av = a.submitted_at ? Date.parse(a.submitted_at) : 0;
        bv = b.submitted_at ? Date.parse(b.submitted_at) : 0;
        return sign * (av - bv);
      default:
        return 0;
    }
  };
}

// ── Chips secteur ──────────────────────────────────────────────────────────
function SectorChips({ sectors, lang }) {
  const list = Array.isArray(sectors) ? sectors.filter(Boolean) : [];
  if (!list.length) return <span style={{ color: MUTED }}>—</span>;
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1" title={list.map((s) => sectorLabel(s, lang)).join(' · ')}>
      {shown.map((s, i) => {
        const c = sectorChipColors(s);
        return (
          <span
            key={`${s}-${i}`}
            className="inline-block px-2 py-0.5 rounded-full text-[11px] leading-tight whitespace-nowrap"
            style={{ background: c.light, border: `1px solid ${c.border}`, color: c.primary }}
          >
            {sectorLabel(s, lang)}
          </span>
        );
      })}
      {extra > 0 && <span className="text-[11px]" style={{ color: MUTED }}>+{extra}</span>}
    </div>
  );
}

// ── Cellule décision ─────────────────────────────────────────────────────────
function DecisionCell({ effective, validation, t, lang }) {
  if (!effective) return <span className="text-[12px]" style={{ color: MUTED }}>{t(UI.noDecision)}</span>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge kind="decision" decision={effective.decision} />
        {validation && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${GOLD}` }}
          >
            {t(UI.needsValidation)}
          </span>
        )}
      </div>
      {effective.is_final && (
        <span className="text-[11px]" style={{ color: MUTED }}>
          {effective.reviewer_name || '—'}
          {effective.reviewed_at ? ` · ${formatShortDate(effective.reviewed_at, lang)}` : ''}
        </span>
      )}
    </div>
  );
}

// ── Menu d'actions rapides ─────────────────────────────────────────────────
function RowMenu({ startup, effective, canValidate, onOpen, onQuickValidate, t }) {
  const [open, setOpen] = useState(false);
  const canQuickValidate =
    canValidate && effective && !effective.is_final && !!effective.id;

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onOpen?.(startup.id)}
        aria-label={t(UI.rowOpen)}
        title={t(UI.rowOpen)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ border: `1px solid ${CREAM2}`, color: GOLD }}
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(UI.rowActions)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ border: `1px solid ${CREAM2}`, color: MUTED }}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden />
      </button>

      {open && (
        <>
          {/* Backdrop transparent : capture le clic extérieur pour fermer */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
            style={{ background: 'transparent' }}
          />
          <div
            role="menu"
            className="absolute right-0 top-8 z-50 min-w-[200px] rounded-[4px] py-1 shadow-lg"
            style={{ background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {canQuickValidate && (
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onQuickValidate?.(startup); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] outline-none hover:bg-[#fbf9f5] focus-visible:bg-[#fbf9f5]"
                style={{ color: NAVY }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
                {t(UI.quickValidate)}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onOpen?.(startup.id); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] outline-none hover:bg-[#fbf9f5] focus-visible:bg-[#fbf9f5]"
              style={{ color: INK }}
            >
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} aria-hidden />
              {t(UI.rowOpen)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── En-tête triable ──────────────────────────────────────────────────────────
function SortHeader({ label, sortKey, sort, onSortChange, align = 'left' }) {
  const active = sort?.key === sortKey;
  const dir = active ? sort.dir : null;
  const next = !active ? 'asc' : sort.dir === 'asc' ? 'desc' : null;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-medium select-none"
      style={{ color: MUTED, textAlign: align }}
    >
      <button
        type="button"
        onClick={() => onSortChange?.(next ? { key: sortKey, dir: next } : null)}
        className="inline-flex items-center gap-1 outline-none focus-visible:underline"
        style={{ color: active ? NAVY : MUTED }}
      >
        {label}
        {active && (dir === 'asc'
          ? <ArrowUp className="w-3 h-3" aria-hidden />
          : <ArrowDown className="w-3 h-3" aria-hidden />)}
      </button>
    </th>
  );
}

function PlainHeader({ label, align = 'left' }) {
  return (
    <th
      scope="col"
      className="px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] font-medium"
      style={{ color: MUTED, textAlign: align }}
    >
      {label}
    </th>
  );
}

// ── Ligne tableau (desktop) ───────────────────────────────────────────────────
function TableRow({ startup, clubsLookup, selected, onOpen, onQuickValidate, canValidate, lang, t }) {
  const reviews = Array.isArray(startup?.selection_reviews) ? startup.selection_reviews : [];
  const effective = pickEffectiveReview(reviews);
  const validation = needsAdminValidation(effective);
  const final = !!effective?.is_final;
  const rail = pickRailColor(startup, effective);
  const club = clubsLookup?.get?.(startup.club_id);
  const langTag = startup?.preferred_lang || startup?.lang;

  return (
    <tr
      className="align-top transition-colors"
      style={{ background: selected ? '#fbf9f5' : 'white', borderBottom: `1px solid ${CREAM2}` }}
    >
      {/* Rail */}
      <td className="p-0 w-1" style={{ background: rail || 'transparent' }} aria-hidden />

      {/* Startup */}
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onOpen?.(startup.id)}
          className="text-left outline-none focus-visible:underline"
        >
          <span className="text-[15px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {startup?.name || '—'}
            {final && (
              <span
                aria-hidden
                className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle"
                style={{ background: GOLD }}
                title={t(UI.finalCaption)}
              />
            )}
          </span>
        </button>
      </td>

      {/* Club */}
      <td className="px-3 py-3 text-[13px]" style={{ color: INK }}>
        {club?.name || <span style={{ color: MUTED }}>—</span>}
      </td>

      {/* Statut */}
      <td className="px-3 py-3"><StatusBadge kind="status" status={startup?.status} /></td>

      {/* Verdict */}
      <td className="px-3 py-3"><StatusBadge kind="verdict" verdict={startup?.eligibility?.verdict} /></td>

      {/* Secteur */}
      <td className="px-3 py-3"><SectorChips sectors={startup?.sectors} lang={lang} /></td>

      {/* Décision */}
      <td className="px-3 py-3"><DecisionCell effective={effective} validation={validation} t={t} lang={lang} /></td>

      {/* Contact */}
      <td className="px-3 py-3 text-[12px]" style={{ color: INK }}>
        <div className="truncate max-w-[180px]">{startup?.contact_person || '—'}</div>
        {startup?.email && (
          <div className="truncate max-w-[180px]" style={{ color: MUTED }}>{startup.email}</div>
        )}
      </td>

      {/* Pays / Langue */}
      <td className="px-3 py-3 text-[12px]" style={{ color: INK }}>
        {startup?.country || '—'}
        {langTag && <span style={{ color: MUTED }}> · {String(langTag).toLowerCase()}</span>}
      </td>

      {/* Soumis */}
      <td className="px-3 py-3 text-[12px] whitespace-nowrap" style={{ color: MUTED }}>
        {formatShortDate(startup?.submitted_at, lang) || '—'}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        <RowMenu
          startup={startup}
          effective={effective}
          canValidate={canValidate}
          onOpen={onOpen}
          onQuickValidate={onQuickValidate}
          t={t}
        />
      </td>
    </tr>
  );
}

// ── Carte dense (mobile) ──────────────────────────────────────────────────────
function MobileCard({ startup, clubsLookup, selected, onOpen, lang }) {
  const reviews = Array.isArray(startup?.selection_reviews) ? startup.selection_reviews : [];
  const effective = pickEffectiveReview(reviews);
  const final = !!effective?.is_final;
  const rail = pickRailColor(startup, effective);
  const club = clubsLookup?.get?.(startup.club_id);

  return (
    <li
      className="relative rounded-[4px] overflow-hidden"
      style={{ background: selected ? '#fbf9f5' : 'white', border: `1px solid ${selected ? GOLD : CREAM2}` }}
    >
      {rail && <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: rail }} />}
      <button
        type="button"
        onClick={() => onOpen?.(startup.id)}
        className={`w-full text-left flex items-start justify-between gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c9a84c] ${rail ? 'pl-5' : ''}`}
      >
        <div className="min-w-0 flex flex-col gap-1.5">
          <span className="text-[16px] leading-tight truncate" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {startup?.name || '—'}
            {final && <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle" style={{ background: GOLD }} />}
          </span>
          {club?.name && <span className="text-[12px]" style={{ color: MUTED }}>{club.name}</span>}
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <StatusBadge kind="status" status={startup?.status} />
            <StatusBadge kind="verdict" verdict={startup?.eligibility?.verdict} />
          </div>
          <div className="mt-1"><SectorChips sectors={startup?.sectors} lang={lang} /></div>
        </div>
        <ChevronRight className="w-4 h-4 mt-1 shrink-0" style={{ color: GOLD }} aria-hidden />
      </button>
    </li>
  );
}

export default function QueueTable({
  pages,
  clubsLookup,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onOpen,
  onQuickValidate,
  canValidate,
  selectedId,
  onRetry,
  sort,
  onSortChange,
}) {
  const { t, lang } = useLang();

  const flat = useMemo(() => (pages || []).flat(), [pages]);
  const rows = useMemo(() => {
    const cmp = makeComparator(sort, clubsLookup, lang);
    if (!cmp) return flat;
    return [...flat].sort(cmp);
  }, [flat, sort, clubsLookup, lang]);

  if (isError) {
    return (
      <div className="rounded-[4px] p-5 text-center" style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
        <p className="text-[14px] mb-3" style={{ color: INK }}>{t(UI.loadError)}</p>
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
      <div className="rounded-[4px] overflow-hidden" style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse" style={{ borderBottom: `1px solid ${CREAM2}` }} aria-hidden>
            <div className="h-4 w-40 rounded" style={{ background: CREAM2 }} />
            <div className="h-3 w-24 rounded" style={{ background: CREAM2 }} />
            <div className="h-3 w-20 rounded ml-auto" style={{ background: CREAM2 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[4px] p-6 text-center" style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
        <p className="text-[14px]" style={{ color: INK }}>{t(UI.emptyQueue)}</p>
      </div>
    );
  }

  return (
    <>
      {/* Compteur */}
      <p className="text-[12px] mb-2" style={{ color: MUTED }}>
        {t(UI.resultsCount).replace('{n}', String(rows.length))}
      </p>

      {/* Desktop : tableau */}
      <div className="hidden md:block rounded-[4px] overflow-x-auto" style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
        <table className="w-full border-collapse" style={{ minWidth: 920 }}>
          <thead>
            <tr style={{ background: CREAM, borderBottom: `1px solid ${CREAM2}` }}>
              <th aria-hidden className="w-1 p-0" />
              <SortHeader label={t(UI.colStartup)} sortKey="name" sort={sort} onSortChange={onSortChange} />
              <SortHeader label={t(UI.colClub)} sortKey="club" sort={sort} onSortChange={onSortChange} />
              <SortHeader label={t(UI.colStatus)} sortKey="status" sort={sort} onSortChange={onSortChange} />
              <SortHeader label={t(UI.colVerdict)} sortKey="verdict" sort={sort} onSortChange={onSortChange} />
              <PlainHeader label={t(UI.colSector)} />
              <PlainHeader label={t(UI.colDecision)} />
              <PlainHeader label={t(UI.colContact)} />
              <PlainHeader label={t(UI.colCountry)} />
              <SortHeader label={t(UI.colSubmitted)} sortKey="submitted" sort={sort} onSortChange={onSortChange} />
              <PlainHeader label={t(UI.colActions)} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <TableRow
                key={s.id}
                startup={s}
                clubsLookup={clubsLookup}
                selected={selectedId === s.id}
                onOpen={onOpen}
                onQuickValidate={onQuickValidate}
                canValidate={canValidate}
                lang={lang}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <ul className="md:hidden flex flex-col gap-2 list-none m-0 p-0">
        {rows.map((s) => (
          <MobileCard
            key={s.id}
            startup={s}
            clubsLookup={clubsLookup}
            selected={selectedId === s.id}
            onOpen={onOpen}
            lang={lang}
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
