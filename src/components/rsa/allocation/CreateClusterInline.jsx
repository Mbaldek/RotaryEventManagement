// src/components/rsa/allocation/CreateClusterInline.jsx
// Formulaire inline de création d'un cluster (= session qualifying).
import React, { useState } from 'react';
import { CREAM2, NAVY, INK } from '@/components/design/tokens';
import { Field, TextInput } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

export default function CreateClusterInline({ onCreate, onCancel, isPending }) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), theme: theme.trim(), sessionDate: sessionDate || null });
  };
  return (
    <form onSubmit={submit} className="rounded-[4px] p-4 mb-4 flex flex-col gap-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <Field label={t(UI.clusterName)} required>
        {({ id }) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />}
      </Field>
      <Field label={t(UI.clusterTheme)}>
        {({ id }) => <TextInput id={id} value={theme} onChange={(e) => setTheme(e.target.value)} disabled={isPending} />}
      </Field>
      <Field label={t(UI.clusterDate)}>
        {({ id }) => <TextInput id={id} type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} disabled={isPending} />}
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isPending}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px]" style={{ color: INK, border: `1px solid ${CREAM2}` }}>
          {t(UI.cancel)}
        </button>
        <button type="submit" disabled={isPending || !name.trim()}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px] text-white" style={{ background: NAVY }}>
          {t(UI.create)}
        </button>
      </div>
    </form>
  );
}
