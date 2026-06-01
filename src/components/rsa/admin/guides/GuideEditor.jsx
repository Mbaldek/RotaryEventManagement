// GuideEditor — édite un article de guide en 3 langues (FR/EN/DE) avec aperçu
// markdown live. Contrôlé : reçoit `value` (l'article) + onChange + onSave + onCancel.

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { NAVY, GOLD, INK, MUTED, CREAM, CREAM2 } from '@/components/design/tokens';
import { useLang, LANGS } from '@/lib/platform/i18n';

export default function GuideEditor({ value, onChange, onSave, onCancel, saving }) {
  const { t } = useLang();
  const [editLang, setEditLang] = useState('fr');

  const title = value.title || {};
  const body = value.body_md || {};

  const setField = (field, lang, v) =>
    onChange({ ...value, [field]: { ...(value[field] || {}), [lang]: v } });

  return (
    <div className="rounded-[6px] p-4" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      {/* Onglets langue */}
      <div className="flex items-center gap-1.5 mb-4">
        {LANGS.map((l) => {
          const on = editLang === l;
          const filled = !!(title[l] || body[l]);
          return (
            <button
              key={l}
              type="button"
              onClick={() => setEditLang(l)}
              className="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.08em] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] inline-flex items-center gap-1.5"
              style={{
                background: on ? GOLD : 'transparent',
                color: on ? NAVY : MUTED,
                border: `1px solid ${on ? GOLD : CREAM2}`,
              }}
            >
              {l}
              {filled && <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? NAVY : GOLD }} aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Titre */}
      <input
        type="text"
        value={title[editLang] || ''}
        onChange={(e) => setField('title', editLang, e.target.value)}
        placeholder={`Titre (${editLang})`}
        className="w-full mb-3 px-3 py-2 rounded-[4px] text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
        style={{ border: `1px solid ${CREAM2}`, color: NAVY }}
      />

      {/* Corps + aperçu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <textarea
          value={body[editLang] || ''}
          onChange={(e) => setField('body_md', editLang, e.target.value)}
          placeholder={`Corps markdown (${editLang})`}
          rows={12}
          className="w-full px-3 py-2 rounded-[4px] text-[13px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ border: `1px solid ${CREAM2}`, color: INK, resize: 'vertical' }}
        />
        <div
          className="guide-prose px-3 py-2 rounded-[4px] text-[13px] overflow-auto"
          style={{ border: `1px solid ${CREAM2}`, background: CREAM, color: INK, minHeight: 120 }}
        >
          <ReactMarkdown>{body[editLang] || '_Aperçu_'}</ReactMarkdown>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <label className="inline-flex items-center gap-2 text-[13px]" style={{ color: NAVY }}>
          <input
            type="checkbox"
            checked={!!value.is_published}
            onChange={(e) => onChange({ ...value, is_published: e.target.checked })}
          />
          {t({ fr: 'Publié', en: 'Published', de: 'Veröffentlicht' })}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-[4px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            style={{ border: `1px solid ${CREAM2}`, color: MUTED, background: 'white' }}
          >
            {t({ fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' })}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {t({ fr: 'Enregistrer', en: 'Save', de: 'Speichern' })}
          </button>
        </div>
      </div>
    </div>
  );
}
