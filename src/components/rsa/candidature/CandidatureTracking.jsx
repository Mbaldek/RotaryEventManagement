// CandidatureTracking — vue de suivi post-soumission (blueprint §7). Affichée quand
// le dossier est 'soumis' ou plus avancé. Mise en page éditoriale (Élysée), pas un
// dashboard : en-tête (nom + pill de statut + édition), frise de statut, session
// affectée (si session_id), récap d'éligibilité figé, documents (liens signés),
// et bouton « Modifier mon dossier » tant que la deadline n'est pas passée.

import React, { useEffect, useState } from 'react';
import { Download, FileText, Lock, Calendar } from 'lucide-react';
import { NAVY, INK, GOLD, MUTED, CREAM2, SERIF, StatusPill } from '@/components/design';
import { TINT_DANGER, DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_BY_ID, getSessionLabel, getSessionDate } from '@/lib/rsa/constants';
import { signedDossierUrls } from '@/lib/rsa/storage';
import { STATUS_LABELS, STATUS_PILL, TRACKING } from './i18n';
import StatusTimeline from './StatusTimeline';
import EligibilityPreview from './EligibilityPreview';
import { fileNameFromPath } from './DocumentDropzone';
import { formatDate } from './validation';

function Card({ title, children }) {
  return (
    <section className="rounded-[4px] bg-white p-5 mb-4" style={{ border: `1px solid ${CREAM2}` }}>
      {title && (
        <div className="text-[10px] uppercase tracking-[0.14em] font-medium mb-3" style={{ color: MUTED }}>
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

export default function CandidatureTracking({ startup, edition, canEdit, onEdit }) {
  const { t, lang } = useLang();
  const [docUrls, setDocUrls] = useState({});

  const paths = [startup?.pitch_deck_path, startup?.exec_summary_path].filter(Boolean);

  useEffect(() => {
    let active = true;
    if (paths.length === 0) {
      setDocUrls({});
      return undefined;
    }
    signedDossierUrls(paths, 120)
      .then((map) => {
        if (active) setDocUrls(map || {});
      })
      .catch(() => {
        if (active) setDocUrls({});
      });
    return () => {
      active = false;
    };
  }, [startup?.pitch_deck_path, startup?.exec_summary_path]);

  const status = startup?.status || 'soumis';
  const session = startup?.session_id ? SESSION_BY_ID[startup.session_id] : null;
  const closeDate = formatDate(edition?.application_close, lang);
  const elig = startup?.eligibility && Object.keys(startup.eligibility).length ? startup.eligibility : null;

  const docList = [
    { key: 'pitch_deck_path', label: t(TRACKING.deckLabel), path: startup?.pitch_deck_path },
    { key: 'exec_summary_path', label: t(TRACKING.execLabel), path: startup?.exec_summary_path },
  ].filter((d) => d.path);

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {t(TRACKING.eyebrow)}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <h1 className="text-[32px] leading-tight" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {startup?.name || '—'}
        </h1>
        <div className="pt-2">
          <StatusPill kind="dossier" status={STATUS_PILL[status] || 'submitted'} label={t(STATUS_LABELS[status])} size="md" />
        </div>
      </div>
      <p className="text-[14px] mb-6" style={{ color: INK }}>
        {edition?.name}
        {startup?.submitted_at && (
          <>
            {' · '}
            {t(TRACKING.submittedOn)} <strong style={{ color: NAVY }}>{formatDate(startup.submitted_at, lang)}</strong>
          </>
        )}
      </p>

      {/* Branche « non retenu » */}
      {status === 'rejete' && (
        <div className="flex items-start gap-2 rounded-[4px] p-3 mb-4" style={{ background: TINT_DANGER }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: DANGER }} aria-hidden />
          <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
            {t(TRACKING.rejectedNotice)}
          </p>
        </div>
      )}

      {/* Frise de statut */}
      <Card title={t(TRACKING.timelineTitle)}>
        <StatusTimeline status={status} />
      </Card>

      {/* Session affectée */}
      {session && (
        <Card title={t(TRACKING.sessionTitle)}>
          <div className="rounded-[4px] p-4" style={{ background: session.light, border: `1px solid ${session.border}` }}>
            <div className="text-[15px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 600 }}>
              <span aria-hidden>{session.emoji} </span>
              {getSessionLabel(session, lang)}
            </div>
            {getSessionDate(session, lang) && (
              <div className="flex items-center gap-1.5 text-[13px]" style={{ color: session.color }}>
                <Calendar className="w-3.5 h-3.5" aria-hidden />
                {getSessionDate(session, lang)}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Documents */}
      <Card title={t(TRACKING.docsTitle)}>
        {docList.length === 0 ? (
          <p className="text-[14px]" style={{ color: MUTED }}>
            {t(TRACKING.noDocs)}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {docList.map((d) => {
              const url = docUrls[d.path];
              return (
                <li
                  key={d.key}
                  className="flex items-center gap-3 rounded-[4px] p-3"
                  style={{ background: '#fbf9f5', border: `1px solid ${CREAM2}` }}
                >
                  <FileText className="w-5 h-5 shrink-0" style={{ color: GOLD }} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                      {d.label}
                    </div>
                    <div className="text-[13px] truncate" style={{ color: NAVY }}>
                      {fileNameFromPath(d.path)}
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
                      {t(TRACKING.download)}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Récap d'éligibilité (snapshot figé à la soumission) */}
      {elig && (
        <Card title={t(TRACKING.eligibilityTitle)}>
          <EligibilityPreview startup={startup} rules={edition?.eligibility_rules && Object.keys(edition.eligibility_rules).length ? edition.eligibility_rules : undefined} compact />
        </Card>
      )}

      {/* Modifier / verrou deadline */}
      {canEdit ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-[14px] font-medium px-5 py-2.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1.5px solid ${GOLD}` }}
          >
            {t(TRACKING.editCta)}
          </button>
          {closeDate && (
            <p className="text-[12px] mt-2" style={{ color: MUTED }}>
              {t(TRACKING.editableUntil).replace('{date}', closeDate)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 text-[13px] mt-2" style={{ color: MUTED }}>
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <span style={{ color: INK }}>{t(TRACKING.lockedNotice).replace('{date}', closeDate || '—')}</span>
        </div>
      )}
    </div>
  );
}
