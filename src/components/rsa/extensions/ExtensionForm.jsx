// ExtensionForm — modale Élysée création/édition d'une extension (V3.0).
//
// Réutilise FunnelEditorModal pour le chrome (tabs Identité / Config / Avancé)
// et les form controls Élysée (@/components/design/form/*) à l'intérieur.
//
// Props :
//   open       : bool
//   onClose    : () => void
//   scope      : 'master' | 'club' | 'edition' (immuable après création)
//   clubId     : string? (requis si scope='club' OR 'edition')
//   editionId  : string? (requis si scope='edition')
//   initial    : Extension? (mode édition : pré-rempli ; undefined = création)
//   onSubmit   : (payload) => Promise — parent appelle Extension.create / update
//
// Pour V1, la Tab Config est un simple <textarea> JSON (avec validation
// côté client). Le JSON schema autogen arrive en V4 (un schema par kind).

import React, { useEffect, useMemo, useState } from 'react';
import { Field, TextInput, Textarea, Select } from '@/components/design';
import { NAVY, INK, GOLD, CREAM2, MUTED } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import FunnelEditorModal from '../admin/platform/funnel/FunnelEditorModal';
import { EXT_FORM, EXT_UI, EXT_KIND_LABELS, EXT_SCOPE_LABELS } from './i18n';
import { EXTENSION_KINDS } from '@/lib/rsa/extensions';

function safeStringify(obj) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJsonOrError(raw) {
  if (raw == null || raw.trim() === '') return { value: {}, error: null };
  try {
    const value = JSON.parse(raw);
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return { value: null, error: 'object expected' };
    }
    return { value, error: null };
  } catch (err) {
    return { value: null, error: err.message };
  }
}

