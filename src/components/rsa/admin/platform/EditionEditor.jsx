// EditionEditor — formulaire d'édition d'une `editions` row (Module 4a, SETUP).
//
// Champs : name, status (enum), dates (4), prix (2), finalists_per_session,
// public_results_enabled (toggle), description_md (markdown libre),
// eligibility_rules (JSON éditable avec preview RULE_LABELS).
//
// Pas de fenêtre modale séparée : on édite inline dans une carte hairline (le picker
// d'édition est dans AdminShell, on ne gère donc qu'une édition à la fois ici).
//
// Le SAVE est triggable via le bouton "Enregistrer" en bas du form (pas d'autosave
// pour éviter les overwrites involontaires sur des champs JSON).

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { RULE_LABELS } from '@/components/rsa/candidature/i18n';
import { UI, SETUP, EDITION_STATUSES } from './i18n';
import { useUpdateEdition } from './useAdmin';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

function TextRow({ id, label, value, onChange, type = 'text', placeholder, step }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
      />
    </div>
  );
}

function asNumberOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EditionEditor({ edition }) {
  const { t } = useLang();
  const update = useUpdateEdition();

  const [form, setForm] = useState(() => ({}));
  const [rulesText, setRulesText] = useState('{}');
  const [rulesError, setRulesError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Re-hydrate quand l'édition change (sans écraser dirty=true en cours).
  useEffect(() => {
    if (!edition) return;
    setForm({
      name: edition.name || '',
      year: edition.year || '',
      status: edition.status || 'draft',
      application_open: edition.application_open || '',
      application_close: edition.application_close || '',
      selection_date: edition.selection_date || '',
      finale_date: edition.finale_date || '',
      awards_date: edition.awards_date || '',
      prize_main: edition.prize_main ?? '',
      prize_special: edition.prize_special ?? '',
      finalists_per_session: edition.finalists_per_session ?? 1,
      public_results_enabled: !!edition.public_results_enabled,
      description_md: edition.description_md || '',
    });
    setRulesText(JSON.stringify(edition.eligibility_rules || {}, null, 2));
    setRulesError(null);
    setDirty(false);
    setFeedback(null);
  }, [edition?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const parsedRules = useMemo(() => {
    if (!rulesText || !rulesText.trim()) return {};
    try {
      const v = JSON.parse(rulesText);
      if (typeof v !== 'object' || Array.isArray(v) || v === null) {
        throw new Error('not_object');
      }
      return v;
    } catch (_e) {
      return null; // signale l'erreur
    }
  }, [rulesText]);

  function patch(part) {
    setForm((prev) => ({ ...prev, ...part }));
    setDirty(true);
    setFeedback(null);
  }

  function onRulesChange(v) {
    setRulesText(v);
    setDirty(true);
    setFeedback(null);
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('not_object');
      }
      setRulesError(null);
    } catch {
      setRulesError(t(SETUP.invalidJson));
    }
  }

  async function onSave() {
    if (!edition) return;
    if (rulesError || parsedRules == null) return;
    const payload = {
      name: form.name?.trim() || edition.name,
      year: form.year != null ? Number(form.year) : edition.year,
      status: form.status || edition.status,
      application_open: form.application_open || null,
      application_close: form.application_close || null,
      selection_date: form.selection_date || null,
      finale_date: form.finale_date || null,
      awards_date: form.awards_date || null,
      prize_main: asNumberOrNull(form.prize_main),
      prize_special: asNumberOrNull(form.prize_special),
      finalists_per_session: form.finalists_per_session != null ? Number(form.finalists_per_session) : 1,
      public_results_enabled: !!form.public_results_enabled,
      description_md: form.description_md || null,
      eligibility_rules: parsedRules,
    };
    try {
      await update.mutateAsync({ id: edition.id, patch: payload });
      setDirty(false);
      setFeedback({ kind: 'ok', message: t(UI.saved) });
    } catch (err) {
      setFeedback({ kind: 'err', message: err?.message || 'Error' });
    }
  }

  if (!edition) return null;

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(SETUP.editEdition)}
        </h3>
        <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: GOLD }}>
          {edition.id}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextRow
          id="ed-name"
          label={t(SETUP.editionName)}
          value={form.name}
          onChange={(v) => patch({ name: v })}
        />
        <TextRow
          id="ed-year"
          label={t(SETUP.editionYear)}
          type="number"
          value={form.year}
          onChange={(v) => patch({ year: v })}
        />
        <div>
          <FieldLabel htmlFor="ed-status">{t(SETUP.editionStatus)}</FieldLabel>
          <select
            id="ed-status"
            value={form.status || 'draft'}
            onChange={(e) => patch({ status: e.target.value })}
            className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            {EDITION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <TextRow
          id="ed-finalists-n"
          label={t(SETUP.finalistsPerSession)}
          type="number"
          value={form.finalists_per_session}
          onChange={(v) => patch({ finalists_per_session: v })}
        />
        <TextRow id="ed-app-open"   label={t(SETUP.appOpen)}        type="date" value={form.application_open}  onChange={(v) => patch({ application_open: v })} />
        <TextRow id="ed-app-close"  label={t(SETUP.appClose)}       type="date" value={form.application_close} onChange={(v) => patch({ application_close: v })} />
        <TextRow id="ed-sel-date"   label={t(SETUP.selectionDate)}  type="date" value={form.selection_date}    onChange={(v) => patch({ selection_date: v })} />
        <TextRow id="ed-fin-date"   label={t(SETUP.finaleDate)}     type="date" value={form.finale_date}       onChange={(v) => patch({ finale_date: v })} />
        <TextRow id="ed-awd-date"   label={t(SETUP.awardsDate)}     type="date" value={form.awards_date}       onChange={(v) => patch({ awards_date: v })} />
        <TextRow id="ed-prize-main" label={t(SETUP.prizeMain)}      type="number" step="0.01" value={form.prize_main}    onChange={(v) => patch({ prize_main: v })} />
        <TextRow id="ed-prize-spec" label={t(SETUP.prizeSpecial)}   type="number" step="0.01" value={form.prize_special} onChange={(v) => patch({ prize_special: v })} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          id="ed-public-results"
          type="checkbox"
          checked={!!form.public_results_enabled}
          onChange={(e) => patch({ public_results_enabled: e.target.checked })}
        />
        <label htmlFor="ed-public-results" className="text-[13px]" style={{ color: NAVY }}>
          {t(SETUP.publicResultsEnabled)}
        </label>
        <span className="text-[11.5px]" style={{ color: MUTED }}>· {t(SETUP.publicResultsHint)}</span>
      </div>

      <div className="mt-4">
        <FieldLabel htmlFor="ed-desc">{t(SETUP.descriptionMd)}</FieldLabel>
        <textarea
          id="ed-desc"
          rows={3}
          value={form.description_md || ''}
          onChange={(e) => patch({ description_md: e.target.value })}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="ed-rules">{t(SETUP.eligibilityRules)}</FieldLabel>
          <textarea
            id="ed-rules"
            rows={10}
            value={rulesText}
            onChange={(e) => onRulesChange(e.target.value)}
            className="w-full text-[12px] font-mono rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${rulesError ? '#a23b2d' : CREAM2}`, color: NAVY }}
          />
          <p className="mt-1 text-[11px]" style={{ color: rulesError ? '#a23b2d' : MUTED }}>
            {rulesError || t(SETUP.eligibilityHint)}
          </p>
        </div>
        <div>
          <FieldLabel>Preview</FieldLabel>
          <ul className="text-[12.5px] space-y-1.5" style={{ color: INK }}>
            {parsedRules && Object.entries(parsedRules).map(([key, val]) => {
              const labelDict = RULE_LABELS[key];
              const labelTxt = labelDict ? t(labelDict) : key;
              const behavior = val?.behavior || '—';
              return (
                <li key={key} className="flex items-baseline gap-2">
                  <span className="font-medium" style={{ color: NAVY }}>{labelTxt}</span>
                  <span style={{ color: MUTED }}>·</span>
                  <span style={{ color: behavior === 'exclu' ? '#a23b2d' : '#9a6400' }}>{behavior}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || update.isPending || !!rulesError}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}
        >
          {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {update.isPending ? t(UI.saving) : t(UI.save)}
        </button>
        {feedback?.kind === 'ok' && (
          <span className="text-[12.5px]" style={{ color: '#1d6b4f' }}>{feedback.message}</span>
        )}
        {feedback?.kind === 'err' && (
          <span className="text-[12.5px]" style={{ color: '#a23b2d' }}>{feedback.message}</span>
        )}
      </div>
    </section>
  );
}
