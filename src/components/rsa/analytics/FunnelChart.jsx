// FunnelChart — bar chart vertical (BarChart Recharts) sur les 7 étapes du
// funnel (applied → laureat). Palette Élysée NAVY → GOLD (NAVY pour les
// premières étapes, GOLD pour finaliste/laureat).
//
// Données : tableau [{ key, count, pct_of_applied, pct_of_previous }, …].
//
// Props :
//   - stages : array (depuis useAnalyticsConversion)
//   - lang   : 'fr' | 'en' | 'de' (libellés des étapes localisés)
//   - loading, error, empty : flags pour states catalog §7
//   - height : px, défaut 280

import React from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { ANALYTICS_UI, STAGE_LABELS, FUNNEL_ORDER } from './i18n';

function colorForStage(key) {
  // Premières étapes NAVY, dernières GOLD — progression visuelle.
  if (key === 'laureat' || key === 'finaliste') return GOLD;
  if (key === 'scored' || key === 'selected') return '#3a4a6d'; // navy lighter
  return NAVY;
}

function TooltipBox({ active, payload, label }) {
  const { t } = useLang();
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload || {};
  return (
    <div
      className="rounded-[4px] p-2.5 text-[12px]"
      style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
    >
      <p
        className="mb-1 text-[12.5px]"
        style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
      >
        {label}
      </p>
      <p className="tabular-nums" style={{ color: NAVY }}>
        {d.count}
      </p>
      <p className="text-[11px]" style={{ color: MUTED }}>
        {d.pct_of_applied != null ? `${d.pct_of_applied}% ${t(ANALYTICS_UI.funnelStagePctOfApplied)}` : ''}
      </p>
      {d.pct_of_previous != null && (
        <p className="text-[11px]" style={{ color: MUTED }}>
          {d.pct_of_previous}% {t(ANALYTICS_UI.funnelStagePctOfPrevious)}
        </p>
      )}
    </div>
  );
}

export default function FunnelChart({
  stages,
  loading = false,
  error = false,
  height = 280,
}) {
  const { t, lang } = useLang();

  if (loading) {
    return (
      <div
        className="rounded-[4px] flex items-center justify-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, height }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} aria-hidden />
        <span className="sr-only">{t(ANALYTICS_UI.loading)}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, height }}
      >
        <p className="text-[13px]" style={{ color: INK }}>{t(ANALYTICS_UI.errorBody)}</p>
      </div>
    );
  }
  const allZero = !stages || stages.length === 0 || stages.every((s) => (s.count || 0) === 0);
  if (allZero) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, height }}
      >
        <p
          className="text-[14px] mb-1"
          style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
        >
          {t(ANALYTICS_UI.emptyTitle)}
        </p>
        <p className="text-[12.5px]" style={{ color: MUTED }}>
          {t(ANALYTICS_UI.emptyBody)}
        </p>
      </div>
    );
  }

  // Préserve l'ordre canonique (la RPC retourne déjà dans cet ordre, mais on
  // se prémunit contre un éventuel reorder).
  const ordered = FUNNEL_ORDER.map((key) => {
    const found = (stages || []).find((s) => s.key === key);
    return {
      key,
      label: STAGE_LABELS[key] ? (STAGE_LABELS[key][lang] || STAGE_LABELS[key].en) : key,
      count: found?.count ?? 0,
      pct_of_applied: found?.pct_of_applied ?? null,
      pct_of_previous: found?.pct_of_previous ?? null,
    };
  });

  return (
    <div
      className="rounded-[4px] p-4"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordered} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={CREAM2} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: MUTED, fontSize: 10 }}
            tickLine={{ stroke: CREAM2 }}
            axisLine={{ stroke: CREAM2 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: MUTED, fontSize: 10 }}
            tickLine={{ stroke: CREAM2 }}
            axisLine={{ stroke: CREAM2 }}
            width={32}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(15,31,61,0.04)' }} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {ordered.map((entry) => (
              <Cell key={entry.key} fill={colorForStage(entry.key)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
