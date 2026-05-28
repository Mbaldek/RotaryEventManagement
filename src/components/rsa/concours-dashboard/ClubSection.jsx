// ClubSection — bloc d'un club avec son nom + grid de SessionCards (V2.5).
//
// Pattern : eyebrow club + nom serif + meta (X sessions, N candidatures) sur la
// gauche, hairline gold puis grid 1/2/3 colonnes selon viewport.
// Si le club n'a aucune session programmée, on rend un état vide INK muted.

import React from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import SessionCard from './SessionCard';
import { UI } from './i18n';

export default function ClubSection({
  club,
  sessions,
  startupsCount,
  startupsBySession,
  jurorsBySession,
  finalistsBySource,
  onOpenSession,
}) {
  const { t, lang } = useLang();
  const sessionsList = Array.isArray(sessions) ? sessions : [];
  const sessionsCount = sessionsList.length;

  return (
    <section className="mb-12">
      <header className="mb-5">
        <Eyebrow>{t(UI.clubEyebrow)}</Eyebrow>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <h2
            className="text-[26px] font-normal leading-tight"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {club?.name || club?.id}
          </h2>
          <div className="text-[12px] flex items-center gap-3" style={{ color: MUTED }}>
            <span>{t(UI.clubSessionsCount)(sessionsCount)}</span>
            <span aria-hidden style={{ color: CREAM2 }}>·</span>
            <span>{t(UI.clubCandidaturesCount)(startupsCount || 0)}</span>
          </div>
        </div>
        <div
          aria-hidden
          className="h-[1.5px] mt-4"
          style={{ background: GOLD, width: 36 }}
        />
      </header>

      {sessionsList.length === 0 ? (
        <div
          className="text-[13px] italic px-4 py-6 rounded-[8px]"
          style={{ color: MUTED, background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          {t(UI.noSessionsForClub)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessionsList.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              t={t}
              lang={lang}
              startupsCount={startupsBySession?.[s.id] || 0}
              jurorsCount={jurorsBySession?.[s.id] || 0}
              finalistName={finalistsBySource?.[s.id]?.startup_name || null}
              onOpen={onOpenSession}
            />
          ))}
        </div>
      )}
    </section>
  );
}
