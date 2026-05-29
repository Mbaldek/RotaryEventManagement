// FinaleSection — onglet « Finale » du funnel et de l'édition de compétition.
//
// La Finale est désormais une ENTITÉ CONFIGURABLE attachée à toute édition,
// monoclub OU multiclub. Contrôles :
//   * has_finale (toggle on/off)        — flag éditorial sur l'édition.
//   * finale_config (jsonb, libre)       — quand has_finale=true :
//       - name (string)
//       - date (YYYY-MM-DD)
//       - location (string)
//       - format.pitch_min / format.qa_min (int)
//       - jury_pool_size (int, default 7)
//       - promote_top_n (int, default 1) — override editions.finalists_per_session
//         lors du publish d'une session qualificative
//
// Composant contrôlé : lit `values.has_finale` + `values.finale_config`, émet
// onPatch({ has_finale, finale_config }) à chaque change. L'autosave debounced
// est piloté côté parent (useAutosaveCompetition).

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import { MUTED, INK, CREAM2, NAVY, GOLD, SERIF, TINT_BEIGE, TINT_ADMIN } from '@/components/design/tokens';
import { COMP, FINALE } from '../i18n';
import { CheckboxRow, FieldLabel, TextRow } from './fields';

function ensureConfig(cfg) {
  return (cfg && typeof cfg === 'object') ? cfg : {};
}

function ensureFormat(cfg) {
  const fmt = ensureConfig(cfg).format;
  return (fmt && typeof fmt === 'object') ? fmt : {};
}

export default function FinaleSection({ values = {}, onPatch, disabled = false }) {
  const { t } = useLang();
  const enabled = !!values.has_finale;
  const cfg = ensureConfig(values.finale_config);
  const fmt = ensureFormat(cfg);

  function setConfig(partial) {
    onPatch({ finale_config: { ...cfg, ...partial } });
  }
  function setFormat(partial) {
    onPatch({ finale_config: { ...cfg, format: { ...fmt, ...partial } } });
  }

  return (
    <div
      className="rounded-[4px] p-5 space-y-5"
      role="region"
      aria-labelledby="competition-finale-section-heading"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="space-y-2">
        <h3
          id="competition-finale-section-heading"
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(FINALE.editionFinaleTitle)}
        </h3>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(FINALE.editionFinaleIntro)}
        </p>
      </header>

      <CheckboxRow
        id="comp-has-finale"
        label={t(FINALE.editionHasFinaleLabel)}
        hint={t(FINALE.editionHasFinaleHint)}
        checked={enabled}
        onChange={(v) => onPatch({ has_finale: !!v })}
        disabled={disabled}
      />

      {!enabled && (
        <p
          className="text-[12.5px] py-2 px-3 rounded-[4px]"
          style={{ background: TINT_BEIGE, color: INK, border: `1px solid ${CREAM2}` }}
        >
          {t(FINALE.editionFinaleDisabledNote)}
        </p>
      )}

      {enabled && (
        <div
          className="rounded-[4px] p-5 space-y-5"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextRow
              id="finale-cfg-name"
              label={t(FINALE.cfgNameLabel)}
              hint={t(FINALE.cfgNameHint)}
              value={cfg.name || ''}
              onChange={(v) => setConfig({ name: v })}
              placeholder="Grande Finale 2027"
              disabled={disabled}
            />
            <TextRow
              id="finale-cfg-date"
              label={t(FINALE.cfgDateLabel)}
              type="date"
              value={cfg.date || ''}
              onChange={(v) => setConfig({ date: v || null })}
              disabled={disabled}
            />
            <TextRow
              id="finale-cfg-location"
              label={t(FINALE.cfgLocationLabel)}
              hint={t(FINALE.cfgLocationHint)}
              value={cfg.location || ''}
              onChange={(v) => setConfig({ location: v })}
              placeholder="50 bd Haussmann, Paris 9"
              disabled={disabled}
            />
            <TextRow
              id="finale-cfg-jury-size"
              label={t(FINALE.cfgJurySizeLabel)}
              hint={t(FINALE.cfgJurySizeHint)}
              type="number"
              value={cfg.jury_pool_size ?? 7}
              onChange={(v) => setConfig({ jury_pool_size: v === '' ? null : Number(v) })}
              disabled={disabled}
            />
          </div>

          <div>
            <FieldLabel>{t(FINALE.cfgFormatLabel)}</FieldLabel>
            <p className="text-[11.5px] mt-0.5 mb-2" style={{ color: MUTED }}>
              {t(FINALE.cfgFormatHint)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextRow
                id="finale-cfg-pitch-min"
                label={t(FINALE.cfgPitchMinLabel)}
                type="number"
                value={fmt.pitch_min ?? 12}
                onChange={(v) => setFormat({ pitch_min: v === '' ? null : Number(v) })}
                disabled={disabled}
              />
              <TextRow
                id="finale-cfg-qa-min"
                label={t(FINALE.cfgQaMinLabel)}
                type="number"
                value={fmt.qa_min ?? 8}
                onChange={(v) => setFormat({ qa_min: v === '' ? null : Number(v) })}
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="finale-cfg-promote-top-n">
              {t(FINALE.cfgPromoteTopNLabel)}
            </FieldLabel>
            <p className="text-[11.5px] mt-0.5 mb-2" style={{ color: MUTED }}>
              {t(FINALE.cfgPromoteTopNHint)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextRow
                id="finale-cfg-promote-top-n"
                label={t(FINALE.cfgPromoteTopNFieldLabel)}
                type="number"
                value={cfg.promote_top_n ?? 1}
                onChange={(v) => setConfig({ promote_top_n: v === '' ? null : Number(v) })}
                disabled={disabled}
              />
              <div
                className="rounded-[4px] p-3 self-end text-[11.5px]"
                style={{ background: '#fdf6e8', color: INK, border: `1px solid ${CREAM2}` }}
              >
                <span style={{ color: GOLD, fontWeight: 500 }}>{t(COMP.tabRules)}</span>
                {' · '}
                {t(FINALE.cfgPromoteTopNPriority).replace(
                  '{fallback}',
                  String(values.finalists_per_session ?? 1),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
