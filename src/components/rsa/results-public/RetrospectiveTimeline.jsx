// RetrospectiveTimeline — bande horizontale rétrospective des sessions
// publiées d'une édition (V3 visual sweep).
//
// Cousin de ConcoursTimeline (Concours dashboard) mais pour la page publique
// /Resultats : montre toutes les sessions de l'édition en mode RÉTROSPECTIF —
// chaque dot coloré par la palette de session + emoji content marker + nom du
// VAINQUEUR sous le dot.
//
// Pas de click → drawer (la page publique n'a pas de drawer scoring ; le
// détail des sessions est rendu plus bas dans la grille SessionCard).

import React, { useMemo } from 'react';
import { Eyebrow } from '@/components/design';
import { NAVY, GOLD, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import {
  getSessionPalette,
  getSessionEmoji,
} from '@/components/rsa/concours-dashboard/sessionTheme';
import { T as RES_T } from './i18n';

// Resolve a palmares-view row into the session shape sessionTheme expects.
function viewRowToSession(row, isFinale = false) {
  return {
    id: row.session_id,
    kind: isFinale ? 'finale' : (row.session_kind || 'qualifying'),
    name: row.session_name,
    theme: row.session_theme,
    config: {}, // la vue publique n'expose pas theme_color — fallback hash auto
  };
}

function shortDate(iso, lang) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function RetrospectiveTimeline({ palmares }) {
  const { t, lang } = useLang();
  const tT = t(RES_T);

  const items = useMemo(() => {
    if (!palmares) return [];
    const qual = palmares.qualifyingSessions || [];
    const finale = palmares.finaleSession || null;
    const all = qual.map((row, i) => ({ row, isFinale: false, index: i }));
    if (finale) all.push({ row: finale, isFinale: true, index: qual.length });
    return all
      .map(({ row, isFinale, index }) => {
        const session = viewRowToSession(row, isFinale);
        const ranking = Array.isArray(row.final_ranking) ? row.final_ranking : [];
        const winner = ranking.find((r) => Number(r.final_rank) === 1) || ranking[0] || null;
        return {
          row,
          isFinale,
          palette: getSessionPalette(session, index),
          emoji: getSessionEmoji(session),
          winnerName: winner?.name || winner?.startup_name || null,
        };
      })
      .sort((a, b) => {
        const da = a.row.session_date ? Date.parse(a.row.session_date) : 0;
        const db = b.row.session_date ? Date.parse(b.row.session_date) : 0;
        return da - db;
      });
  }, [palmares]);

  if (items.length === 0) {
    return (
      <section className="mb-12">
        <header className="mb-4">
          <Eyebrow>{tT.retrospectiveEyebrow}</Eyebrow>
          <h2
            className="text-[24px] md:text-[28px] font-normal leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {tT.retrospectiveLead}
          </h2>
        </header>
        <div
          className="text-[13px] italic px-4 py-6 rounded-[8px]"
          style={{ color: MUTED, background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          {tT.retrospectiveEmpty}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-14 md:mb-16">
      <header className="mb-6">
        <Eyebrow>{tT.retrospectiveEyebrow}</Eyebrow>
        <h2
          className="text-[24px] md:text-[28px] font-normal leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {tT.retrospectiveLead}
        </h2>
      </header>

      <div
        className="bg-white rounded-[10px] px-5 py-6 overflow-x-auto"
        style={{ border: `1px solid ${CREAM2}` }}
      >
        <div className="relative" style={{ minWidth: Math.max(items.length * 130, 600) }}>
          {/* Horizontal rail */}
          <div
            aria-hidden
            className="absolute left-0 right-0"
            style={{ top: 32, height: 2, background: CREAM2, borderRadius: 1 }}
          />
          {/* Gold accent rail underneath — symbolizes "the path to laurel" */}
          <div
            aria-hidden
            className="absolute"
            style={{
              top: 32,
              left: '5%',
              right: '5%',
              height: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)`,
              borderRadius: 1,
            }}
          />

          <div className="relative flex items-start">
            {items.map((it) => {
              const isFinale = it.isFinale;
              const dot = (
                <div
                  className="relative"
                  style={{
                    width: isFinale ? 22 : 18,
                    height: isFinale ? 22 : 18,
                    borderRadius: '50%',
                    background: isFinale ? GOLD : it.palette.primary,
                    border: `2px solid white`,
                    boxShadow: `0 0 0 3px ${it.palette.light}, 0 1px 4px rgba(15,31,61,0.08)`,
                  }}
                />
              );
              return (
                <div
                  key={it.row.session_id}
                  className="flex-1 min-w-[130px] flex flex-col items-center text-center"
                >
                  {/* Date above */}
                  <div
                    className="text-[10.5px] uppercase tracking-[0.12em] font-medium mb-2"
                    style={{ color: MUTED }}
                  >
                    {shortDate(it.row.session_date, lang) || '—'}
                  </div>
                  {/* Dot */}
                  <div className="relative" style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                    {dot}
                  </div>
                  {/* Theme/eyebrow + name + winner below */}
                  <div className="mt-3 max-w-[130px] px-1">
                    <div className="flex items-center justify-center gap-1 text-[10.5px] mb-0.5">
                      {it.emoji && <span aria-hidden style={{ fontSize: 11 }}>{it.emoji}</span>}
                      <span
                        className="uppercase tracking-[0.1em] font-semibold truncate"
                        style={{ color: it.palette.primary, maxWidth: 100 }}
                      >
                        {it.row.session_theme || it.row.session_name || ''}
                      </span>
                    </div>
                    <div
                      className="text-[10.5px] truncate"
                      style={{ color: MUTED, maxWidth: 130 }}
                    >
                      {it.row.session_name || '—'}
                    </div>
                    {it.winnerName && (
                      <div
                        className={`text-[12.5px] mt-1.5 leading-tight truncate font-medium ${isFinale ? '' : ''}`}
                        style={{
                          color: isFinale ? '#9a6400' : NAVY,
                          fontFamily: SERIF,
                          maxWidth: 130,
                        }}
                        title={it.winnerName}
                      >
                        {isFinale ? '🏆 ' : ''}
                        {it.winnerName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
