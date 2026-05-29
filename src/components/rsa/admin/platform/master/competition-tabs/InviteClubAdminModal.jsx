// InviteClubAdminModal — modale Élysée pour inviter un club_admin pré-rempli
// avec le club_id sélectionné depuis le tab "Clubs participants" d'une
// compétition. Réutilise le pattern de InviteCompetitionAdminModal (tabs/
// CompetitionAdminsTab.jsx) — backdrop blur, header eyebrow gold + titre
// Playfair, body Field/TextInput/Textarea, footer NAVY submit + ghost cancel.
//
// L'invitation est routée vers l'edge function `invite-user` via inviteUser()
// avec role='club_admin' et club_id=X. À succès, on toast + ferme la modale et
// on invalide useClubMembers(clubId) (le panneau Members du club_cockpit, s'il
// est déjà monté, se réactualise tout seul).
//
// A11y :
//   - role="dialog" + aria-labelledby sur le titre Playfair,
//   - ESC ferme,
//   - autoFocus sur le champ email,
//   - error inline (role="alert").

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import {
  CREAM2, EASE, INK, MUTED, NAVY, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, FOCUS_RING_CLASS, GOLD_TEXT } from '@/components/design/tokens.app';
import { Field, TextInput, Textarea } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { inviteUser } from '@/lib/platform/userManagement';
import { CLUB_ROW_ACTIONS } from '../i18n';
import { KEYS } from '../useMaster';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteClubAdminModal({
  open,
  onClose,
  clubId,
  clubName,
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const [email, setEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailErr, setEmailErr] = useState(null);
  const [serverErr, setServerErr] = useState(null);

  // Reset state à chaque ouverture (un même mount peut servir plusieurs invitations
  // si le parent re-ouvre la modale).
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setCustomMessage('');
    setEmailErr(null);
    setServerErr(null);
    setSubmitting(false);
  }, [open]);

  // ESC ferme + body scroll lock + restore focus au unmount.
  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current =
      typeof document !== 'undefined' ? document.activeElement : null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      const toRestore = previousFocusRef.current;
      if (toRestore && typeof toRestore.focus === 'function') {
        setTimeout(() => {
          try { toRestore.focus({ preventScroll: true }); } catch { /* noop */ }
        }, 0);
      }
    };
  }, [open, onClose]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setEmailErr(null);
    setServerErr(null);

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setEmailErr(t(CLUB_ROW_ACTIONS.inviteInvalidEmail));
      return;
    }
    if (!clubId) {
      setServerErr('missing_club_id');
      return;
    }

    setSubmitting(true);
    try {
      const res = await inviteUser({
        email:         normalized,
        role:          'club_admin',
        clubId,
        customMessage: customMessage.trim() || undefined,
        lang,
      });
      if (!res?.ok) {
        throw new Error(res?.error || 'invite_failed');
      }
      // Succès → toast + invalidate + close
      toast.success(t(CLUB_ROW_ACTIONS.inviteSuccess));
      qc.invalidateQueries({ queryKey: KEYS.clubMembers(clubId) });
      onClose?.();
    } catch (err) {
      console.error('[InviteClubAdminModal] invite failed', err);
      setServerErr(
        t(CLUB_ROW_ACTIONS.inviteErrPrefix)
          + (err?.message || String(err) || 'unknown_error'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(250, 247, 242, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.form
        ref={dialogRef}
        onSubmit={onSubmit}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.28, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[560px] w-full rounded-[4px] flex flex-col overflow-hidden"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <header
          className="px-6 pt-5 pb-4 flex items-start gap-3"
          style={{ borderBottom: `1px solid ${CREAM2}` }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-1"
              style={{ color: GOLD_TEXT }}
            >
              {t(CLUB_ROW_ACTIONS.inviteModalEyebrow)}
            </p>
            <h2
              id={titleId}
              className="text-[22px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
            >
              {t(CLUB_ROW_ACTIONS.inviteModalTitle)}
            </h2>
            {clubName && (
              <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>
                {clubName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            aria-label={t(CLUB_ROW_ACTIONS.inviteCancel)}
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-[13px]" style={{ color: INK }}>
            {t(CLUB_ROW_ACTIONS.inviteModalSubtitle)}
          </p>

          <Field
            label={t(CLUB_ROW_ACTIONS.inviteEmailLabel)}
            required
            helper={t(CLUB_ROW_ACTIONS.inviteEmailHelper)}
            error={emailErr}
          >
            {({ id, describedBy, invalid, required }) => (
              <TextInput
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
                aria-required={required}
                placeholder={t(CLUB_ROW_ACTIONS.inviteEmailPlaceholder)}
                autoComplete="email"
                disabled={submitting}
                autoFocus
              />
            )}
          </Field>

          <Field
            label={t(CLUB_ROW_ACTIONS.inviteMessageLabel)}
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                aria-describedby={describedBy}
                rows={3}
                placeholder={t(CLUB_ROW_ACTIONS.inviteMessagePlaceholder)}
                disabled={submitting}
                maxLength={300}
              />
            )}
          </Field>

          {serverErr && (
            <p
              className="text-[13px] rounded-[4px] px-3 py-2"
              role="alert"
              style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
            >
              {serverErr}
            </p>
          )}
        </div>

        <footer
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`text-[13px] px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {t(CLUB_ROW_ACTIONS.inviteCancel)}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{
              background: submitting ? MUTED : NAVY,
              color: 'white',
              border: `1px solid ${submitting ? MUTED : NAVY}`,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {submitting
              ? t(CLUB_ROW_ACTIONS.inviteSending)
              : t(CLUB_ROW_ACTIONS.inviteSubmit)}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}
