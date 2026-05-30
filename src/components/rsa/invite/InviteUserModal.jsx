// InviteUserModal — V2.5 user-management, modale unique réutilisable.
//
// Deux scopes :
//   * scope='global' (Master Cockpit → Rôles globaux) : roles master_admin / admin,
//     pas de clubId requis.
//   * scope='club'   (Master Cockpit → Clubs → Membres OU Club Cockpit → Équipe) :
//     roles club_admin / comite / jury, clubId requis (prop ou champ visible).
//
// L'orchestrateur câble juste un bouton "Inviter" qui ouvre cette modale. Aucune
// modification de ClubEditor.jsx / TeamTab.jsx / GlobalRolesTab.jsx : ce
// composant est strictement isolé et auto-suffisant.
//
// Brand : Élysée bulletproof (cf. docs/design/elysee-designbook.md).
//   - Overlay : navy 50% + backdrop-blur léger
//   - Surface : white, 1px CREAM2, no shadow, 4px radius
//   - Eyebrow + EditorialTitle, Field/TextInput/Textarea/Select
//   - CTA : primary NAVY → GOLD hover ; secondary outline
//   - GOLD focus ring partout

import React, { useEffect, useMemo, useState, useId } from 'react';
import { Loader2, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NAVY,
  GOLD,
  CREAM2,
  INK,
  SERIF,
  EASE,
  Eyebrow,
  EditorialTitle,
  Field,
  TextInput,
  Textarea,
  Select,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { INVITE, ROLE_LABEL_KEYS } from './i18n';
import { useInviteUser } from './useInvite';

const GLOBAL_ROLES = ['master_admin', 'admin'];
const CLUB_ROLES = ['club_admin', 'comite', 'jury'];

function mapErrorToCopy(error, t) {
  const e = String(error || '').toLowerCase();
  if (e.includes('rate_limited')) return t(INVITE.errorRateLimited);
  if (e.includes('forbidden')) return t(INVITE.errorForbidden);
  if (e.includes('club_id_required')) return t(INVITE.errorClubRequired);
  if (e.includes('invalid_email')) return t(INVITE.errorInvalidEmail);
  return t(INVITE.errorGeneric);
}

/**
 * InviteUserModal — props :
 *   - scope        : 'global' | 'club' (obligatoire)
 *   - clubId       : string (requis si scope='club')
 *   - roleOptions  : string[] (sous-ensemble — si omis, défaut = matrice scope)
 *   - onClose      : () => void
 *   - onSuccess    : (result) => void  — appelé après envoi OK avec
 *                   { user_id, was_already_existing, magic_link_sent }
 *   - defaultRole  : string (optionnel — pré-remplit le select)
 */
export default function InviteUserModal({
  scope,
  clubId,
  roleOptions,
  onClose,
  onSuccess,
  defaultRole,
}) {
  const { t, lang } = useLang();
  const titleId = useId();
  const invite = useInviteUser();

  if (scope !== 'global' && scope !== 'club') {
    // Garde-fou dev : un appel sans scope est une erreur d'intégration.
     
    console.warn('[InviteUserModal] scope is required ("global" | "club")');
  }

  const allowedRoles = useMemo(() => {
    const fallback = scope === 'global' ? GLOBAL_ROLES : CLUB_ROLES;
    if (!Array.isArray(roleOptions) || roleOptions.length === 0) return fallback;
    return roleOptions.filter((r) => fallback.includes(r));
  }, [scope, roleOptions]);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState(() => {
    if (defaultRole && allowedRoles.includes(defaultRole)) return defaultRole;
    return allowedRoles[0] || '';
  });
  const [customMessage, setCustomMessage] = useState('');
  const [formError, setFormError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null); // { wasExisting: bool }

  // ESC pour fermer.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !invite.isPending) {
        onClose?.();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, invite.isPending]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    setFormError(null);
    setSuccessInfo(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError(t(INVITE.errorInvalidEmail));
      return;
    }
    if (!role) {
      setFormError(t(INVITE.errorGeneric));
      return;
    }
    if (CLUB_ROLES.includes(role) && !clubId) {
      setFormError(t(INVITE.errorClubRequired));
      return;
    }

    const res = await invite.mutateAsync({
      email: trimmedEmail,
      role,
      clubId: scope === 'club' ? clubId : undefined,
      customMessage: customMessage.trim() || undefined,
      lang,
    });

    if (!res?.ok) {
      setFormError(mapErrorToCopy(res?.error, t));
      return;
    }

    setSuccessInfo({ wasExisting: !!res.was_already_existing });
    onSuccess?.(res);
  }

  const roleSelectOptions = allowedRoles.map((r) => ({
    value: r,
    label: t(ROLE_LABEL_KEYS[r]) || r,
  }));

  const title = scope === 'club' ? t(INVITE.modalTitleClub) : t(INVITE.modalTitleGlobal);
  const intro = scope === 'club' ? t(INVITE.introClub) : t(INVITE.introGlobal);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center px-3 sm:px-6 py-8 overflow-y-auto"
        style={{ background: 'rgba(15, 31, 61, 0.55)', backdropFilter: 'blur(2px)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !invite.isPending) onClose?.();
        }}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="w-full max-w-[560px] rounded-[4px] overflow-hidden"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          {/* Header NAVY avec gold rule */}
          <div
            className="relative px-6 py-5"
            style={{ background: NAVY, color: 'white' }}
          >
            <button
              type="button"
              onClick={() => !invite.isPending && onClose?.()}
              disabled={invite.isPending}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <Eyebrow color={GOLD}>{t(INVITE.eyebrow)}</Eyebrow>
            <h2
              id={titleId}
              className="mt-2 text-[22px] leading-tight"
              style={{ fontFamily: SERIF, fontWeight: 500 }}
            >
              {title}
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {successInfo ? (
              <SuccessBlock
                wasExisting={successInfo.wasExisting}
                onClose={onClose}
                t={t}
              />
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
                  {intro}
                </p>

                <Field label={t(INVITE.emailLabel)} required>
                  {({ id, describedBy, invalid }) => (
                    <TextInput
                      id={id}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t(INVITE.emailPlaceholder)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      disabled={invite.isPending}
                    />
                  )}
                </Field>

                <Field label={t(INVITE.roleLabel)} required>
                  {({ id, describedBy, invalid }) => (
                    <Select
                      id={id}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      options={roleSelectOptions}
                      placeholder={t(INVITE.rolePlaceholder)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      disabled={invite.isPending}
                    />
                  )}
                </Field>

                <Field
                  label={t(INVITE.customMessageLabel)}
                  helper={t(INVITE.customMessageHelper)}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      id={id}
                      value={customMessage}
                      onChange={(e) =>
                        setCustomMessage(e.target.value.slice(0, 300))
                      }
                      placeholder={t(INVITE.customMessagePlaceholder)}
                      rows={3}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      disabled={invite.isPending}
                      maxLength={300}
                    />
                  )}
                </Field>

                {formError && (
                  <p
                    className="text-[12.5px] px-3 py-2 rounded-[4px]"
                    style={{
                      color: DANGER,
                      background: TINT_DANGER,
                      border: `1px solid ${CREAM2}`,
                    }}
                    role="alert"
                  >
                    {formError}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-2 flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => !invite.isPending && onClose?.()}
                    disabled={invite.isPending}
                    className="inline-flex items-center px-3.5 py-2 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
                    style={{
                      color: INK,
                      background: 'white',
                      border: `1px solid ${CREAM2}`,
                    }}
                  >
                    {t(INVITE.cancel)}
                  </button>
                  <button
                    type="submit"
                    disabled={invite.isPending || !email.trim() || !role}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
                    style={{ background: NAVY, color: 'white' }}
                  >
                    {invite.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t(INVITE.submitting)}
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        {t(INVITE.submit)}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Bloc de succès affiché après envoi OK ────────────────────────────────────
function SuccessBlock({ wasExisting, onClose, t }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="px-4 py-3 rounded-[4px]"
        style={{
          background: '#ecf1e5',
          border: `1px solid ${CREAM2}`,
        }}
      >
        <EditorialTitle
          lead={
            wasExisting
              ? t(INVITE.successExisting).split('—')[0]?.trim() || t(INVITE.successNew)
              : t(INVITE.successNew)
          }
          size="sm"
        />
        {wasExisting && (
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: INK }}
          >
            {t(INVITE.successExisting)}
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="inline-flex items-center px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          {t({ fr: 'Fermer', en: 'Close', de: 'Schließen' })}
        </button>
      </div>
    </div>
  );
}
