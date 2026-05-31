// SessionStartupsPanel — onglet « Startups » de la SessionConsole.
//
// Checklist par dossier affecté à la session :
//   statut deck (rien / instructions envoyées / confirmé inscription / deck session chargé)
//   + action par ligne « Envoyer / relancer la confirmation deck » (email à token)
//   + action de masse « Envoyer aux non-confirmés ».
//
// L'email transactionnel passe par l'edge function send-bulk (audience single_email)
// et embarque le lien /confirm-deck?token=<deck_confirm_token>. À l'envoi, on marque
// deck_instructions_sent_at via rsa_mark_deck_instructions_sent.
//
// Suivi minimal/à la main (cf. blueprint §12) : pas d'ouverture/rebond.

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, FileText, CheckCircle2, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { sendBulk } from '@/lib/platform/bulk';

const COPY = {
  title:    { fr: 'Dossiers affectés — checklist deck', en: 'Attached startups — deck checklist', de: 'Zugeordnete Startups — Deck-Checkliste' },
  sendAll:  { fr: 'Envoyer la confirmation aux non-confirmés', en: 'Send confirmation to unconfirmed', de: 'Bestätigung an Unbestätigte senden' },
  empty:    { fr: 'Aucun dossier affecté à cette session.', en: 'No startup attached to this session.', de: 'Keine Startups dieser Session zugeordnet.' },
  cKept:    { fr: 'garde deck d’inscription', en: 'keeps application deck', de: 'behält Bewerbungs-Deck' },
  cUploaded:{ fr: 'deck session chargé', en: 'session deck uploaded', de: 'Session-Deck hochgeladen' },
  cSent:    { fr: 'instructions envoyées', en: 'instructions sent', de: 'Anweisungen gesendet' },
  cNone:    { fr: 'rien envoyé', en: 'nothing sent', de: 'nichts gesendet' },
  send:     { fr: 'Envoyer la confirmation', en: 'Send confirmation', de: 'Bestätigung senden' },
  resend:   { fr: 'Relancer', en: 'Resend', de: 'Erneut senden' },
  viewDeck: { fr: 'Voir deck', en: 'View deck', de: 'Deck ansehen' },
  noEmail:  { fr: 'pas d’email', en: 'no email', de: 'keine E-Mail' },
  legend:   {
    fr: 'Le form à token laisse la startup garder son deck d’inscription (1 clic) ou charger un deck spécifique session, ensuite visible par le jury.',
    en: 'The token form lets the startup keep its application deck (1 click) or upload a session-specific deck, then visible to the jury.',
    de: 'Das Token-Formular lässt das Startup sein Bewerbungs-Deck behalten (1 Klick) oder ein sessionspezifisches Deck hochladen.',
  },
  subject:  { fr: 'Confirmez votre pitch deck', en: 'Confirm your pitch deck', de: 'Bestätigen Sie Ihr Pitch-Deck' },
};

