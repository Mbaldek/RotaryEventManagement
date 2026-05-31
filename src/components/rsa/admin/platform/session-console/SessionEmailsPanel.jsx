// SessionEmailsPanel — onglet « Emails » de la SessionConsole.
//
// Composer pré-scopé à la session : audience = session_candidates / session_jurys /
// session_all. 5 templates (information / relance / rappel / confirmation deck /
// résultats). Boutons « copier tout » (objet / corps / destinataires) pour l'envoi
// manuel en repli. Historique des envois (email_sends filtré sur la session).
//
// Réutilise l'infra Email Studio (send-bulk + rsa_resolve_audience). Aucune infra
// nouvelle. Suivi minimal (cf. blueprint §12.4).

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Send, Eye, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CREAM2, NAVY, GOLD, MUTED, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { sendBulk, resolveAudienceList } from '@/lib/platform/bulk';

const AUDIENCES = [
  { key: 'session_candidates', label: { fr: 'Candidats', en: 'Candidates', de: 'Kandidaten' } },
  { key: 'session_jurys',      label: { fr: 'Jurés', en: 'Jury', de: 'Jury' } },
  { key: 'session_all',        label: { fr: 'Les deux', en: 'Both', de: 'Beide' } },
];

const COPY = {
  audience:  { fr: 'Audience — pré-scopée à cette session', en: 'Audience — scoped to this session', de: 'Zielgruppe — auf diese Session' },
  template:  { fr: 'Template', en: 'Template', de: 'Vorlage' },
  subject:   { fr: 'Objet', en: 'Subject', de: 'Betreff' },
  body:      { fr: 'Corps', en: 'Body', de: 'Inhalt' },
  copySubj:  { fr: 'Copier l’objet', en: 'Copy subject', de: 'Betreff kopieren' },
  copyBody:  { fr: 'Copier le corps', en: 'Copy body', de: 'Inhalt kopieren' },
  copyDest:  { fr: 'Copier les destinataires', en: 'Copy recipients', de: 'Empfänger kopieren' },
  preview:   { fr: 'Aperçu envoi (dry-run)', en: 'Preview (dry-run)', de: 'Vorschau (Probelauf)' },
  send:      { fr: 'Envoyer', en: 'Send', de: 'Senden' },
  history:   { fr: 'Historique des envois (suivi minimal)', en: 'Send history (minimal tracking)', de: 'Sendeverlauf (minimal)' },
  noHistory: { fr: 'Aucun envoi pour cette session.', en: 'No send for this session yet.', de: 'Noch keine Sendung.' },
  manual:    { fr: 'repli : envoi manuel depuis votre messagerie', en: 'fallback: manual send from your mail client', de: 'Fallback: manueller Versand' },
  recipients:{ fr: 'destinataires', en: 'recipients', de: 'Empfänger' },
};

