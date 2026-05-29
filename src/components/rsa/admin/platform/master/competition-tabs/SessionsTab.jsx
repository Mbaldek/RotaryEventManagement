// SessionsTab — vue agrégée des sessions par club pour une compétition.
//
// Les sessions sont configurées DANS le Club Cockpit (chaque club gère ses
// propres sessions de pitch + finale). Cette tab agrège, pour le master_admin
// ou competition_admin, l'état des sessions de TOUS les clubs participants,
// avec :
//   * une pill de statut résumée (empty / draft / live / published) ;
//   * un toggle collapse/expand par club qui affiche les sessions en read-only
//     (id, name, kind, date, status, theme, lien Teams) ;
//   * un lien discret « Ouvrir le cockpit » à l'intérieur du panel développé
//     pour basculer en édition (SPA navigate, pas de reload — sinon kick auth).
//
// On lit toutes les sessions de l'édition une seule fois (useSessionsAdmin)
// puis on filtre par club côté client.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ChevronRight, AlertTriangle, CalendarClock, Radio,
  CheckCircle2, ArrowUpRight, ExternalLink,
} from 'lucide-react';
import {
  CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { StatusPill as JuryStatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { useClubsForEdition, useCountsForEdition } from '../useMaster';
import { useSessionsAdmin } from '../../useAdmin';

const COPY = {
  intro: {
    fr: 'Les sessions de pitch se configurent dans le cockpit de chaque club. Développez un club pour voir ses sessions en lecture seule, ou ouvrez son cockpit pour les éditer.',
    en: 'Pitch sessions are configured in each club’s cockpit. Expand a club to view its sessions in read-only mode, or open its cockpit to edit them.',
    de: 'Pitch-Sessions werden im Cockpit jedes Clubs konfiguriert. Erweitern Sie einen Club, um seine Sessions schreibgeschützt anzuzeigen, oder öffnen Sie das Cockpit zur Bearbeitung.',
  },
  noClubs: {
    fr: 'Aucun club attaché à cette compétition. Attachez d’abord un club via l’onglet Clubs.',
    en: 'No club attached to this competition yet. Attach a club first via the Clubs tab.',
    de: 'Diesem Wettbewerb ist noch kein Club zugeordnet. Fügen Sie zuerst über den Reiter Clubs einen Club hinzu.',
  },
  cockpit: {
    fr: 'Ouvrir le cockpit du club',
    en: 'Open club cockpit',
    de: 'Club-Cockpit öffnen',
  },
  expand: {
    fr: 'Voir les sessions',
    en: 'Show sessions',
    de: 'Sessions anzeigen',
  },
  collapse: {
    fr: 'Masquer',
    en: 'Hide',
    de: 'Ausblenden',
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
  noSessionsForClub: {
    fr: 'Aucune session configurée pour ce club. Ouvrez le cockpit pour en créer une.',
    en: 'No session configured for this club yet. Open the cockpit to create one.',
    de: 'Für diesen Club ist noch keine Session konfiguriert. Öffnen Sie das Cockpit, um eine zu erstellen.',
  },
  colPosition: { fr: 'Pos.', en: 'Pos.', de: 'Pos.' },
  colName:     { fr: 'Nom', en: 'Name', de: 'Name' },
  colKind:     { fr: 'Type', en: 'Kind', de: 'Typ' },
  colDate:     { fr: 'Date', en: 'Date', de: 'Datum' },
  colStatus:   { fr: 'Statut', en: 'Status', de: 'Status' },
  teamsLinkOpen: {
    fr: 'Lien Teams',
    en: 'Teams link',
    de: 'Teams-Link',
  },
  kindQualifying: { fr: 'Qualificative', en: 'Qualifying', de: 'Qualifikation' },
  kindFinale:     { fr: 'Finale',        en: 'Finale',     de: 'Finale' },
};

function StatusPill({ kind, label }) {
  const palette = {
    empty:     { bg: TINT_DANGER, fg: DANGER,    Icon: AlertTriangle },
    draft:     { bg: '#fdf6e8',   fg: GOLD,      Icon: CalendarClock },
    live:      { bg: '#e7f4e2',   fg: '#3e7b27', Icon: Radio },
    published: { bg: '#e8eef7',   fg: NAVY,      Icon: CheckCircle2 },
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

function SessionRow({ session, t }) {
  const status = session.config?.status || 'draft';
  const kindLabel = session.kind === 'finale' ? t(COPY.kindFinale) : t(COPY.kindQualifying);
  return (
    <li
      className="rounded-[4px] px-3 py-2 flex items-start gap-3 flex-wrap"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] tabular-nums shrink-0"
        style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
        aria-label={t(COPY.colPosition)}
      >
        {session.position ?? 0}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium" style={{ color: NAVY }}>{session.name}</span>
          <JuryStatusPill status={status} kind="jury" />
          <span className="text-[11.5px]" style={{ color: MUTED }}>· {kindLabel}</span>
          {session.session_date && (
            <span className="text-[11.5px]" style={{ color: MUTED }}>· {session.session_date}</span>
          )}
        </div>
        {session.theme && (
          <p className="text-[12px] mt-0.5" style={{ color: INK }}>{session.theme}</p>
        )}
        <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>{session.id}</p>
        {session.config?.teams_link && (
          <a
            href={session.config.teams_link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11.5px] mt-1 underline decoration-1 underline-offset-2 break-all"
            style={{ color: NAVY }}
          >
            <ExternalLink className="w-3 h-3" aria-hidden />
            {t(COPY.teamsLinkOpen)}
          </a>
        )}
      </div>
    </li>
  );
}

function ClubRow({ club, sessions, totals, isLoadingSessions, expanded, onToggle, onOpenCockpit, t }) {
  const { total, draft, live, published } = totals;
  const panelId = `sessions-panel-${club.id}`;
  return (
    <li
      className="rounded-[4px]"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`w-full text-left px-4 py-3 flex items-center gap-4 flex-wrap rounded-[4px] ${FOCUS_RING_CLASS}`}
        style={{ background: 'transparent' }}
      >
        <ChevronRight
          className="w-4 h-4 shrink-0 transition-transform duration-150"
          style={{
            color: NAVY,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          aria-hidden
        />
        <div className="flex-1 min-w-[200px]">
          <p className="text-[13.5px]" style={{ color: NAVY, fontWeight: 500, fontFamily: SERIF }}>
            {club.name}
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
        <span
          className="text-[11.5px] uppercase tracking-[0.12em]"
          style={{ color: MUTED }}
        >
          {expanded ? t(COPY.collapse) : t(COPY.expand)}
        </span>
      </button>

      {expanded && (
        <div
          id={panelId}
          className="px-4 pb-4 pt-1"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          {isLoadingSessions && (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
            </div>
          )}
          {!isLoadingSessions && sessions.length === 0 && (
            <p className="text-[12.5px] py-3" style={{ color: MUTED }}>
              {t(COPY.noSessionsForClub)}
            </p>
          )}
          {!isLoadingSessions && sessions.length > 0 && (
            <ul className="list-none m-0 p-0 flex flex-col gap-2 mt-3">
              {sessions.map((s) => (
                <SessionRow key={s.id} session={s} t={t} />
              ))}
            </ul>
          )}

          <div className="mt-3 flex">
            <button
              type="button"
              onClick={onOpenCockpit}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11.5px] uppercase tracking-[0.12em] font-medium ${FOCUS_RING_CLASS}`}
              style={{ color: NAVY, background: 'white', border: `1px solid ${CREAM2}` }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
              {t(COPY.cockpit)}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function SessionsTab({ editionId }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const clubsQ    = useClubsForEdition(editionId);
  const countsQ   = useCountsForEdition(editionId);
  const sessionsQ = useSessionsAdmin(editionId);

  const [expandedClub, setExpandedClub] = useState(null);

  const clubs = useMemo(() => {
    const rows = clubsQ.data || [];
    return rows.map((r) => ({
      id:   r.club?.id || r.club_id || r.id,
      name: r.club?.name || r.name || r.club_id || r.id,
    }));
  }, [clubsQ.data]);

  // Map club_id → { sessions, sessionsLive, sessionsPublished } (compteurs agrégés)
  const countsByClub = useMemo(() => {
    const map = new Map();
    for (const bucket of countsQ.data?.byClub || []) {
      const id = bucket.club?.id;
      if (id) map.set(id, bucket);
    }
    return map;
  }, [countsQ.data]);

  // Map club_id → [sessions] (détails pour les panels développés)
  const sessionsByClub = useMemo(() => {
    const map = new Map();
    for (const s of sessionsQ.data || []) {
      const cid = s.club_id;
      if (!cid) continue;
      const arr = map.get(cid) || [];
      arr.push(s);
      map.set(cid, arr);
    }
    // Tri stable par position puis nom.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const pa = a.position ?? 0;
        const pb = b.position ?? 0;
        if (pa !== pb) return pa - pb;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    return map;
  }, [sessionsQ.data]);

  // Navigation SPA — pas de window.location.href : un full reload casse la
  // session master_admin (le legacy gate kick l'utilisateur vers MonDossier).
  const gotoClubCockpit = (clubId) => {
    navigate(`/Admin?scope=club:${encodeURIComponent(clubId)}`);
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
            const bucket = countsByClub.get(c.id) || {};
            const total = bucket.sessions || 0;
            const live = bucket.sessionsLive || 0;
            const published = bucket.sessionsPublished || 0;
            const draft = Math.max(0, total - live - published);
            const expanded = expandedClub === c.id;
            return (
              <ClubRow
                key={c.id}
                club={c}
                sessions={sessionsByClub.get(c.id) || []}
                totals={{ total, draft, live, published }}
                isLoadingSessions={sessionsQ.isLoading}
                expanded={expanded}
                onToggle={() => setExpandedClub(expanded ? null : c.id)}
                onOpenCockpit={() => gotoClubCockpit(c.id)}
                t={t}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
