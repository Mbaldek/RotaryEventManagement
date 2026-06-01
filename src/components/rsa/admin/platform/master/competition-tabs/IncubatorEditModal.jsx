import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/platform/i18n';
import { TextRow, SelectRow } from './fields';
import { useSaveIncubator } from '@/components/rsa/hooks/useIncubators';

const slugify = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function IncubatorEditModal({ open, onClose, incubator }) {
  const { t } = useLang();
  const isNew = !incubator?.id;
  const save = useSaveIncubator();
  const [form, setForm] = useState({ name: '', country: '', language: '', website: '' });

  useEffect(() => {
    setForm({
      name: incubator?.name ?? '',
      country: incubator?.country ?? '',
      language: incubator?.language ?? '',
      website: incubator?.website ?? '',
    });
  }, [incubator, open]);

  if (!open) return null;

  const onSubmit = async () => {
    const patch = {
      name: form.name.trim(),
      country: form.country || null,
      language: form.language || null,
      website: form.website?.trim() || null,
    };
    if (!patch.name) return;
    const id = isNew ? slugify(patch.name) : incubator.id;
    await save.mutateAsync({ id, patch, isNew });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">
          {isNew
            ? t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' })
            : t({ fr: 'Modifier l’incubateur', en: 'Edit incubator', de: 'Inkubator bearbeiten' })}
        </h3>
        <div className="space-y-3">
          <TextRow
            id="inc-name"
            label={t({ fr: 'Nom', en: 'Name', de: 'Name' })}
            value={form.name}
            onChange={(val) => setForm((f) => ({ ...f, name: val }))}
          />
          <SelectRow
            id="inc-country"
            label={t({ fr: 'Pays', en: 'Country', de: 'Land' })}
            value={form.country}
            onChange={(val) => setForm((f) => ({ ...f, country: val }))}
            options={[
              { value: '', label: '—' },
              { value: 'FR', label: 'France' },
              { value: 'DE', label: 'Deutschland' },
              { value: 'CH', label: 'Suisse' },
            ]}
          />
          <SelectRow
            id="inc-lang"
            label={t({ fr: 'Langue de relais', en: 'Relay language', de: 'Sprache' })}
            value={form.language}
            onChange={(val) => setForm((f) => ({ ...f, language: val }))}
            options={[
              { value: '', label: '—' },
              { value: 'fr', label: 'FR' },
              { value: 'en', label: 'EN' },
              { value: 'de', label: 'DE' },
            ]}
          />
          <TextRow
            id="inc-web"
            label={t({ fr: 'Site web', en: 'Website', de: 'Website' })}
            value={form.website}
            onChange={(val) => setForm((f) => ({ ...f, website: val }))}
            placeholder="https://"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="px-4 py-2 text-sm" onClick={onClose}>
            {t({ fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' })}
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#0a1f44] px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!form.name.trim() || save.isPending}
            onClick={onSubmit}
          >
            {t({ fr: 'Enregistrer', en: 'Save', de: 'Speichern' })}
          </button>
        </div>
      </div>
    </div>
  );
}