export default function ExtensionForm({
  open,
  onClose,
  scope,
  clubId = null,
  editionId = null,
  initial = null,
  onSubmit,
}) {
  const { t } = useLang();
  const isEdit = !!initial?.id;

  const [tab, setTab] = useState('identity');
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [kind, setKind] = useState(initial?.kind || 'funnel_step');
  const [active, setActive] = useState(initial?.active ?? true);
  const [configRaw, setConfigRaw] = useState(safeStringify(initial?.config));
  const [position, setPosition] = useState(initial?.position ?? 0);
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  // Hydrate quand initial change (édition d'une autre ligne).
  useEffect(() => {
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setKind(initial?.kind || 'funnel_step');
    setActive(initial?.active ?? true);
    setConfigRaw(safeStringify(initial?.config));
    setPosition(initial?.position ?? 0);
    setTab('identity');
    setStatus('idle');
    setStatusMessage(null);
    setError(null);
  }, [initial?.id, open]);

  const configParsed = useMemo(() => parseJsonOrError(configRaw), [configRaw]);

  const errors = useMemo(() => {
    const out = {};
    if (!name || name.trim().length < 2) {
      out.name = t(EXT_FORM.errNameTooShort);
    }
    if (configParsed.error) {
      out.config = t(EXT_FORM.configInvalid);
    }
    return out;
  }, [name, configParsed.error, t]);

  async function handleSubmit() {
    setError(null);
    if (Object.keys(errors).length > 0) {
      // Bascule sur le 1er onglet en erreur pour signaler à l'utilisateur
      if (errors.name) setTab('identity');
      else if (errors.config) setTab('config');
      return;
    }
    setStatus('saving');
    setStatusMessage(t(EXT_UI.saving));
    try {
      const payload = isEdit
        ? {
            id: initial.id,
            name: name.trim(),
            description: description?.trim() || null,
            config: configParsed.value || {},
            position: Number(position) || 0,
            active,
          }
        : {
            scope,
            kind,
            name: name.trim(),
            description: description?.trim() || null,
            config: configParsed.value || {},
            clubId: scope === 'master' ? null : clubId,
            editionId: scope === 'edition' ? editionId : null,
            position: Number(position) || 0,
          };
      await onSubmit?.(payload);
      setStatus('saved');
      setStatusMessage(t(EXT_UI.save));
      // Fermeture après un court délai pour laisser l'utilisateur voir le "saved"
      setTimeout(() => {
        if (typeof onClose === 'function') onClose();
      }, 300);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err?.message || String(err));
      setError(err?.message || String(err));
    }
  }

  const kindOptions = useMemo(
    () => EXTENSION_KINDS.map((k) => ({ value: k, label: t(EXT_KIND_LABELS[k]) })),
    [t],
  );

  // ── Render des onglets ────────────────────────────────────────────────────

  const renderIdentity = () => (
    <div className="flex flex-col gap-5">
      <Field label={t(EXT_FORM.nameLabel)} required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            value={name}
            placeholder={t(EXT_FORM.namePlaceholder)}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'saving'}
          />
        )}
      </Field>

      <Field label={t(EXT_FORM.descriptionLabel)}>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={3}
            value={description}
            placeholder={t(EXT_FORM.descriptionPlaceholder)}
            onChange={(e) => setDescription(e.target.value)}
            disabled={status === 'saving'}
          />
        )}
      </Field>

      <Field label={t(EXT_FORM.kindLabel)} required helper={t(EXT_FORM.kindHint)}>
        {({ id, describedBy }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            options={kindOptions}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={isEdit || status === 'saving'}
          />
        )}
      </Field>

      <Field label={t(EXT_FORM.activeLabel)} helper={t(EXT_FORM.activeHint)}>
        {({ id }) => (
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive((v) => !v)}
            disabled={status === 'saving'}
            className="inline-flex items-center gap-2 text-[12.5px] px-3 py-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{
              background: active ? '#fdf6e8' : 'white',
              color: active ? NAVY : INK,
              border: `1px solid ${active ? GOLD : CREAM2}`,
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: active ? GOLD : MUTED }}
              aria-hidden
            />
            {active ? t(EXT_UI.active) : t(EXT_UI.inactive)}
          </button>
        )}
      </Field>
    </div>
  );

  const renderConfig = () => (
    <div className="flex flex-col gap-5">
      <Field
        label={t(EXT_FORM.configLabel)}
        helper={t(EXT_FORM.configHint)}
        error={errors.config}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={14}
            value={configRaw}
            placeholder={t(EXT_FORM.configPlaceholder)}
            onChange={(e) => setConfigRaw(e.target.value)}
            disabled={status === 'saving'}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}
          />
        )}
      </Field>
    </div>
  );

  const renderAdvanced = () => (
    <div className="flex flex-col gap-5">
      <Field label={t(EXT_FORM.positionLabel)} helper={t(EXT_FORM.positionHint)}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="numeric"
            step="1"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={status === 'saving'}
          />
        )}
      </Field>

      <Field label={t(EXT_FORM.scopeLabel)} helper={t(EXT_FORM.scopeHint)}>
        {({ id }) => (
          <div
            id={id}
            className="inline-flex items-center gap-2 text-[12.5px] px-3 py-1.5 rounded-[4px]"
            style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: GOLD }}
              aria-hidden
            />
            {t(EXT_SCOPE_LABELS[scope] || EXT_SCOPE_LABELS.master)}
          </div>
        )}
      </Field>
    </div>
  );

  const tabs = [
    { id: 'identity', label: t(EXT_FORM.tabIdentity), render: renderIdentity },
    { id: 'config',   label: t(EXT_FORM.tabConfig),   render: renderConfig },
    { id: 'advanced', label: t(EXT_FORM.tabAdvanced), render: renderAdvanced },
  ];

  return (
    <FunnelEditorModal
      open={open}
      onClose={onClose}
      title={isEdit ? t(EXT_FORM.titleEdit) : t(EXT_FORM.titleCreate)}
      eyebrow={isEdit ? t(EXT_FORM.eyebrowEdit) : t(EXT_FORM.eyebrowCreate)}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      status={status}
      statusMessage={statusMessage}
      destructiveSlot={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-[12px]" style={{ color: DANGER }} role="alert">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'saving' || Object.keys(errors).length > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white' }}
          >
            {isEdit
              ? (status === 'saving' ? t(EXT_UI.saving) : t(EXT_UI.save))
              : (status === 'saving' ? t(EXT_UI.creating) : t(EXT_UI.create))}
          </button>
        </div>
      }
    />
  );
}
