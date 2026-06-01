// SessionScoringAccess — accès scoring d'une session (Pilotage / En direct).
//
// ACCÈS SCORING JURÉ : lien public /Score?s=<slug> + PIN, copier, régénérer, et
// envoi de l'invitation par email aux jurés approuvés. Le lien est la barrière
// d'accès, le PIN une seconde barrière revalidée côté serveur.
//
// NB : les POIDS des critères ne sont PAS ici — c'est un paramètre de COMPÉTITION
// (CompetitionEditView → onglet « Notation », editions.scoring_weights), pas de session.
//
// Écritures via RPC admin (rsa_rotate_session_access) + edge send-transactional.

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, ExternalLink, RefreshCw, KeyRound, Mail } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { supabase } from '@/lib/supabase';
import { sendTransactional } from '@/lib/platform/transactional';
import { useLang } from '@/lib/platform/i18n';
import { useSessionAccess, useRotateSessionAccess } from '../useClub';

const TX = {
  accessTitle: { fr: 'Accès scoring juré', en: 'Juror scoring access', de: 'Juror-Zugang' },
  accessHint: {
    fr: 'Lien public à envoyer aux jurés (pas de compte). Le PIN est demandé à l’ouverture.',
    en: 'Public link to send to jurors (no account). The PIN is asked on open.',
    de: 'Öffentlicher Link für Juroren (kein Konto). Der PIN wird beim Öffnen abgefragt.',
  },
  generate: { fr: 'Générer le lien d’accès', en: 'Generate access link', de: 'Zugangslink erzeugen' },
  link: { fr: 'Lien', en: 'Link', de: 'Link' },
  pin: { fr: 'Code PIN', en: 'PIN code', de: 'PIN-Code' },
  copy: { fr: 'Copier le lien', en: 'Copy link', de: 'Link kopieren' },
  copied: { fr: 'Lien copié', en: 'Link copied', de: 'Link kopiert' },
  open: { fr: 'Ouvrir', en: 'Open', de: 'Öffnen' },
  regenerate: { fr: 'Régénérer (invalide l’ancien lien)', en: 'Regenerate (invalidates old link)', de: 'Neu erzeugen (alter Link ungültig)' },
  regenerated: { fr: 'Nouveau lien + PIN générés', en: 'New link + PIN generated', de: 'Neuer Link + PIN erzeugt' },
  genErr: { fr: 'Échec de la génération.', en: 'Generation failed.', de: 'Erzeugung fehlgeschlagen.' },
  sendInvite: { fr: 'Envoyer l’invitation aux jurés', en: 'Email invitation to jurors', de: 'Einladung an Juroren senden' },
  sendHint: {
    fr: 'Envoie le lien + PIN (et le lien Teams) par email aux jurés approuvés ayant une adresse.',
    en: 'Emails the link + PIN (and Teams link) to approved jurors who have an address.',
    de: 'Sendet Link + PIN (und Teams-Link) per E-Mail an bestätigte Juroren mit Adresse.',
  },
  confirmSendQ: {
    fr: (n) => `Envoyer l’invitation à ${n} juré·e·s approuvé·e·s ?`,
    en: (n) => `Send the invitation to ${n} approved jurors?`,
    de: (n) => `Einladung an ${n} bestätigte Juroren senden?`,
  },
  confirmSend: { fr: 'Confirmer l’envoi', en: 'Confirm send', de: 'Senden bestätigen' },
  cancel: { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  noRecipients: { fr: 'Aucun juré approuvé avec une adresse email.', en: 'No approved juror with an email address.', de: 'Kein bestätigter Juror mit E-Mail-Adresse.' },
  sentToast: { fr: (ok, n) => `${ok}/${n} invitation(s) envoyée(s).`, en: (ok, n) => `${ok}/${n} invitation(s) sent.`, de: (ok, n) => `${ok}/${n} Einladung(en) gesendet.` },
  sendErr: { fr: 'Échec de l’envoi.', en: 'Send failed.', de: 'Senden fehlgeschlagen.' },
};

export default function SessionScoringAccess({ sessionId }) {
  const { t } = useLang();
  const accessQ = useSessionAccess(sessionId);
  const rotate = useRotateSessionAccess(sessionId);

  const access = accessQ.data;
  const slug = access?.slug || null;
  const pin = access?.pin || null;
  const scoreUrl = slug ? `${window.location.origin}/Score?s=${slug}` : '';

  // Envoi de l'invitation (lien + PIN) aux jurés approuvés — outward-facing → confirmation.
  const [sending, setSending] = useState(false);
  const [confirmRecipients, setConfirmRecipients] = useState(null);

  async function openSend() {
    try {
      const { data, error } = await supabase.rpc('rsa_session_jurors', { p_session_id: sessionId });
      if (error) throw error;
      const recipients = (data || []).filter(
        (j) => j.status === 'approved' && typeof j.email === 'string' && j.email.includes('@'),
      );
      if (recipients.length === 0) { toast.error(t(TX.noRecipients)); return; }
      setConfirmRecipients(recipients);
    } catch {
      toast.error(t(TX.sendErr));
    }
  }

  async function doSend() {
    const recipients = confirmRecipients || [];
    setConfirmRecipients(null);
    setSending(true);
    try {
      let ok = 0;
      for (const j of recipients) {
        const jlang = ['fr', 'en', 'de'].includes(j.preferred_lang) ? j.preferred_lang : 'fr';
        const res = await sendTransactional({
          type: 'jury_scoring_invite',
          recipient_email: j.email,
          recipient_name: j.full_name,
          lang: jlang,
          data: {
            session_name: access?.session_name,
            session_date: access?.session_date,
            scoring_slug: slug,
            scoring_pin: pin,
            teams_url: access?.teams_link || undefined,
            club_id: access?.club_id || undefined,
          },
        });
        if (res?.ok) ok += 1;
      }
      toast.success(t(TX.sentToast)(ok, recipients.length));
    } catch {
      toast.error(t(TX.sendErr));
    } finally {
      setSending(false);
    }
  }

  async function doRotate() {
    try {
      await rotate.mutateAsync();
      toast.success(t(TX.regenerated));
    } catch {
      toast.error(t(TX.genErr));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(scoreUrl);
      toast.success(t(TX.copied));
    } catch {
      toast.error(scoreUrl);
    }
  }

  return (
    <section className="rounded-[4px] p-4 mt-3" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
        <h4 className="text-[13px] font-medium" style={{ color: NAVY }}>{t(TX.accessTitle)}</h4>
      </div>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>{t(TX.accessHint)}</p>

      {accessQ.isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
      ) : !slug ? (
        <button
          type="button"
          onClick={doRotate}
          disabled={rotate.isPending}
          className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50 ${FOCUS_RING_CLASS}`}
          style={{ background: NAVY, color: 'white' }}
        >
          {rotate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
          {t(TX.generate)}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] mb-1" style={{ color: MUTED }}>{t(TX.link)}</div>
            <code className="text-[12px] px-2 py-1 rounded-[4px] break-all inline-block" style={{ background: TINT_ADMIN, color: NAVY, border: `1px solid ${CREAM2}` }}>
              {scoreUrl}
            </code>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] mb-1" style={{ color: MUTED }}>{t(TX.pin)}</div>
            <span className="text-[20px] tabular-nums tracking-[0.3em] font-semibold" style={{ color: NAVY, fontFamily: SERIF }}>{pin}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button type="button" onClick={copyLink}
              className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
              style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
              <Copy className="w-3.5 h-3.5" /> {t(TX.copy)}
            </button>
            <a href={scoreUrl} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
              style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
              <ExternalLink className="w-3.5 h-3.5" /> {t(TX.open)}
            </a>
            <button type="button" onClick={doRotate} disabled={rotate.isPending}
              className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px] disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              style={{ color: MUTED, border: `1px solid ${CREAM2}`, background: 'white' }}>
              {rotate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {t(TX.regenerate)}
            </button>
          </div>

          {/* Envoi de l'invitation (lien + PIN + Teams) aux jurés approuvés */}
          <div className="pt-3" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <p className="text-[11.5px] mb-2" style={{ color: MUTED }}>{t(TX.sendHint)}</p>
            {!confirmRecipients ? (
              <button type="button" onClick={openSend} disabled={sending}
                className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50 ${FOCUS_RING_CLASS}`}
                style={{ background: NAVY, color: 'white' }}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {t(TX.sendInvite)}
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12.5px]" style={{ color: INK }}>{t(TX.confirmSendQ)(confirmRecipients.length)}</span>
                <button type="button" onClick={doSend}
                  className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium ${FOCUS_RING_CLASS}`}
                  style={{ background: GOLD, color: NAVY }}>
                  <Mail className="w-3.5 h-3.5" /> {t(TX.confirmSend)}
                </button>
                <button type="button" onClick={() => setConfirmRecipients(null)}
                  className={`text-[12.5px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
                  style={{ color: MUTED, border: `1px solid ${CREAM2}`, background: 'white' }}>
                  {t(TX.cancel)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
