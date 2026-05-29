// ModuleStatusStrip — bande hairline en haut du cockpit (M4a §2 overview).
//
// Résume en une ligne l'état des 3 autres modules pour la mise sous tension
// opérationnelle de l'admin (une lecture, pas d'interaction) :
//   M1 — Candidatures soumises (status='soumis') sur l'édition active.
//   M2 — À examiner (status='soumis') ; affecté(es) (status='affecte').
//   M3 — Sessions live / publiées (lit session_config via les jointures déjà chargées).
//   M4 — Statut + nom de l'édition (déjà connue de l'AdminShell).
//
// Lit les données via les hooks useAdmin (mêmes queries que les autres tabs : zéro
// requête supplémentaire dans le common case ; useStartupsSummary et useSessionsAdmin
// sont déjà nécessaires en SETUP/LIVE).

import React from 'react';
import { CREAM2, NAVY, MUTED, GOLD, INK, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { STRIP } from './i18n';
import { useSessionsAdmin, useStartupsSummary } from './useAdmin';

function Dot({ color }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: color }}
      aria-hidden
    />
  );
}

export default function ModuleStatusStrip({ edition }) {
  const { t } = useLang();
  const editionId = edition?.id;
  const summary  = useStartupsSummary(editionId);
  const sessions = useSessionsAdmin(editionId);

  if (!edition) {
    return (
      <div
        className="rounded-[4px] px-4 py-2.5 mb-5 text-[12.5px]"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: INK }}
      >
        {t(STRIP.noEdition)}
      </div>
    );
  }

  const counts = summary.data || {};
  const submittedN = (counts.soumis || 0);
  const affecteN   = (counts.affecte || 0);
  const liveN      = (sessions.data || []).filter((s) => s.config?.status === 'live').length;
  const publishedN = (sessions.data || []).filter((s) => s.config?.status === 'published').length;

  return (
    <div
      className="rounded-[4px] px-4 py-2.5 mb-6 flex items-center gap-x-5 gap-y-2 flex-wrap text-[12px]"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {t(STRIP.m4Label)} · {edition.name}
      </span>
      <span style={{ color: CREAM2 }} aria-hidden>·</span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{submittedN}</strong>
        <span style={{ color: INK }}>{t(STRIP.m1Label)}</span>
      </span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{affecteN}</strong>
        <span style={{ color: INK }}>{t(STRIP.m2Label)}</span>
      </span>

      <span className="inline-flex items-center gap-1.5" style={{ color: NAVY }}>
        <Dot color={GOLD} />
        <strong className="tabular-nums">{liveN}</strong>
        <span style={{ color: INK }}>{t(STRIP.liveSuffix)}</span>
        <span style={{ color: MUTED }}>/</span>
        <strong className="tabular-nums">{publishedN}</strong>
        <span style={{ color: INK }}>{t(STRIP.publishedSuffix)}</span>
        <span style={{ color: MUTED }}>({t(STRIP.m3Label)})</span>
      </span>
    </div>
  );
}
