// PrizeForm — formulaire création/édition d'un prix (V2.5).
//
// Réutilise strictement les form controls Élysée (@/components/design/form/*) :
//   - Field (label + helper + error + accessibilité ARIA)
//   - TextInput / Textarea / Select
//
// Props :
//   editionId  : string  (édition cible, requis pour la création)
//   clubId     : string? (NULL = scope compétition, géré par master_admin)
//   scope      : 'competition' | 'club' — détermine la sémantique (kind 'general'
//                autorisé en 'competition' ; 'special' forcé en 'club')
//   sessions   : Array  (sessions disponibles pour le dropdown)
//   initial    : Prize? (mode édition : on pré-remplit ; undefined = création)
//   onSubmit   : ({ name, amount, currency, kind, sessionId, description }) => Promise
//   onCancel   : () => void
//   busy       : bool   (parent indique pendant la mutation)
//
// Note V3 : la colonne prizes.jury_type a été supprimée (migration
// 20260604_rsa_v3_prizes_v2_jury.sql). Le tag « jury régulier vs spécial » est
// désormais porté par platform_jury_assignments.role, plus par le prix.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Field, TextInput, Textarea, Select } from '@/components/design';
import { NAVY, INK, GOLD, CREAM2 } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  PRIZE_FORM,
  PRIZES_UI,
  CURRENCY_OPTIONS,
} from './i18n';

function asNumberOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function PrizeForm({
  scope = 'competition',
  sessions = [],
  initial = null,
  onSubmit,
  onCancel,
  busy = false,
  error: parentError = null,
}) {
  const { t } = useLang();
  const isEdit = !!initial?.id;
  const isClub = scope === 'club';

  // En 'club', kind est forcé à 'special' et bloqué ; en 'competition' c'est libre.
  const initialKind = useMemo(() => {
    if (isClub) return 'special';
    return initial?.kind || 'general';
  }, [isClub, initial?.kind]);

  const [name, setName]               = useState(initial?.name || '');
  const [amount, setAmount]           = useState(initial?.amount ?? '');
  const [currency, setCurrency]       = useState(initial?.currency || 'EUR');
  const [kind, setKind]               = useState(initialKind);
  const [sessionId, setSessionId]     = useState(initial?.session_id || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [localError, setLocalError]   = useState(null);

  // Hydrate quand initial change (édition d'une autre ligne).
  useEffect(() => {
    setName(initial?.name || '');
    setAmount(initial?.amount ?? '');
    setCurrency(initial?.currency || 'EUR');
    setKind(isClub ? 'special' : (initial?.kind || 'general'));
    setSessionId(initial?.session_id || '');
    setDescription(initial?.description || '');
    setLocalError(null);
  }, [initial?.id, isClub]);

  const errors = useMemo(() => {
    const out = {};
    if (!name || name.trim().length < 2) {
      out.name = t(PRIZE_FORM.errNameTooShort);
    }
    const num = asNumberOrNull(amount);
    if (num == null || num < 0) {
      out.amount = t(PRIZE_FORM.errAmountInvalid);
    }
    return out;
  }, [name, amount, t]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    if (Object.keys(errors).length) return;
    try {
      await onSubmit?.({
        name: name.trim(),
        amount: asNumberOrNull(amount) ?? 0,
        currency,
        kind: isClub ? 'special' : kind,
        sessionId: sessionId || null,
        description: description?.trim() || null,
      });
    } catch (err) {
      setLocalError(err?.message || String(err));
    }
  }

  const sessionOptions = useMemo(() => {
    const opts = (sessions || []).map((s) => ({
      value: s.id,
      label: s.name || s.id,
    }));
    return opts;
  }, [sessions]);

  const kindOptions = useMemo(() => ([
    { value: 'general', label: t(PRIZE_FORM.kindGeneral) },
    { value: 'special', label: t(PRIZE_FORM.kindSpecial) },
  ]), [t]);

  const currencyOptions = useMemo(
    () => CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` })),
    [],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[4px] p-5 mt-3"
      style={{ background: 'white', border: `1px solid ${GOLD}` }}
    >
      <header className="mb-4 flex items-center gap-2.5">
        <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          {isEdit ? t(PRIZE_FORM.editTitle) : t(PRIZE_FORM.createTitle)}
        </span>
      </header>

      <div className="flex flex-col gap-5">
        {/* Nom */}
        <Field
          label={t(PRIZE_FORM.nameLabel)}
          required
          error={errors.name}
        >
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={name}
              placeholder={t(PRIZE_FORM.namePlaceholder)}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          )}
        </Field>

        {/* Montant + Devise */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label={t(PRIZE_FORM.amountLabel)}
            required
            error={errors.amount}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={amount}
                placeholder={t(PRIZE_FORM.amountPlaceholder)}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>

          <Field label={t(PRIZE_FORM.currencyLabel)} required>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                options={currencyOptions}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>
        </div>

        {/* Type de prix (kind) */}
        <Field
          label={t(PRIZE_FORM.kindLabel)}
          required
          helper={isClub ? t(PRIZE_FORM.kindHintClub) : t(PRIZE_FORM.kindHintCompetition)}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              options={kindOptions}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={busy || isClub}
            />
          )}
        </Field>

        {/* Session associée (optionnel) */}
        <Field
          label={t(PRIZE_FORM.sessionLabel)}
          helper={t(PRIZE_FORM.sessionHint)}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              options={[
                { value: '', label: t(PRIZE_FORM.sessionPlaceholder) },
                ...sessionOptions,
              ]}
              value={sessionId || ''}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={busy}
            />
          )}
        </Field>

        {/* Description libre */}
        <Field label={t(PRIZE_FORM.descriptionLabel)}>
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              value={description}
              placeholder={t(PRIZE_FORM.descriptionPlaceholder)}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          )}
        </Field>

        {(localError || parentError) && (
          <p className="text-[12px]" style={{ color: DANGER }} role="alert">
            {localError || parentError}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(PRIZES_UI.cancel)}
          </button>
          <button
            type="submit"
            disabled={busy || Object.keys(errors).length > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white' }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit
              ? (busy ? t(PRIZES_UI.saving) : t(PRIZES_UI.save))
              : (busy ? t(PRIZES_UI.creating) : t(PRIZES_UI.create))}
          </button>
        </div>
      </div>
    </form>
  );
}
