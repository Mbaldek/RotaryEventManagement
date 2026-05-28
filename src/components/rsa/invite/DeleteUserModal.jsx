// DeleteUserModal — V2.5 user-management, suppression de compte (master_admin only).
//
// Workflow 3-step anti-drama :
//   Step 1 : explication + liste des données qui seront effacées
//   Step 2 : input typed-confirm `DELETE-{email}` + bouton "Supprimer définitivement"
//   Step 3 : résultat (success ou error)
//
// L'orchestrateur câble juste le bouton "Supprimer le compte" dans GlobalRolesTab.jsx
// (et nulle part ailleurs — Club Cockpit n'a PAS ce bouton, le brief le précise).
//
// Brand : Élysée bulletproof, danger en BRICK (#a23b2d) jamais bright red.

import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, X, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  Eyebrow,
  Field,
  TextInput,
} from '@/components/design';
import { DANGER, TINT_DANGER, SUCCESS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { DELETE_USER } from './i18n';
import { useDeleteUser, buildDeleteConfirmString } from './useInvite';

function mapErrorToCopy(error, t) {
  const e = String(error || '').toLowerCase();
  if (e.includes('forbidden')) return t(DELETE_USER.errorForbidden);
  if (e.includes('self_delete')) return t(DELETE_USER.errorSelfDelete);
  if (e.includes('user_not_found') || e.includes('not_found')) {
    return t(DELETE_USER.errorNotFound);
  }
  if (e.includes('invalid_confirm')) return t(DELETE_USER.errorMismatch);
  return t(DELETE_USER.step3ErrorTitle);
}

/**
 * DeleteUserModal — props :
 *   - email     : string (cible)
 *   - onClose   : () => void
 *   - onSuccess : (result) => void
 */
export default function DeleteUserModal({ email, onClose, onSuccess }) {
  const { t } = useLang();
  const titleId = useId();
  const del = useDeleteUser();

  const expectedConfirm = useMemo(() => buildDeleteConfirmString(email), [email]);
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null); // { ok: bool, message }

  // ESC pour fermer.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !del.isPending) onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, del.isPending]);

  async function onConfirmDelete() {
    setFormError(null);
    if (typed.trim() !== expectedConfirm) {
      setFormError(t(DELETE_USER.errorMismatch));
      return;
    }
    const res = await del.mutateAsync({ email, typedConfirm: typed.trim() });
    if (!res?.ok) {
      setResult({ ok: false, message: mapErrorToCopy(res?.error, t) });
      setStep(3);
      return;
    }
    setResult({ ok: true });
    setStep(3);
    onSuccess?.(res);
  }

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
          if (e.target === e.currentTarget && !del.isPending) onClose?.();
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
          {/* Header NAVY */}
          <div className="relative px-6 py-5" style={{ background: NAVY, color: 'white' }}>
            <button
              type="button"
              onClick={() => !del.isPending && onClose?.()}
              disabled={del.isPending}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <Eyebrow color={GOLD}>{t(DELETE_USER.eyebrow)}</Eyebrow>
            <h2
              id={titleId}
              className="mt-2 text-[22px] leading-tight"
              style={{ fontFamily: SERIF, fontWeight: 500 }}
            >
              {t(DELETE_USER.modalTitle)}
            </h2>
            <p
              className="mt-2 text-[12px]"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <span style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {t(DELETE_USER.targetLabel)} ·
              </span>{' '}
              <span style={{ fontFamily: SERIF, fontStyle: 'italic' }}>{email}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {step === 1 && <Step1 t={t} onContinue={() => setStep(2)} onCancel={onClose} />}
            {step === 2 && (
              <Step2
                t={t}
                email={email}
                expectedConfirm={expectedConfirm}
                typed={typed}
                onTyped={setTyped}
                onConfirm={onConfirmDelete}
                onCancel={onClose}
                onBack={() => { setStep(1); setTyped(''); setFormError(null); }}
                pending={del.isPending}
                formError={formError}
              />
            )}
            {step === 3 && (
              <Step3 t={t} result={result} onClose={onClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Step 1 : avertissement + liste cascades ────────────────────────────────
function Step1({ t, onContinue, onCancel }) {
  const bullets = t(DELETE_USER.step1Bullets);
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-start gap-3 p-4 rounded-[4px]"
        style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
      >
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] mb-1.5"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(DELETE_USER.step1Title)}
          </p>
          <p className="text-[13px] leading-relaxed mb-2" style={{ color: INK }}>
            {t(DELETE_USER.step1Intro)}
          </p>
          <ul className="text-[12.5px] leading-relaxed list-disc pl-5 space-y-1" style={{ color: INK }}>
            {Array.isArray(bullets) &&
              bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-3.5 py-2 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
        >
          {t(DELETE_USER.cancel)}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          {t(DELETE_USER.step1Continue)}
        </button>
      </div>
    </div>
  );
}

// ── Step 2 : typed-confirm input + bouton danger ────────────────────────────
function Step2({ t, email, expectedConfirm, typed, onTyped, onConfirm, onCancel, onBack, pending, formError }) {
  const canSubmit = typed.trim() === expectedConfirm && !pending;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
        {t(DELETE_USER.step2Intro)}
      </p>

      <div
        className="px-3 py-2.5 rounded-[4px] text-[13px] font-mono break-all"
        style={{
          background: CREAM,
          border: `1px solid ${CREAM2}`,
          color: NAVY,
          letterSpacing: '0.02em',
        }}
      >
        {expectedConfirm}
      </div>

      <Field label={t(DELETE_USER.step2TypedLabel)} helper={t(DELETE_USER.step2TypedHelper)} required>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="text"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={typed}
            onChange={(e) => onTyped(e.target.value)}
            placeholder={t(DELETE_USER.step2TypedPlaceholder)}
            aria-describedby={describedBy}
            invalid={invalid || !!formError}
            disabled={pending}
          />
        )}
      </Field>

      {formError && (
        <p
          className="text-[12.5px] px-3 py-2 rounded-[4px]"
          style={{ color: DANGER, background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
          role="alert"
        >
          {formError}
        </p>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="inline-flex items-center text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
          style={{ color: MUTED }}
        >
          ← {t({ fr: 'Retour', en: 'Back', de: 'Zurück' })}
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex items-center px-3.5 py-2 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {t(DELETE_USER.cancel)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: DANGER, color: 'white' }}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t(DELETE_USER.step2Submitting)}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {t(DELETE_USER.step2Submit)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3 : résultat ──────────────────────────────────────────────────────
function Step3({ t, result, onClose }) {
  const ok = !!result?.ok;
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-start gap-3 p-4 rounded-[4px]"
        style={{
          background: ok ? '#ecf1e5' : TINT_DANGER,
          border: `1px solid ${CREAM2}`,
        }}
      >
        {ok ? (
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: SUCCESS }} />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: DANGER }} />
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] mb-1"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {ok ? t(DELETE_USER.step3SuccessTitle) : t(DELETE_USER.step3ErrorTitle)}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
            {ok ? t(DELETE_USER.step3SuccessBody) : (result?.message || '')}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          {t(DELETE_USER.step3Close)}
        </button>
      </div>
    </div>
  );
}
