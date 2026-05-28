// SessionDetailDrawer — drawer/modal éditorial déclenché au click sur une
// SessionCard (V2.5).
//
// Affiche le détail d'une session en lecture seule :
//   - en-tête : nom + date + status pill
//   - liste startups avec leurs decks/exec summaries (signed URLs publiques
//     limitées à l'auth — la RLS sur startups gère la frontière sensible)
//   - liste jurés confirmés (chips avec qualité + organisation)
//
// Aucune donnée sensible n'est exposée : on ne montre PAS owner_id, ni email,
// ni scores individuels. Les decks restent les mêmes signed URLs publiques que
// l'admin pourrait partager via le pack jury.

import React, { useEffect } from 'react';
import { X, Calendar, Download, FileText } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';
import { useSessionDetail } from './useConcours';
import { supabase } from '@/lib/supabase';

function storageUrl(path) {
  if (!path) return null;
  try {
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function JurorChip({ juror }) {
  const name = juror?.full_name || juror?.qualite || '—';
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  const photoUrl = storageUrl(juror?.photo_path);
  return (
    <div
      className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full"
      style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: INK }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
        style={{
          background: photoUrl ? `url(${photoUrl}) center/cover` : NAVY,
          color: 'white',
        }}
        aria-hidden
      >
        {!photoUrl && initials}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium leading-tight" style={{ color: NAVY }}>
          {name}
        </div>
        {(juror?.qualite || juror?.organisation) && (
          <div className="text-[10.5px] leading-tight truncate" style={{ color: MUTED }}>
            {[juror.qualite, juror.organisation].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}

function StartupRow({ startup, t }) {
  const deckUrl = storageUrl(startup?.pitch_deck_path);
  const execUrl = storageUrl(startup?.exec_summary_path);

  return (
    <li
      className="flex items-start justify-between gap-3 py-3"
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium" style={{ color: NAVY, fontFamily: SERIF }}>
          {startup?.name || '—'}
        </div>
        {startup?.status && (
          <div className="text-[10.5px] mt-0.5 uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            {startup.status}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {deckUrl ? (
          <a
            href={deckUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px]"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <Download className="w-3 h-3" />
            {t(UI.drawerDeck)}
          </a>
        ) : (
          <span className="text-[11px]" style={{ color: MUTED }}>
            {t(UI.drawerDeck)} · {t(UI.drawerNotAvailable)}
          </span>
        )}
        {execUrl ? (
          <a
            href={execUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px]"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <FileText className="w-3 h-3" />
            {t(UI.drawerExec)}
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function SessionDetailDrawer({ sessionId, onClose }) {
  const { t, lang } = useLang();
  const { data, isLoading, isError } = useSessionDetail(sessionId, !!sessionId);

  // Esc to close.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (sessionId) {
      window.addEventListener('keydown', onKey);
      // Block page scroll under the drawer.
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [sessionId, onClose]);

  if (!sessionId) return null;

  const session = data?.session;
  const config = data?.config;
  const startups = data?.startups || [];
  const jurors = data?.jurors || [];
  const status = config?.status || 'draft';
  const cd = computeCountdown(session?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const dateLabel = formatSessionDate(session?.session_date, lang);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-end md:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concours-drawer-title"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,31,61,0.45)' }}
        onClick={onClose}
      />
      <aside
        className="relative w-full md:w-[560px] h-full overflow-y-auto"
        style={{ background: 'white', borderLeft: `1px solid ${CREAM2}` }}
      >
        {/* Sticky close */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
          style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
        >
          <div
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(UI.drawerSection)}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(UI.drawerClose)}
            className="p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            style={{ color: MUTED }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-6">
          {isLoading && (
            <div className="text-[13px]" style={{ color: MUTED }}>
              {t(UI.loading)}
            </div>
          )}
          {isError && (
            <div className="text-[13px]" style={{ color: '#b91c1c' }}>
              {t(UI.loadError)}
            </div>
          )}

          {session && (
            <>
              <h2
                id="concours-drawer-title"
                className="text-[22px] font-normal leading-tight"
                style={{ fontFamily: SERIF, color: NAVY }}
              >
                {session.name || session.theme || session.id}
              </h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {dateLabel && (
                  <span
                    className="text-[12px] inline-flex items-center gap-1.5"
                    style={{ color: INK }}
                  >
                    <Calendar className="w-3 h-3" />
                    {dateLabel}
                  </span>
                )}
                <ConcoursStatusPill status={status} days={days} T={UI} t={t} />
              </div>

              {/* Startups */}
              <section className="mt-7">
                <h3
                  className="uppercase text-[10.5px] tracking-[0.14em] font-medium mb-3"
                  style={{ color: NAVY }}
                >
                  {t(UI.drawerStartups)} · {startups.length}
                </h3>
                {startups.length === 0 ? (
                  <div className="text-[12.5px] italic" style={{ color: MUTED }}>
                    {t(UI.drawerEmpty)}
                  </div>
                ) : (
                  <ul className="m-0 p-0 list-none">
                    {startups.map((s) => (
                      <StartupRow key={s.id} startup={s} t={t} />
                    ))}
                  </ul>
                )}
              </section>

              {/* Jurors */}
              <section className="mt-7">
                <h3
                  className="uppercase text-[10.5px] tracking-[0.14em] font-medium mb-3"
                  style={{ color: NAVY }}
                >
                  {t(UI.drawerJurors)} · {jurors.length}
                </h3>
                {jurors.length === 0 ? (
                  <div className="text-[12.5px] italic" style={{ color: MUTED }}>
                    {t(UI.drawerEmpty)}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {jurors.map((j) => (
                      <JurorChip key={j.user_id} juror={j} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
