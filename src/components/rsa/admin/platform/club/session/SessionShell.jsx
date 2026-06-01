// SessionShell — coquille « ouvrir une session » (Lot 1, socle de la session
// console #3). Header session + grille de 6 cartes : 3 deep-linkent vers
// l'existant (Jury / En direct / Résultats), 3 sont des stubs « bientôt » (#3).
//
// Rendu par ClubCockpit quand mode=pilotage ET ?session= défini ; remplace
// PilotageOverview dans le panel (montage in-place, pas de route séparée).

import React from 'react';
import { ArrowLeft, ArrowRight, Users, Activity, FileText, ClipboardList, Presentation, BookOpen, Trophy } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_SESSION_SHELL } from '../i18n';
import { useClubSessionMetrics } from '../useClub';
import SessionScoringAccess from './SessionScoringAccess';

function Card({ icon: Icon, title, line, action, soon, soonLabel }) {
  return (
    <div
      className="rounded-[4px] p-4 flex flex-col gap-2"
      style={{ background: soon ? TINT_ADMIN : 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: soon ? MUTED : GOLD }} aria-hidden />
        <span className="text-[13px] font-medium" style={{ color: NAVY }}>{title}</span>
        {soon && (
          <span
            className="ml-auto text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[3px]"
            style={{ color: MUTED, border: `1px solid ${CREAM2}` }}
          >
            {soonLabel}
          </span>
        )}
      </div>
      {line && <p className="text-[12px]" style={{ color: INK }}>{line}</p>}
      {action}
    </div>
  );
}

export default function SessionShell({ session, edition, clubId, onBack, onDeepLink, onOpenPanel }) {
  const { t } = useLang();
  const metricsQ = useClubSessionMetrics(edition?.id, clubId, session ? [session.id] : []);
  const m = metricsQ.data?.[session?.id];
  const startups = m ? m.startups : '—';
  const jurors = m ? m.jurors : '—';

  if (!session) return null;
  const cfg = session.config || {};
  const timeRange = cfg.start_time && cfg.end_time ? `${cfg.start_time}–${cfg.end_time}` : null;

  const linkBtn = (label, tab) => (
    <button
      type="button"
      onClick={() => onDeepLink?.(tab)}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] self-start ${FOCUS_RING_CLASS}`}
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
    >
      {label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
    </button>
  );

  const panelBtn = (label, panel) => (
    <button
      type="button"
      onClick={() => onOpenPanel?.(panel)}
      className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] self-start ${FOCUS_RING_CLASS}`}
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
    >
      {label} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
    </button>
  );

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(CLUB_SESSION_SHELL.back)}
      </button>

      {/* Header session */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {`${session.position ?? 0} · ${session.kind}`}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h3 className="text-[22px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {session.name}
        </h3>
        <StatusPill status={cfg.status || 'draft'} kind="jury" />
      </div>
      <p className="text-[12.5px] mb-5" style={{ color: MUTED }}>
        {session.theme && <span>{session.theme} · </span>}
        {session.session_date && <span>{session.session_date}</span>}
        {timeRange && <span> · {timeRange}</span>}
      </p>

      {/* Grille 6 cartes. Les cartes 'soon' montrent quand même le compteur réel
          (contexte utile) ; seul le drill-down détaillé est déféré au #3. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          icon={FileText}
          title={t(CLUB_SESSION_SHELL.cardStartups)}
          line={`${startups} ${t(CLUB_SESSION_SHELL.startupsInPlay)}`}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
        <Card
          icon={Users}
          title={t(CLUB_SESSION_SHELL.cardJury)}
          line={`${jurors} ${t(CLUB_SESSION_SHELL.jurorsAssigned)}`}
          action={linkBtn(t(CLUB_SESSION_SHELL.viewJury), 'team')}
        />
        <Card
          icon={Activity}
          title={t(CLUB_SESSION_SHELL.cardScoring)}
          action={linkBtn(t(CLUB_SESSION_SHELL.openLive), 'live')}
        />
        <Card
          icon={ClipboardList}
          title={t(CLUB_SESSION_SHELL.cardPrep)}
          line={t(CLUB_SESSION_SHELL.prepHint)}
          action={panelBtn(t(CLUB_SESSION_SHELL.cardPrep), 'order')}
        />
        <Card
          icon={Presentation}
          title={t(CLUB_SESSION_SHELL.cardPresentation)}
          line={t(CLUB_SESSION_SHELL.presentationHint)}
          action={panelBtn(t(CLUB_SESSION_SHELL.cardPresentation), 'deck')}
        />
        <Card
          icon={BookOpen}
          title={t(CLUB_SESSION_SHELL.cardPreread)}
          line={t(CLUB_SESSION_SHELL.prereadHint)}
          soon soonLabel={t(CLUB_SESSION_SHELL.soon)}
        />
      </div>

      {/* Accès scoring juré (lien + PIN) + poids des critères de la session */}
      <SessionScoringAccess sessionId={session.id} />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => onDeepLink?.('results')}
          className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <Trophy className="w-3.5 h-3.5" aria-hidden /> {t(CLUB_SESSION_SHELL.sessionResults)} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