function deckUrl(path) {
  if (!path) return null;
  try {
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function statusOf(s) {
  if (s.deck_confirmed_at) return s.session_deck_path ? 'uploaded' : 'kept';
  if (s.deck_instructions_sent_at) return 'sent';
  return 'none';
}

function Chip({ kind, label }) {
  const palette = {
    uploaded: { bg: '#ecf1e5', fg: '#1d6b4f' },
    kept:     { bg: '#ecf1e5', fg: '#1d6b4f' },
    sent:     { bg: '#eff1f6', fg: NAVY },
    none:     { bg: '#f3eee6', fg: MUTED },
  }[kind] || { bg: TINT_ADMIN, fg: MUTED };
  const Icon = kind === 'none' ? Clock : (kind === 'sent' ? Mail : CheckCircle2);
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-full"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${CREAM2}` }}>
      <Icon className="w-3 h-3" aria-hidden /> {label}
    </span>
  );
}

function confirmEmailHtml({ name, sessionName, link, lang }) {
  const intro = {
    fr: `Bonjour ${name || ''},<br><br>Pour la session <strong>${sessionName}</strong>, merci de confirmer le pitch deck que vous présenterez : garder celui de votre dossier d'inscription, ou en charger un spécifique à la session.`,
    en: `Hello ${name || ''},<br><br>For the <strong>${sessionName}</strong> session, please confirm the pitch deck you will present: keep your application deck, or upload a session-specific one.`,
    de: `Hallo ${name || ''},<br><br>Bitte bestätigen Sie für die Session <strong>${sessionName}</strong> Ihr Pitch-Deck.`,
  }[lang] || '';
  const cta = { fr: 'Confirmer mon deck', en: 'Confirm my deck', de: 'Deck bestätigen' }[lang] || 'Confirm';
  return `<div style="font-family:Inter,Arial,sans-serif;color:#3a3a52;line-height:1.6">
<p>${intro}</p>
<p style="margin:24px 0"><a href="${link}" style="background:#0f1f3d;color:#fff;text-decoration:none;padding:11px 18px;border-radius:4px;display:inline-block">${cta}</a></p>
<p style="font-size:12px;color:#9090a8">${link}</p>
</div>`;
}

export default function SessionStartupsPanel({ session, clubId }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const sessionId = session.id;
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const q = useQuery({
    queryKey: ['rsa', 'session-console', 'startups', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select('id, name, status, email, contact_person, pitch_deck_path, session_deck_path, deck_confirmed_at, deck_instructions_sent_at, deck_confirm_token')
        .eq('session_id', sessionId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    staleTime: 20 * 1000,
  });

  const rows = q.data || [];

  async function sendConfirmation(list) {
    const targets = list.filter((s) => s.email && s.deck_confirm_token);
    if (targets.length === 0) {
      toast.error(t(COPY.noEmail));
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let okCount = 0;
    for (const s of targets) {
      const link = `${origin}/ConfirmDeck?token=${s.deck_confirm_token}`;
      const res = await sendBulk({
        clubId: clubId || null,
        audienceType: 'single_email',
        audienceFilter: { email: s.email },
        subject: `${t(COPY.subject)} — ${session.name}`,
        bodyHtml: confirmEmailHtml({ name: s.contact_person || s.name, sessionName: session.name, link, lang }),
      });
      if (res.ok) okCount += 1;
    }
    // Marque instructions envoyées pour ceux qu'on a tenté d'envoyer.
    try {
      await supabase.rpc('rsa_mark_deck_instructions_sent', {
        p_session_id: sessionId,
        p_startup_ids: targets.map((s) => s.id),
      });
    } catch (_e) { /* non bloquant */ }
    qc.invalidateQueries({ queryKey: ['rsa', 'session-console', 'startups', sessionId] });
    if (okCount > 0) toast.success(`${okCount}/${targets.length} ✓`);
    else toast.error('Envoi échoué');
  }

  return (
    <section>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: '#8a6f1f' }}>{t(COPY.title)}</span>
        <span className="text-[12px]" style={{ color: MUTED }}>· {rows.length}</span>
        <button
          type="button"
          disabled={bulkBusy || rows.length === 0}
          onClick={async () => { setBulkBusy(true); await sendConfirmation(rows.filter((s) => !s.deck_confirmed_at)); setBulkBusy(false); }}
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}
        >
          {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {t(COPY.sendAll)}
        </button>
      </div>

      {q.isLoading && <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} /></div>}
      {!q.isLoading && rows.length === 0 && <p className="text-[12.5px] py-3" style={{ color: MUTED }}>{t(COPY.empty)}</p>}

      {!q.isLoading && rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((s) => {
            const st = statusOf(s);
            const dUrl = deckUrl(s.session_deck_path || s.pitch_deck_path);
            const chipLabel = { uploaded: t(COPY.cUploaded), kept: t(COPY.cKept), sent: t(COPY.cSent), none: t(COPY.cNone) }[st];
            return (
              <li key={s.id} className="flex items-center gap-3 flex-wrap rounded-[5px] px-3 py-2.5"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
                <span className="text-[13.5px] font-medium flex-1 min-w-[140px]" style={{ color: NAVY, fontFamily: SERIF }}>{s.name}</span>
                <Chip kind={st} label={chipLabel} />
                {dUrl && (
                  <a href={dUrl} target="_blank" rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px]"
                    style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: GOLD }} /> {t(COPY.viewDeck)}
                  </a>
                )}
                <button
                  type="button"
                  disabled={busyId === s.id || !s.email}
                  onClick={async () => { setBusyId(s.id); await sendConfirmation([s]); setBusyId(null); }}
                  className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px] disabled:opacity-40"
                  style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
                  title={!s.email ? t(COPY.noEmail) : undefined}
                >
                  {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" style={{ color: GOLD }} />}
                  {st === 'none' ? t(COPY.send) : t(COPY.resend)}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] mt-3" style={{ color: MUTED }}>{t(COPY.legend)}</p>
    </section>
  );
}