const TEMPLATES = {
  info:    { aud: 'session_all',        subject: { fr: 'Information — {s}', en: 'Information — {s}', de: 'Information — {s}' },
             body: { fr: 'Bonjour,\n\nVotre session {s} est programmée. Voici les informations pratiques (date, horaire, lien Teams).', en: 'Hello,\n\nYour session {s} is scheduled. Here are the practical details.', de: 'Hallo,\n\nIhre Session {s} ist geplant.' } },
  relance: { aud: 'session_candidates', subject: { fr: 'Votre dossier est incomplet', en: 'Your application is incomplete', de: 'Ihre Bewerbung ist unvollständig' },
             body: { fr: 'Bonjour,\n\nIl manque des éléments à votre dossier pour la session {s}. Merci de le compléter au plus vite.', en: 'Hello,\n\nSome items are missing from your application for {s}.', de: 'Hallo,\n\nEs fehlen Angaben in Ihrer Bewerbung für {s}.' } },
  rappel:  { aud: 'session_all',        subject: { fr: 'Rappel — session {s}', en: 'Reminder — {s}', de: 'Erinnerung — {s}' },
             body: { fr: 'Bonjour,\n\nPetit rappel : la session {s} approche. Lien Teams et déroulé en pièce jointe.', en: 'Hello,\n\nReminder: session {s} is approaching.', de: 'Hallo,\n\nErinnerung: Session {s} steht bevor.' } },
  deck:    { aud: 'session_candidates', subject: { fr: 'Confirmez votre pitch deck — {s}', en: 'Confirm your pitch deck — {s}', de: 'Bestätigen Sie Ihr Pitch-Deck — {s}' },
             body: { fr: 'Bonjour,\n\nMerci de confirmer le deck que vous présenterez pour {s} (garder celui d’inscription ou en charger un spécifique). Voir l’onglet Startups pour l’envoi à token individuel.', en: 'Hello,\n\nPlease confirm the deck you will present for {s}.', de: 'Hallo,\n\nBitte bestätigen Sie Ihr Deck für {s}.' } },
  results: { aud: 'session_all',        subject: { fr: 'Résultats — session {s}', en: 'Results — {s}', de: 'Ergebnisse — {s}' },
             body: { fr: 'Bonjour,\n\nLes résultats de la session {s} sont publiés. Merci à toutes et tous.', en: 'Hello,\n\nResults for session {s} are published.', de: 'Hallo,\n\nDie Ergebnisse für {s} sind veröffentlicht.' } },
};
const TEMPLATE_ORDER = ['info', 'relance', 'rappel', 'deck', 'results'];
const TEMPLATE_LABEL = {
  info: { fr: '1 · Information', en: '1 · Information', de: '1 · Information' },
  relance: { fr: '2 · Relance', en: '2 · Reminder', de: '2 · Nachfassen' },
  rappel: { fr: '3 · Rappel', en: '3 · Reminder', de: '3 · Erinnerung' },
  deck: { fr: '4 · Confirmer le deck', en: '4 · Confirm deck', de: '4 · Deck bestätigen' },
  results: { fr: '5 · Résultats', en: '5 · Results', de: '5 · Ergebnisse' },
};

function buildHtml(text) {
  const safe = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return `<div style="font-family:Inter,Arial,sans-serif;color:#3a3a52;line-height:1.6">${safe}</div>`;
}

