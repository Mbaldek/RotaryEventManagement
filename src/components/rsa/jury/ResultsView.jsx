// ResultsView — visible quand session_config.status = 'published'.
//
// Affiche le classement snapshoté (session_config.final_ranking jsonb) avec :
//   - colonnes : rang, nom, moyenne pondérée, nombre de jurés ;
//   - badge "Finaliste" sur les top-N (final_rank <= editions.finalists_per_session) ;
//   - tonalité gold sur la première position.
//
// Le composant lit le ranking depuis sessionConfig.final_ranking ; pas de calcul JS
// (le RPC SQL est la source de vérité). Si la liste est vide, on rend un état neutre.

import React from 'react';
import { Trophy } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';

export default function ResultsView({ sessionConfig, finalistsPerSession = 1 }) {
  const { t } = useLang();
  const ranking = Array.isArray(sessionConfig?.final_ranking) ? sessionConfig.final_ranking : [];

  if (!ranking.length) {
    return (
      <p
        className="py-8 text-[15px] italic text-center"
        style={{ fontFamily: SERIF, color: MUTED }}
        role="status"
      >
        {t(UI.rankingEmpty)}
      </p>
    );
  }

  return (
    <div
      className="pt-4"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <h4
        className="text-[15px] mb-3"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {t(UI.rankingTitle)}
      </h4>
      <ol className="flex flex-col gap-1 list-none m-0 p-0">
        <li
          className="grid grid-cols-[40px_1fr_90px_60px_90px] gap-3 text-[11px] uppercase tracking-[0.1em] pb-1.5"
          style={{ color: MUTED, borderBottom: `1px solid ${CREAM2}` }}
        >
          <span>{t(UI.rankCol)}</span>
          <span>{t(UI.startupCol)}</span>
          <span className="text-right">{t(UI.avgCol)}</span>
          <span className="text-right">{t(UI.jurorsCol)}</span>
          <span />
        </li>
        {ranking.map((row) => {
          const isFinalist = Number(row.final_rank) <= Number(finalistsPerSession || 1);
          return (
            <li
              key={row.startup_id || row.startup}
              className="grid grid-cols-[40px_1fr_90px_60px_90px] gap-3 items-center py-2"
              style={{
                borderBottom: `1px solid ${CREAM2}`,
                background: isFinalist ? '#fdf6e8' : 'transparent',
                paddingLeft: 6,
                paddingRight: 6,
              }}
            >
              <span
                className="text-[14px] font-semibold tabular-nums"
                style={{ color: isFinalist ? GOLD : NAVY }}
              >
                {row.final_rank}
              </span>
              <span
                className="text-[14px] truncate"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {row.startup || '—'}
              </span>
              <span
                className="text-[13px] tabular-nums text-right"
                style={{ color: NAVY }}
              >
                {row.avg != null ? Number(row.avg).toFixed(2) : '—'}
              </span>
              <span
                className="text-[12px] tabular-nums text-right"
                style={{ color: INK }}
              >
                {row.n ?? '—'}
              </span>
              <span className="text-right">
                {isFinalist && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: GOLD, color: NAVY }}
                  >
                    <Trophy className="w-3 h-3" aria-hidden /> {t(UI.finalistBadge)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
