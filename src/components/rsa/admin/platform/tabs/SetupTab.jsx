// SetupTab — onglet « Configuration » du cockpit admin (Module 4a).
//
// Compose les 3 panneaux : EditionEditor (édition courante) + SessionsManager
// (sessions de l'édition) + RolesManager (provisionnement plateforme).
//
// `edition` et `sessions` sont fournis par AdminShell pour éviter les doubles fetch.

import React from 'react';
import { CREAM2, MUTED } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from '../i18n';
import EditionEditor from '../EditionEditor';
import SessionsManager from '../SessionsManager';
import RolesManager from '../RolesManager';

export default function SetupTab({ edition, sessions, isSessionsLoading, onSelectSession }) {
  const { t } = useLang();

  if (!edition) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(UI.loading)}</p>
      </div>
    );
  }

  return (
    <>
      <EditionEditor edition={edition} />
      <SessionsManager
        editionId={edition.id}
        sessions={sessions || []}
        isLoading={isSessionsLoading}
        onSelectSession={onSelectSession}
      />
      <RolesManager />
    </>
  );
}
