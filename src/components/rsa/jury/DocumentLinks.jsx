// DocumentLinks (jury) — signed-URL list pour deck + exec summary d'un dossier.
//
// Mirroir restylé du composant de la sélection ; même contrat (startup row -> deux
// liens). On expose un mode `compact` (utilisé par ScoringPanel pour une rangée minimaliste)
// et un mode complet (utilisé par PreSessionPack pour la pré-lecture).

import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { NAVY, MUTED, GOLD, CREAM2 } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { signedDossierUrls } from '@/lib/rsa/storage';

const LABELS = {
  deck: { fr: 'Pitch deck', en: 'Pitch deck', de: 'Pitch-Deck' },
  exec: { fr: 'Exec summary', en: 'Exec summary', de: 'Exec Summary' },
  notProvided: { fr: 'Non fourni', en: 'Not provided', de: 'Nicht vorhanden' },
  download: { fr: 'Télécharger', en: 'Download', de: 'Herunterladen' },
};

function fileNameFromPath(path) {
  if (!path) return '';
  const tail = String(path).split('/').pop() || path;
  return tail.replace(/^\d{10,}_/, '');
}

function DocRow({ label, path, url, fallback, downloadLabel, compact }) {
  if (!path) {
    return (
      <li
        className={`flex items-center gap-3 rounded-[4px] ${compact ? 'px-2.5 py-1.5' : 'p-3'}`}
        style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
      >
        <FileText className="w-4 h-4 shrink-0" style={{ color: MUTED }} aria-hidden />
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.1em]"
            style={{ color: MUTED }}
          >
            {label}
          </div>
          <div className="text-[12px]" style={{ color: MUTED }}>
            {fallback}
          </div>
        </div>
      </li>
    );
  }
  return (
    <li
      className={`flex items-center gap-3 rounded-[4px] ${compact ? 'px-2.5 py-1.5' : 'p-3'}`}
      style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
    >
      <FileText className="w-4 h-4 shrink-0" style={{ color: GOLD }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] uppercase tracking-[0.1em]"
          style={{ color: MUTED }}
        >
          {label}
        </div>
        <div className="text-[12px] truncate" style={{ color: NAVY }}>
          {fileNameFromPath(path)}
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          <Download className="w-3 h-3" aria-hidden /> {downloadLabel}
        </a>
      )}
    </li>
  );
}

export default function DocumentLinks({ startup, compact = false, externalUrls }) {
  const { t } = useLang();
  const [selfUrls, setSelfUrls] = useState({});

  const deckPath = startup?.pitch_deck_path || null;
  const execPath = startup?.exec_summary_path || null;

  // Si le parent fournit des URLs déjà signées (page publique /Score, via l'edge
  // score-docs gardée slug+PIN), on les utilise et on NE signe PAS soi-même — le
  // client anon n'a pas accès au bucket privé `dossiers`. Sinon (espace jury
  // authentifié), on signe à la demande comme avant.
  const usingExternal = externalUrls !== undefined;

  useEffect(() => {
    if (usingExternal) return undefined;
    let active = true;
    const paths = [deckPath, execPath].filter(Boolean);
    if (paths.length === 0) {
      setSelfUrls({});
      return undefined;
    }
    signedDossierUrls(paths, 300)
      .then((map) => {
        if (active) setSelfUrls(map || {});
      })
      .catch(() => {
        if (active) setSelfUrls({});
      });
    return () => {
      active = false;
    };
  }, [deckPath, execPath, usingExternal]);

  const urls = usingExternal ? (externalUrls || {}) : selfUrls;

  return (
    <ul className="flex flex-col gap-1.5 list-none m-0 p-0">
      <DocRow
        label={t(LABELS.deck)}
        path={deckPath}
        url={deckPath ? urls[deckPath] : null}
        fallback={t(LABELS.notProvided)}
        downloadLabel={t(LABELS.download)}
        compact={compact}
      />
      <DocRow
        label={t(LABELS.exec)}
        path={execPath}
        url={execPath ? urls[execPath] : null}
        fallback={t(LABELS.notProvided)}
        downloadLabel={t(LABELS.download)}
        compact={compact}
      />
    </ul>
  );
}

export { fileNameFromPath };
