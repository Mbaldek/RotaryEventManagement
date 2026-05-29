// SessionsTab — vue agrégée des sessions par club pour une compétition.
//
// Les sessions sont configurées DANS le Club Cockpit (chaque club gère ses
// propres sessions de pitch + finale). Cette tab agrège, pour le master_admin
// ou competition_admin, l'état des sessions de TOUS les clubs participants,
// avec un lien direct vers le cockpit de chaque club.
//
// Trois cas par club :
//   * 0 session         → status "TODO" + bouton "Configurer dans le cockpit"
//   * >= 1 session draft → status "Brouillon"
//   * >= 1 live         → status "En cours"
//   * >= 1 published    → status "Publiée"
//
// On réutilise useCountsForEdition (déjà agrégé : sessions / sessionsLive /
// sessionsPublished par club) → pas de fetch supplémentaire.

import React from 'react';
import { Loader2, ArrowRight, AlertTriangle, CalendarClock, Radio, CheckCircle2 } from 'lucide-react';
import {
  CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { useClubsForEdition, useCountsForEdition } from '../useMaster';

const COPY = {
  intro: {
    fr: 'Les sessions de pitch se configurent dans le cockpit de chaque club. Cliquez sur « Cockpit » pour ouvrir un club et créer ou éditer ses sessions.',
    en: 'Pitch sessions are configured in each club’s cockpit. Click “Cockpit” to open a club and create or edit its sessions.',
    de: 'Pitch-Sessions werden im Cockpit jedes Clubs konfiguriert. Klicken Sie auf „Cockpit", um einen Club zu öffnen und seine Sessions zu erstellen oder zu bearbeiten.',
  },
  noClubs: {
    fr: 'Aucun club attaché à cette compétition. Attachez d’abord un club via l’onglet Clubs.',
    en: 'No club attached to this competition yet. Attach a club first via the Clubs tab.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet. Fügen Sie zuerst über den Reiter Clubs einen Club hinzu.',
  },
  cockpit: {
    fr: 'Ouvrir le cockpit',
    en: 'Open cockpit',
    de: 'Cockpit öffnen',
  },
  statusEmpty: {
    fr: 'Aucune session',
    en: 'No session yet',
    de: 'Noch keine Sessions',
  },
  statusDraft: {
    fr: '{n} brouillon·s',
    en: '{n} draft·s',
    de: '{n} Entwürfe',
  },
  statusLive: {
    fr: '{n} en cours',
    en: '{n} live',
    de: '{n} laufend',
  },
  statusPublished: {
    fr: '{n} publiée·s',
    en: '{n} published',
    de: '{n} veröffentlicht',
  },
  totalSessions: {
    fr: '{n} session·s',
    en: '{n} sessions',
    de: '{n} Sessions',
  },
  loadError: {
    fr: 'Impossible de charger les sessions. Réessayez.',
    en: 'Could not load sessions. Please retry.',
    de: 'Sessions konnten nicht geladen werden. Bitte erneut versuchen.',
  },
};

function StatusPill({ kind, label }) {
  const palette = {
    empty:     { bg: TINT_DANGER, fg: DANGER,  Icon: AlertTriangle },
    draft:     { bg: '#fdf6e8',   fg: GOLD,    Icon: CalendarClock },
    live:      { bg: '#e7f4e2',   fg: '#3e7b27', Icon: Radio },
    published: { bg: '#e8eef7',   fg: NAVY,    Icon: CheckCircle2 },
  }[kind] || { bg: TINT_ADMIN, fg: MUTED, Icon: CalendarClock };
  const Icon = palette.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${CREAM2}` }}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </span>
  );
}

export default function SessionsTab({ editionId }) {
  const { t } = useLang();
  const clubsQ  = useClubsForEdition(editionId);
  const countsQ = useCountsForEdition(editionId);

  const clubs = React.useMemo(() => {
    const rows = clubsQ.data || [];
    return rows.map((r) => ({
      id:   r.club?.id || r.club_id || r.id,
      name: r.club?.name || r.name || r.club_id || r.id,
    }));
  }, [clubsQ.data]);

  // Map club_id → { sessions, sessionsLive, sessionsPublished }
  const byClub = React.useMemo(() => {
    const map = new Map();
    for (const bucket of countsQ.data?.byClub || []) {
      const id = bucket.club?.id;
      if (id) map.set(id, bucket);
    }
    return map;
  }, [countsQ.data]);

  const gotoClubCockpit = (clubId) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/Admin?scope=club:${encodeURIComponent(clubId)}`;
    }
  };

  const isLoading = clubsQ.isLoading || countsQ.isLoading;
  const isError = clubsQ.isError || countsQ.isError;

  return (
    <section>
      <p className="text-[13px] mb-5" style={{ color: INK }}>
        {t(COPY.intro)}
      </p>

      {isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {isError && (
        <p
          className="text-[12.5px] px-3 py-2 rounded-[4px]"
          role="alert"
          style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
        >
          {t(COPY.loadError)}
        </p>
      )}

      {!isLoading && !isError && clubs.length === 0 && (
        <div
          className="rounded-[4px] p-5 flex items-start gap-2.5"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} aria-hidden />
          <p className="text-[12.5px]" style={{ color: INK }}>
            {t(COPY.noClubs)}
          </p>
        </div>
      )}

      {!isLoading && !isError && clubs.length > 0 && (
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          {clubs.map((c) => {
            const bucket = byClub.get(c.id) || {};
            const total = bucket.sessions || 0;
            const live = bucket.sessionsLive || 0;
            const published = bucket.sessionsPublished || 0;
            const draft = Math.max(0, total - live - published);
            return (
              <li
                key={c.id}
                className="rounded-[4px] px-4 py-3 flex items-center gap-4 flex-wrap"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[13.5px]" style={{ color: NAVY, fontWeight: 500, fontFamily: SERIF }}>
                    {c.name}
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>
                    {t(COPY.totalSessions).replace('{n}', String(total))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {total === 0 && (
                    <StatusPill kind="empty" label={t(COPY.statusEmpty)} />
                  )}
                  {draft > 0 && (
                    <StatusPill kind="draft" label={t(COPY.statusDraft).replace('{n}', String(draft))} />
                  )}
                  {live > 0 && (
                    <StatusPill kind="live" label={t(COPY.statusLive).replace('{n}', String(live))} />
                  )}
                  {published > 0 && (
                    <StatusPill kind="published" label={t(COPY.statusPublished).replace('{n}', String(published))} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => gotoClubCockpit(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium ${FOCUS_RING_CLASS}`}
                  style={{ background: NAVY, color: 'white' }}
                >
                  {t(COPY.cockpit)}
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
