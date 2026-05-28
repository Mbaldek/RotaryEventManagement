// SessionCard — card individuelle de session sur la page /Concours (V2.5).
//
// Pattern : reproduit le visuel SessionCard de RsaJuryHub V1, adapté Élysée
// strict (navy/gold/cream/ink). Une card carte la « santé » d'une session en un
// regard :
//   - header : nom thématique de la session + date formatée
//   - status pill + countdown
//   - 2 KPIs compacts : K jurés confirmés, N startups
//   - lien optionnel "Pack jury" (download signed URL)
//   - finaliste retenu (si status='published') OU bouton CTA "Détail" sinon
//
// La card entière est cliquable (-> ouvre le drawer détail). Le bouton "Pack
// jury" stoppe la propagation pour ne pas re-déclencher le drawer.

import React from 'react';
import { Users, Rocket, FileText, ChevronRight, Calendar } from 'lucide-react';
import { NAVY, GOLD, CREAM, CREAM2, INK, MUTED, SERIF } from '@/components/design/tokens';
import { computeCountdown } from '@/components/rsa/jury/constants';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { supabase } from '@/lib/supabase';

function juryPackPublicUrl(path) {
  if (!path) return null;
  try {
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function countdownLabel(cd, t, T) {
  if (!cd) return null;
  if (cd.kind === 'today') return t(T.today);
  if (cd.kind === 'tomorrow') return t(T.tomorrow);
  if (cd.kind === 'in') return t(T.inDays)(cd.days);
  // 'past' / 'yesterday'
  return t(T.ago);
}

export default function SessionCard({ session, t, lang, startupsCount, jurorsCount, finalistName, onOpen }) {
  const status = session?.config?.status || 'draft';
  const cd = computeCountdown(session?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const cdLabel = countdownLabel(cd, t, UI);
  const juryPackUrl = juryPackPublicUrl(session?.config?.jury_pack_path);
  const dateLabel = formatSessionDate(session?.session_date, lang);
  const isPublished = status === 'published';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(session)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(session);
        }
      }}
      className="bg-white rounded-[10px] p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
      style={{ border: `1px solid ${CREAM2}` }}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="text-[17px] font-medium leading-tight truncate"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {session?.name || session?.theme || session?.id}
          </h3>
          {dateLabel && (
            <div
              className="text-[11.5px] mt-1 flex items-center gap-1.5"
              style={{ color: MUTED }}
            >
              <Calendar className="w-3 h-3" />
              <span className="truncate">{dateLabel}</span>
            </div>
          )}
        </div>
        <ConcoursStatusPill status={status} days={days} T={UI} t={t} />
      </header>

      {/* Countdown line (only when relevant) */}
      {cdLabel && status !== 'published' && (
        <div
          className="text-[11px] uppercase tracking-[0.14em] font-medium"
          style={{ color: status === 'live' ? '#b91c1c' : GOLD }}
        >
          {cdLabel}
        </div>
      )}

      {/* KPI line */}
      <div className="flex items-center gap-5 flex-wrap text-[12.5px]" style={{ color: INK }}>
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
          {t(UI.cardJurorsLabel)(jurorsCount || 0)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Rocket className="w-3.5 h-3.5" style={{ color: GOLD }} />
          {t(UI.cardStartupsLabel)(startupsCount || 0)}
        </span>
      </div>

      {/* Finalist (published) OR pack jury / CTA */}
      {isPublished ? (
        <div
          className="rounded-[6px] px-3 py-2.5 flex items-center gap-2 text-[12.5px]"
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
            border: `1px solid ${GOLD}55`,
          }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="uppercase text-[9px] tracking-[0.16em] font-semibold"
              style={{ color: '#9a6400' }}
            >
              {finalistName ? t(UI.cardFinalistLabel) : t(UI.cardFinalistPending)}
            </div>
            {finalistName && (
              <div
                className="font-medium mt-0.5 truncate"
                style={{ color: NAVY, fontFamily: SERIF }}
              >
                {finalistName}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-auto">
          {juryPackUrl ? (
            <a
              href={juryPackUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px]"
              style={{ color: NAVY, background: CREAM, border: `1px solid ${CREAM2}` }}
            >
              <FileText className="w-3 h-3" />
              {t(UI.cardJuryPack)}
            </a>
          ) : (
            <span />
          )}
          <span
            className="inline-flex items-center gap-1 text-[11.5px] font-medium"
            style={{ color: GOLD }}
          >
            {t(UI.cardOpenSession)}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </article>
  );
}
