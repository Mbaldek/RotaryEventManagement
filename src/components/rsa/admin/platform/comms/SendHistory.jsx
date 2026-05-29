// SendHistory — historique des envois bulk (Module 9).
//
// Liste paginée (50/page côté serveur, on n'a pas de pagination cursor pour
// l'instant — la table reste petite : on multiplie les emails, pas les sends).
// Click sur une ligne → modale détails avec :
//   - body_html (markdown stocké tel quel — on rend en preview via EmailPreview)
//   - liste recipients (premiers 20)
//   - resend message IDs
//   - error_message si status != 'sent'

import React, { useState } from 'react';
import { Loader2, X, Eye, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { COMMS_HISTORY, COMMS_UI } from './i18n';
import { useEmailSends } from './useComms';
import EmailPreview from './EmailPreview';

function StatusPill({ status, t }) {
  const map = {
    sent:    { bg: '#ecf1e5', fg: '#1d6b4f', label: t(COMMS_HISTORY.statusSent),    Icon: CheckCircle2 },
    partial: { bg: '#f6efe0', fg: '#9a6b1f', label: t(COMMS_HISTORY.statusPartial), Icon: Clock },
    failed:  { bg: '#f6e7e3', fg: DANGER,    label: t(COMMS_HISTORY.statusFailed),  Icon: AlertTriangle },
  };
  const m = map[status] || map.sent;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.fg, border: `1px solid ${CREAM2}` }}
    >
      <m.Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function fmtDate(iso, lang) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function DetailsModal({ send, onClose, t, lang }) {
  if (!send) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(15,31,61,0.45)' }}
      onClick={onClose}
    >
      <div
        className="rounded-[4px] max-w-3xl w-full p-5 my-8"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {t(COMMS_HISTORY.detailsTitle)}
            </h4>
            <p className="text-[12.5px] mt-1" style={{ color: INK }}>{send.subject}</p>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
              {fmtDate(send.sent_at, lang)} · {send.audience_type} · {send.recipients_count} {t(COMMS_HISTORY.recipients).toLowerCase()}
            </p>
          </div>
          <StatusPill status={send.status} t={t} />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            <X className="w-3.5 h-3.5" /> {t(COMMS_UI.close)}
          </button>
        </div>

        {send.error_message && (
          <div
            className="rounded-[4px] p-3 mb-3 text-[12.5px]"
            style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}`, color: DANGER }}
          >
            <strong>{t(COMMS_HISTORY.errorMessage)} :</strong> {send.error_message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>
              {t(COMMS_HISTORY.recipientsList)}
            </p>
            <ul
              className="rounded-[4px] p-3 text-[11.5px] font-mono max-h-64 overflow-y-auto"
              style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}
            >
              {(send.recipients_emails || []).slice(0, 20).map((e) => (
                <li key={e}>· {e}</li>
              ))}
              {(send.recipients_emails || []).length > 20 && (
                <li style={{ color: MUTED }}>
                  + {send.recipients_emails.length - 20} …
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>
              {t(COMMS_HISTORY.messageIds)}
            </p>
            <ul
              className="rounded-[4px] p-3 text-[11.5px] font-mono max-h-64 overflow-y-auto"
              style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}
            >
              {(send.resend_message_ids || []).slice(0, 20).map((id) => (
                <li key={id}>· {id}</li>
              ))}
              {(send.resend_message_ids || []).length === 0 && (
                <li style={{ color: MUTED }}>—</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <p className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>
            {t(COMMS_HISTORY.bodyPreview)}
          </p>
          <div
            className="rounded-[4px] overflow-hidden"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, minHeight: 320 }}
          >
            {/* body_html stocké est déjà du HTML (rendu Élysée complet) — on l'embed
                dans une iframe sandboxée pour éviter tout leak de styles. */}
            <iframe
              title="Sent email body"
              srcDoc={send.body_html}
              sandbox=""
              className="w-full border-0"
              style={{ minHeight: 320, height: 320, background: '#faf7f2' }}
            />
          </div>
          {/* Fallback : si body_html ne ressemble pas à un document HTML complet
              (cas d'un template inséré tel quel avec juste du markdown), on offre
              un rendu Élysée live. Conservatively render the EmailPreview below
              only if no <html> tag detected. */}
          {!/<html/i.test(String(send.body_html || '')) && (
            <div className="mt-2">
              <p className="text-[10.5px]" style={{ color: MUTED }}>
                (rendu Élysée live)
              </p>
              <div
                className="rounded-[4px] mt-1 overflow-hidden"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, minHeight: 320 }}
              >
                <EmailPreview subject={send.subject} bodyMarkdown={send.body_html} lang="fr" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SendHistory({ clubId }) {
  const { t, lang } = useLang();
  const sendsQ = useEmailSends(clubId, 50);
  const [openId, setOpenId] = useState(null);

  const sends = sendsQ.data || [];
  const openSend = sends.find((s) => s.id === openId) || null;

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMMS_HISTORY.sectionTitle)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {sends.length}</span>
      </header>

      {sendsQ.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {sendsQ.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(COMMS_UI.loadError)}</p>
      )}

      {!sendsQ.isLoading && !sendsQ.isError && sends.length === 0 && (
        <div
          className="rounded-[4px] p-6 text-center"
          style={{ background: TINT_ADMIN, border: `1px dashed ${CREAM2}` }}
        >
          <p className="text-[13px]" style={{ color: INK }}>{t(COMMS_HISTORY.noSends)}</p>
        </div>
      )}

      {!sendsQ.isLoading && sends.length > 0 && (
        <ul className="divide-y rounded-[4px]" style={{ borderColor: CREAM2, background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
          {sends.map((s) => (
            <li
              key={s.id}
              className="px-4 py-3 flex items-start gap-3 flex-wrap hover:bg-[#fdf6e8] cursor-pointer transition-colors"
              onClick={() => setOpenId(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(s.id); }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] truncate" style={{ color: NAVY, fontWeight: 500 }}>
                  {s.subject}
                </p>
                <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>
                  {fmtDate(s.sent_at, lang)} · <span className="font-mono">{s.audience_type}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="inline-flex items-baseline gap-1 text-[12px]"
                  style={{ color: INK }}
                >
                  <strong className="tabular-nums">{s.recipients_count}</strong>
                  <span style={{ color: MUTED }}>{t(COMMS_HISTORY.recipients).toLowerCase()}</span>
                </span>
                <StatusPill status={s.status} t={t} />
                <Eye className="w-3.5 h-3.5" style={{ color: GOLD }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <DetailsModal send={openSend} onClose={() => setOpenId(null)} t={t} lang={lang} />
    </section>
  );
}
