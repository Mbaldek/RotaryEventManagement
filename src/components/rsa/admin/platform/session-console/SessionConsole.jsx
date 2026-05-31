// SessionConsole — surface unique « administrer CETTE session », montée au bon
// niveau hiérarchique (scope='club' depuis le Club Cockpit, scope='competition'
// depuis la Compétition/Master).
//
// Sous-onglets : Vue/Édition · Jury · Startups · Live · Résultats · Emails.
// Réutilise les briques existantes (SessionJurorsList, LiveTab, ResultsTab) comme
// panneaux ; l'onglet Vue/Édition apporte l'édition/suppression manquantes.
//
// V1 livré : header + Vue/Édition (édition draft-only + suppression + cycle de vie)
// + Jury + Live + Résultats. Startups (checklist deck) et Emails (composer + copier-
// tout) arrivent dans l'incrément suivant — cf. docs/blueprints/session-admin-console.md §12.

import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Clock } from 'lucide-react';
import { CREAM2, NAVY, MUTED, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import CockpitTabs from '@/components/design/shell/CockpitTabs';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import SessionEditPanel from './SessionEditPanel';
import SessionJuryPanel from './SessionJuryPanel';
import SessionStartupsPanel from './SessionStartupsPanel';
import SessionEmailsPanel from './SessionEmailsPanel';
import ClubLiveTab from '../club/tabs/LiveTab';
import ClubResultsTab from '../club/tabs/ResultsTab';
import LegacyLiveTab from '../tabs/LiveTab';
import LegacyResultsTab from '../tabs/ResultsTab';

const COPY = {
  back:      { fr: 'Sessions', en: 'Sessions', de: 'Sessions' },
  tEdit:     { fr: 'Vue / Édition', en: 'Overview / Edit', de: 'Übersicht / Bearbeiten' },
  tJury:     { fr: 'Jury', en: 'Jury', de: 'Jury' },
  tStartups: { fr: 'Startups', en: 'Startups', de: 'Startups' },
  tLive:     { fr: 'Live', en: 'Live', de: 'Live' },
  tResults:  { fr: 'Résultats', en: 'Results', de: 'Ergebnisse' },
  tEmails:   { fr: 'Emails', en: 'Emails', de: 'E-Mails' },
  teamsLink: { fr: 'Lien Teams', en: 'Teams link', de: 'Teams-Link' },
  kindQual:  { fr: 'qualificative', en: 'qualifying', de: 'Qualifikation' },
  kindFinale:{ fr: 'finale', en: 'finale', de: 'Finale' },
  juryFed:   {
    fr: 'La composition du jury de la finale fédérée se gère au niveau Compétition.',
    en: 'Federated finale jury is managed at the Competition level.',
    de: 'Die Jury des föderierten Finales wird auf Wettbewerbsebene verwaltet.',
  },
  soon:      {
    fr: 'Cet onglet arrive dans le prochain incrément (checklist deck / composer emails). Cf. blueprint §12.',
    en: 'This tab ships in the next increment (deck checklist / email composer). See blueprint §12.',
    de: 'Dieser Reiter kommt im nächsten Inkrement (Deck-Checkliste / E-Mail-Composer). Siehe Blueprint §12.',
  },
};

const TAB_IDS = ['edit', 'jury', 'startups', 'live', 'results', 'emails'];

function Placeholder({ text }) {
  return (
    <div className="rounded-[4px] p-6 text-center" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
      <p className="text-[12.5px]" style={{ color: MUTED }}>{text}</p>
    </div>
  );
}

export default function SessionConsole({
  session,
  editionId,
  edition,
  clubId = null,
  scope = clubId ? 'club' : 'competition',
  sessions = [],
  onSelectSession,
  onClose,
}) {
  const { t } = useLang();
  const [tab, setTab] = useState('edit');

  if (!session) return null;

  const status = session.config?.status || 'draft';
  const ed = edition || { id: editionId };
  const start = session.config?.start_time;
  const end = session.config?.end_time;
  const kindLabel = session.kind === 'finale' ? t(COPY.kindFinale) : t(COPY.kindQual);

  const tabItems = TAB_IDS.map((id) => ({
    id,
    label: t({ edit: COPY.tEdit, jury: COPY.tJury, startups: COPY.tStartups, live: COPY.tLive, results: COPY.tResults, emails: COPY.tEmails }[id]),
  }));

  return (
    <section>
      {/* Back link */}
      <button
        type="button" onClick={onClose}
        className={`inline-flex items-center gap-1.5 text-[11.5px] mb-3 px-2 py-1 rounded-[4px] ${FOCUS_RING_CLASS}`}
        style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t(COPY.back)}
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className="text-[21px] flex-1 min-w-[220px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {session.name}
          </h2>
          <StatusPill status={status} kind="jury" />
        </div>
        <div className="flex items-center gap-3.5 flex-wrap mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
          {session.session_date && <span>{session.session_date}</span>}
          {(start || end) && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {start || '—'} → {end || '—'}
            </span>
          )}
          {session.config?.teams_link && (
            <a href={session.config.teams_link} target="_blank" rel="noreferrer noopener"
              className="inline-flex items-center gap-1" style={{ color: NAVY }}>
              <ExternalLink className="w-3.5 h-3.5" /> {t(COPY.teamsLink)}
            </a>
          )}
          <span>{kindLabel}{session.club_id ? ` · ${session.club_id}` : ''}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-[4px] px-3 md:px-4 pt-2 mb-4" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
        <CockpitTabs idPrefix="session-console" items={tabItems} active={tab} onChange={setTab} ariaLabel="Session console navigation" />
      </div>

      {/* Panel */}
      <div className="rounded-[4px] p-4 md:p-5" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
        {tab === 'edit' && (
          <SessionEditPanel session={session} onDeleted={onClose} />
        )}

        {tab === 'jury' && (
          clubId
            ? <SessionJuryPanel session={session} clubId={clubId} />
            : <Placeholder text={t(COPY.juryFed)} />
        )}

        {tab === 'startups' && <SessionStartupsPanel session={session} clubId={clubId} />}

        {tab === 'live' && (
          clubId
            ? <ClubLiveTab edition={ed} clubId={clubId} session={session} />
            : <LegacyLiveTab edition={ed} session={session} />
        )}

        {tab === 'results' && (
          clubId
            ? <ClubResultsTab edition={ed} clubId={clubId} session={session} sessions={sessions} onSelectSession={onSelectSession} />
            : <LegacyResultsTab edition={ed} session={session} sessions={sessions} onSelectSession={onSelectSession} />
        )}

        {tab === 'emails' && <SessionEmailsPanel session={session} clubId={clubId} />}
      </div>
    </section>
  );
}
