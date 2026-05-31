// SessionJuryPanel — onglet « Jury » de la SessionConsole.
//
// Deux sections :
//   1. Composition : réutilise SessionJurorsList (ajout/retrait de jurés).
//   2. Suivi : checklist par juré (invité ? confirmé ?) avec actions à la main
//      + envoi de masse « Inviter / relancer tous » (email session_jurys).
//
// Suivi minimal (cf. blueprint §12.2). Email via send-bulk audience session_jurys.

import React, { useState } from 'react';
import { Loader2, Mail, CheckCircle2, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { CREAM2, NAVY, GOLD, MUTED, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { sendBulk } from '@/lib/platform/bulk';
import SessionJurorsList from '../club/jury/SessionJurorsList';
import { useSessionJurors, useMarkJuryInvited, useSetJuryConfirmed } from '../club/jury/useJury';

const COPY = {
  tracking:  { fr: 'Suivi des invitations', en: 'Invitation tracking', de: 'Einladungs-Tracking' },
  previewJury:{ fr: 'Prévisualiser la page jury ↗', en: 'Preview jury page ↗', de: 'Jury-Seite ansehen ↗' },
  inviteAll: { fr: 'Inviter / relancer tous', en: 'Invite / remind all', de: 'Alle einladen / erinnern' },
  confirmed: { fr: 'confirmé', en: 'confirmed', de: 'bestätigt' },
  invited:   { fr: 'invité', en: 'invited', de: 'eingeladen' },
  notInvited:{ fr: 'non invité', en: 'not invited', de: 'nicht eingeladen' },
  markInvited:{ fr: 'Marquer invité', en: 'Mark invited', de: 'Als eingeladen' },
  toggleConf:{ fr: 'Confirmé', en: 'Confirmed', de: 'Bestätigt' },
  empty:     { fr: 'Aucun juré assigné.', en: 'No juror assigned.', de: 'Keine Jury zugewiesen.' },
  inviteSubj:{ fr: 'Invitation jury — {s}', en: 'Jury invitation — {s}', de: 'Jury-Einladung — {s}' },
  inviteBody:{
    fr: 'Bonjour,\n\nVous êtes invité·e comme juré·e pour la session {s}. Merci de confirmer votre présence.',
    en: 'Hello,\n\nYou are invited as a juror for session {s}. Please confirm your attendance.',
    de: 'Hallo,\n\nSie sind als Jury für die Session {s} eingeladen.',
  },
};

function displayName(row) {
  const p = row.profile || {};
  if (p.qualite) return p.qualite + (p.organisation ? ' · ' + p.organisation : '');
  return p.organisation || row.jury_user_id?.slice(0, 8) || '—';
}

function buildHtml(text) {
  const safe = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return `<div style="font-family:Inter,Arial,sans-serif;color:#3a3a52;line-height:1.6">${safe}</div>`;
}

export default function SessionJuryPanel({ session, clubId }) {
  const { t, lang } = useLang();
  const sessionId = session.id;
  const jurorsQ = useSessionJurors(sessionId);
  const markInvited = useMarkJuryInvited(sessionId);
  const setConfirmed = useSetJuryConfirmed(sessionId);
  const [bulkBusy, setBulkBusy] = useState(false);
  const rows = jurorsQ.data || [];

  async function inviteAll() {
    setBulkBusy(true);
    const subject = (COPY.inviteSubj[lang] || COPY.inviteSubj.fr).replace('{s}', session.name);
    const body = (COPY.inviteBody[lang] || COPY.inviteBody.fr).replace('{s}', session.name);
    const res = await sendBulk({
      clubId: clubId || null, audienceType: 'session_jurys', audienceFilter: { session_id: sessionId },
      subject, bodyHtml: buildHtml(body),
    });
    try {
      await markInvited.mutateAsync({ juryUserIds: rows.map((r) => r.jury_user_id) });
    } catch (_e) { /* non bloquant */ }
    setBulkBusy(false);
    if (res.ok && res.sent != null) toast.success(`${res.sent}/${res.total} ✓`);
    else toast.error(res.error || 'Erreur');
  }

  function statusChip(row) {
    if (row.confirmed_at) return { bg: '#ecf1e5', fg: '#1d6b4f', Icon: CheckCircle2, label: t(COPY.confirmed) };
    if (row.invited_at) return { bg: '#eff1f6', fg: NAVY, Icon: Mail, label: t(COPY.invited) };
    return { bg: '#f3eee6', fg: MUTED, Icon: Clock, label: t(COPY.notInvited) };
  }

  return (
    <section>
      {/* Composition (brique existante) */}
      <SessionJurorsList sessionId={sessionId} clubId={clubId} />

      {/* Suivi */}
      <div className="flex items-center gap-3 flex-wrap mt-5 mb-2">
        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: '#8a6f1f' }}>{t(COPY.tracking)}</span>
        <a href={`/JurySession?session=${encodeURIComponent(sessionId)}`} target="_blank" rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px]"
          style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
          {t(COPY.previewJury)}
        </a>
        <button type="button" onClick={inviteAll} disabled={bulkBusy || rows.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}>
          {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {t(COPY.inviteAll)}
        </button>
      </div>

      {jurorsQ.isLoading && <div className="py-3 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} /></div>}
      {!jurorsQ.isLoading && rows.length === 0 && <p className="text-[12px] py-2" style={{ color: MUTED }}>{t(COPY.empty)}</p>}

      {!jurorsQ.isLoading && rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const c = statusChip(r);
            const Icon = c.Icon;
            return (
              <li key={r.jury_user_id} className="flex items-center gap-3 flex-wrap rounded-[5px] px-3 py-2.5"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
                <span className="text-[13px] font-medium flex-1 min-w-[140px]" style={{ color: NAVY, fontFamily: SERIF }}>{displayName(r)}</span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-full"
                  style={{ background: c.bg, color: c.fg, border: `1px solid ${CREAM2}` }}>
                  <Icon className="w-3 h-3" /> {c.label}
                </span>
                {!r.invited_at && (
                  <button type="button" onClick={() => markInvited.mutate({ juryUserIds: [r.jury_user_id] })}
                    className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px]"
                    style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
                    <Mail className="w-3 h-3" style={{ color: GOLD }} /> {t(COPY.markInvited)}
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: NAVY }}>
                  <input type="checkbox" checked={!!r.confirmed_at}
                    onChange={(e) => setConfirmed.mutate({ juryUserId: r.jury_user_id, confirmed: e.target.checked })} />
                  {t(COPY.toggleConf)}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