export default function SessionEmailsPanel({ session, clubId }) {
  const { t, lang } = useLang();
  const sessionId = session.id;
  const fill = (obj) => (obj[lang] || obj.fr || '').replace(/\{s\}/g, session.name);

  const [audience, setAudience] = useState('session_all');
  const [tpl, setTpl] = useState('rappel');
  const [subject, setSubject] = useState(fill(TEMPLATES.rappel.subject));
  const [body, setBody] = useState(fill(TEMPLATES.rappel.body));
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(null);

  function applyTemplate(key) {
    setTpl(key);
    setAudience(TEMPLATES[key].aud);
    setSubject(fill(TEMPLATES[key].subject));
    setBody(fill(TEMPLATES[key].body));
  }

  // Liste des destinataires de l'audience courante (compte + copier-tout).
  const recipientsQ = useQuery({
    queryKey: ['rsa', 'session-console', 'audience', sessionId, audience],
    queryFn: () => resolveAudienceList({ audienceType: audience, audienceFilter: { session_id: sessionId } }),
    enabled: !!sessionId,
    staleTime: 20 * 1000,
  });
  const recipients = recipientsQ.data?.ok ? recipientsQ.data.emails : [];

  const historyQ = useQuery({
    queryKey: ['rsa', 'session-console', 'sends', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sends')
        .select('id, subject, sent_at, recipients_count, status, audience_type, audience_filter')
        .filter('audience_filter->>session_id', 'eq', sessionId)
        .order('sent_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 20 * 1000,
  });

  async function copy(kind, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copie impossible');
    }
  }

  async function onPreview() {
    const res = await sendBulk({
      clubId: clubId || null, audienceType: audience, audienceFilter: { session_id: sessionId },
      subject, bodyHtml: buildHtml(body), dryRun: true,
    });
    if (res.ok && res.dry_run) toast.success(`${res.count} ${t(COPY.recipients)}`);
    else toast.error(res.error || 'Erreur');
  }

  async function onSend() {
    setSending(true);
    const res = await sendBulk({
      clubId: clubId || null, audienceType: audience, audienceFilter: { session_id: sessionId },
      subject, bodyHtml: buildHtml(body),
    });
    setSending(false);
    if (res.ok && res.sent != null) {
      toast.success(`${res.sent}/${res.total} ✓`);
      historyQ.refetch();
    } else {
      toast.error(res.error || 'Erreur');
    }
  }

  const CopyBtn = ({ k, value, label }) => (
    <button type="button" onClick={() => copy(k, value)}
      className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-[4px]"
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
      {copied === k ? <Check className="w-3.5 h-3.5" style={{ color: '#1d6b4f' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: GOLD }} />} {label}
    </button>
  );

  return (
    <section>
      {/* Audience */}
      <p className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-2" style={{ color: '#8a6f1f' }}>{t(COPY.audience)}</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {AUDIENCES.map((a) => {
          const on = audience === a.key;
          const count = on ? recipients.length : null;
          return (
            <button key={a.key} type="button" onClick={() => setAudience(a.key)}
              className="inline-flex items-center gap-2 text-[12.5px] px-3.5 py-1.5 rounded-full"
              style={on
                ? { background: '#fdf6e8', color: '#8a6f1f', border: `1px solid ${GOLD}` }
                : { background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}>
              {a.label[lang] || a.label.fr}
              {on && <span className="text-[11px]" style={{ color: MUTED }}>· {recipientsQ.isFetching ? '…' : count}</span>}
            </button>
          );
        })}
      </div>

      {/* Template */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <p className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: '#8a6f1f' }}>{t(COPY.template)}</p>
        <select value={tpl} onChange={(e) => applyTemplate(e.target.value)}
          className="text-[12.5px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}>
          {TEMPLATE_ORDER.map((k) => <option key={k} value={k}>{TEMPLATE_LABEL[k][lang] || TEMPLATE_LABEL[k].fr}</option>)}
        </select>
      </div>

      {/* Copier tout */}
      <div className="flex gap-2 flex-wrap items-center mb-3">
        <CopyBtn k="subj" value={subject} label={t(COPY.copySubj)} />
        <CopyBtn k="body" value={body} label={t(COPY.copyBody)} />
        <CopyBtn k="dest" value={recipients.join(', ')} label={`${t(COPY.copyDest)} (${recipients.length})`} />
        <span className="text-[11px]" style={{ color: MUTED }}>{t(COPY.manual)}</span>
      </div>

      {/* Composer */}
      <label className="block mb-3">
        <span className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>{t(COPY.subject)}</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>
      <label className="block mb-4">
        <span className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>{t(COPY.body)}</span>
        <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>

      <div className="flex gap-2.5 justify-end mb-6">
        <button type="button" onClick={onPreview}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
          style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
          <Eye className="w-3.5 h-3.5" /> {t(COPY.preview)}
        </button>
        <button type="button" onClick={onSend} disabled={sending || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}>
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {t(COPY.send)} {recipients.length ? `→ ${recipients.length}` : ''}
        </button>
      </div>

      {/* Historique */}
      <p className="text-[11px] uppercase tracking-[0.16em] font-semibold mb-2" style={{ color: '#8a6f1f' }}>{t(COPY.history)}</p>
      {historyQ.isLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />}
      {!historyQ.isLoading && (historyQ.data || []).length === 0 && (
        <p className="text-[12px]" style={{ color: MUTED }}>{t(COPY.noHistory)}</p>
      )}
      {!historyQ.isLoading && (historyQ.data || []).length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {(historyQ.data || []).map((h) => (
            <li key={h.id} className="flex items-center gap-3 flex-wrap rounded-[4px] px-3 py-2"
              style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-full"
                style={{ background: h.status === 'sent' ? '#ecf1e5' : '#f6e7e3', color: h.status === 'sent' ? '#1d6b4f' : '#a23b2d', border: `1px solid ${CREAM2}` }}>
                {h.status}
              </span>
              <span className="text-[12.5px] flex-1 min-w-[140px]" style={{ color: NAVY }}>{h.subject}</span>
              <span className="text-[11.5px]" style={{ color: MUTED }}>
                {String(h.sent_at).slice(0, 10)} · {h.recipients_count} {t(COPY.recipients)} · {h.audience_type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
