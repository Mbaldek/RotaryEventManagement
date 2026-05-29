// JuryActivityTable — DataTable Élysée (pattern catalog §5.1).
//
// Affiche par juré : sessions assignées, sessions scorées, notes soumises,
// taux de complétion, temps moyen jusqu'à la note. Tri default par
// nombre de scores soumis DESC (déjà fait côté RPC).
//
// Props :
//   - rows : array depuis useAnalyticsJury
//   - loading, error : flags

import React from 'react';
import { Loader2 } from 'lucide-react';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { ANALYTICS_UI } from './i18n';

function shortId(id) {
  if (!id) return '—';
  return String(id).slice(0, 8);
}

function jurorLabel(row) {
  // Préfère qualite, sinon organisation, sinon shortId.
  return row.qualite || row.organisation || shortId(row.jury_user_id);
}

export default function JuryActivityTable({
  rows,
  loading = false,
  error = false,
}) {
  const { t } = useLang();

  if (loading) {
    return (
      <div
        className="rounded-[4px] p-6 flex items-center justify-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
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
        <p className="text-[12.5px]" style={{ color: MUTED }}>{t(ANALYTICS_UI.juryEmpty)}</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[4px]"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <table
        role="table"
        className="w-full text-[13px]"
        style={{ borderCollapse: 'collapse' }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <th
              scope="col"
              className="px-4 py-2.5 text-left uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColJuror)}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColAssign)}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColScored)}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColScores)}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColCompletion)}
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-right uppercase tracking-[0.12em] text-[10.5px] font-medium"
              style={{ color: MUTED }}
            >
              {t(ANALYTICS_UI.juryColAvgTime)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const isLast = idx === rows.length - 1;
            const completion = r.completion_rate != null ? Number(r.completion_rate) : 0;
            const completionColor = completion >= 80 ? GOLD : NAVY;
            return (
              <tr
                key={r.jury_user_id}
                style={{ borderBottom: isLast ? 'none' : `1px solid ${CREAM2}` }}
              >
                <td className="px-4 py-3" style={{ color: NAVY }}>
                  <div className="flex flex-col">
                    <span className="font-medium">{jurorLabel(r)}</span>
                    {r.organisation && r.qualite && (
                      <span className="text-[11px]" style={{ color: MUTED }}>
                        {r.organisation}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: INK }}>
                  {r.assignments_count ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: INK }}>
                  {r.scores_submitted_sessions ?? 0}
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: INK }}>
                  {r.scores_submitted ?? 0}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums font-medium"
                  style={{ color: completionColor }}
                >
                  {completion.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums" style={{ color: INK }}>
                  {r.avg_time_to_score_hours != null
                    ? `${Number(r.avg_time_to_score_hours).toFixed(1)}${t(ANALYTICS_UI.juryAvgTimeUnit)}`
                    : t(ANALYTICS_UI.juryUnknown)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
