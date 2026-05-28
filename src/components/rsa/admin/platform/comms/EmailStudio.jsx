// EmailStudio — shell du Module 9 (sous-cockpit "Communications").
//
// Trois onglets internes : Composer / Templates / Historique.
// - URL state via useSearchParams (?commsTab=composer|templates|history) pour
//   permettre les deep-links et le partage en interne.
// - Le composer reçoit éventuellement un `initialDraft` quand l'utilisateur
//   clique sur "Insérer dans le composer" depuis la TemplatesLibrary —
//   transition automatique vers l'onglet composer.
// - Prop `clubId` : NULL pour la vue master, le club courant pour la vue club.
//
// Pas de garde de rôle : l'orchestrateur (qui le wire dans MasterCockpit ou
// ClubCockpit) a déjà filtré selon isMasterAdmin / club_admin du club.

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CREAM2, NAVY, INK, GOLD, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { COMMS_TABS, COMMS_TAB_IDS, COMMS_UI } from './i18n';
import EmailComposer from './EmailComposer';
import TemplatesLibrary from './TemplatesLibrary';
import SendHistory from './SendHistory';

function Tab({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors"
      style={{
        background: active ? NAVY : 'white',
        color: active ? 'white' : INK,
        border: `1px solid ${active ? NAVY : CREAM2}`,
      }}
      aria-pressed={active}
      aria-controls={`comms-panel-${id}`}
    >
      {label}
    </button>
  );
}

export default function EmailStudio({ clubId = null, edition = null }) {
  const editionId = edition?.id || null;

  const { t } = useLang();
  const [params, setParams] = useSearchParams();

  // URL state : ?commsTab=composer|templates|history
  const tab = (params.get('commsTab') && COMMS_TAB_IDS.includes(params.get('commsTab')))
    ? params.get('commsTab')
    : 'composer';

  const setTab = (next) => {
    const p = new URLSearchParams(params);
    p.set('commsTab', next);
    setParams(p, { replace: true });
  };

  // Draft remonté depuis TemplatesLibrary → consommé par EmailComposer.
  // Bumped via Date.now() pour forcer le re-mount du composer (useEffect sur
  // `initialDraft` ne re-trigger pas si l'objet est ref-equal).
  const [insertedDraft, setInsertedDraft] = useState(null);

  function onInsertTemplate(draft) {
    setInsertedDraft({ ...draft, _key: Date.now() });
    setTab('composer');
  }

  return (
    <section>
      {/* Header éditorial */}
      <header className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(COMMS_UI.eyebrow)}
          </span>
        </div>
        <h2
          className="text-[22px] leading-tight mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMS_UI.titleLead)} <em>{t(COMMS_UI.titleItalic)}</em>
        </h2>
        <p className="text-[13px] max-w-2xl" style={{ color: INK }}>
          {t(COMMS_UI.subtitle)}
        </p>
      </header>

      {/* Tabs pill */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5" role="tablist">
        {COMMS_TAB_IDS.map((id) => (
          <Tab
            key={id}
            id={id}
            active={tab === id}
            label={t(COMMS_TABS[id])}
            onClick={() => setTab(id)}
          />
        ))}
      </div>

      <div id={`comms-panel-${tab}`} role="tabpanel">
        {tab === 'composer' && (
          <EmailComposer
            key={insertedDraft?._key || 'fresh'}
            clubId={clubId}
            editionId={editionId}
            initialDraft={insertedDraft}
          />
        )}
        {tab === 'templates' && (
          <TemplatesLibrary clubId={clubId} onInsertTemplate={onInsertTemplate} />
        )}
        {tab === 'history' && (
          <SendHistory clubId={clubId} />
        )}
      </div>
    </section>
  );
}
