// DocumentLinks — pitch deck + executive summary signed download links.
// Pre-fetches signed URLs lazily on mount with a 300s TTL (storage.js default).

import React, { useEffect, useState } from 'react';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { NAVY, MUTED, GOLD, CREAM2 } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { signedDossierUrls } from '@/lib/rsa/storage';
import { UI } from './i18n';

function fileNameFromPath(path) {
  if (!path) return '';
  const tail = String(path).split('/').pop() || path;
  // Strip the leading timestamp_ prefix introduced by buildDossierPath().
  return tail.replace(/^\d{10,}_/, '');
}

function DocRow({ label, path, url, fallback, downloadLabel }) {
  if (!path) {
    return (
      <li
        className="flex items-center gap-3 rounded-[4px] p-3"
        style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
      >
        <FileText className="w-5 h-5 shrink-0" style={{ color: MUTED }} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
            {label}
          </div>
          <div className="text-[13px]" style={{ color: MUTED }}>
            {fallback}
          </div>
        </div>
      </li>
    );
  }
  return (
    <li
      className="flex items-center gap-3 rounded-[4px] p-3"
      style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
    >
      <FileText className="w-5 h-5 shrink-0" style={{ color: GOLD }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
          {label}
        </div>
        <div className="text-[13px] truncate" style={{ color: NAVY }}>
          {fileNameFromPath(path)}
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          <Download className="w-3.5 h-3.5" aria-hidden />
          {downloadLabel}
        </a>
      )}
    </li>
  );
}

export default function DocumentLinks({ startup }) {
  const { t } = useLang();
  const [urls, setUrls] = useState({});

  const deckPath = startup?.pitch_deck_path || null;
  const execPath = startup?.exec_summary_path || null;
  const videoUrl = startup?.video_pitch_url || null;

  useEffect(() => {
    let active = true;
    const paths = [deckPath, execPath].filter(Boolean);
    if (paths.length === 0) {
      setUrls({});
      return undefined;
    }
    signedDossierUrls(paths, 300)
      .then((map) => {
        if (active) setUrls(map || {});
      })
      .catch(() => {
        if (active) setUrls({});
      });
    return () => {
      active = false;
    };
  }, [deckPath, execPath]);

  return (
    <ul className="flex flex-col gap-2 list-none m-0 p-0">
      <DocRow
        label={t(UI.deckLabel)}
        path={deckPath}
        url={deckPath ? urls[deckPath] : null}
        fallback={t(UI.noDocs)}
        downloadLabel={t(UI.download)}
      />
      <DocRow
        label={t(UI.execLabel)}
        path={execPath}
        url={execPath ? urls[execPath] : null}
        fallback={t(UI.noDocs)}
        downloadLabel={t(UI.download)}
      />
      {videoUrl && (
        <li
          className="flex items-center gap-3 rounded-[4px] p-3"
          style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
        >
          <ExternalLink className="w-5 h-5 shrink-0" style={{ color: GOLD }} aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
              {t(UI.videoLabel)}
            </div>
            <div className="text-[13px] truncate" style={{ color: NAVY }}>
              {videoUrl}
            </div>
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
          >
            {t(UI.openExternal)}
          </a>
        </li>
      )}
    </ul>
  );
}

export { fileNameFromPath };
