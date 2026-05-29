// ClubsBreakdownChart — bar chart horizontal Recharts (master_admin only) :
// pour chaque club, count des candidatures + secondaire (sélectionnées + lauréates).
//
// Props :
//   - rows : array depuis useAnalyticsClubs (jamais null — la RPC retourne [])
//   - loading, error : states
//   - height : px, défaut auto (≈ 36px / club + 80 header)

import React from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { ANALYTICS_UI } from './i18n';

function TooltipBox({ active, payload, label }) {
  const { t } = useLang();
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-[4px] p-2.5 text-[12px]"
      style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
    >
      <p
        className="mb-1.5 text-[12.5px]"
        style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tabular-nums" style={{ color: NAVY }}>
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ background: p.color }}
            aria-hidden
          />
          {t({ fr: 'Candidatures', en: 'Applications', de: 'Bewerbungen' }) /* fallback if no dict key */}
          {/* fallback safe — the key is mapped via translatedKey passed in payload.name */}
          {p.name ? ` · ${p.name}` : ''}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function ClubsBreakdownChart({
  rows,
  loading = false,
  error = false,
  height,
}) {
  const { t } = useLang();

  if (loading) {
    return (
      <div
        className="rounded-[4px] flex items-center justify-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}`, height: 240 }}
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
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: INK }}>{t(ANALYTICS_UI.errorBody)}</p>
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p
          className="text-[14px] mb-1"
          style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
        >
          {t(ANALYTICS_UI.emptyTitle)}
        </p>
        <p className="text-[12.5px]" style={{ color: MUTED }}>{t(ANALYTICS_UI.clubsEmpty)}</p>
      </div>
    );
  }

  // On limite à 20 clubs pour préserver la lisibilité du bar chart.
  const data = rows.slice(0, 20).map((r) => ({
    club: r.club_name || r.club_id,
    applied: r.applied || 0,
    selected: r.selected || 0,
    finaliste: r.finaliste || 0,
  }));

  const dynamicHeight = height || Math.max(240, 48 + data.length * 36);

  return (
    <div
      className="rounded-[4px] p-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}`, height: dynamicHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke={CREAM2} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: MUTED, fontSize: 10 }}
            tickLine={{ stroke: CREAM2 }}
            axisLine={{ stroke: CREAM2 }}
          />
          <YAxis
            type="category"
            dataKey="club"
            tick={{ fill: INK, fontSize: 11 }}
            tickLine={{ stroke: CREAM2 }}
            axisLine={{ stroke: CREAM2 }}
            width={120}
          />
          <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(15,31,61,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: MUTED, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="applied"   name={t(ANALYTICS_UI.kpiApplied)}   fill={NAVY} radius={[0, 2, 2, 0]} />
          <Bar dataKey="selected"  name={t(ANALYTICS_UI.kpiSelected)}  fill="#3a4a6d" radius={[0, 2, 2, 0]} />
          <Bar dataKey="finaliste" name={t(ANALYTICS_UI.kpiFinaliste)} fill={GOLD} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
