// ResultsTab — onglet « Résultats » du cockpit admin (Module 4a).
//
// Deux vues empilées :
//   A. Per-session : palmarès de la session sélectionnée. Trois cas :
//       * status='draft' ou 'live' : message « il faut d'abord verrouiller la session ».
//       * status='locked'          : ranking calculé live à partir de platform_jury_scores
//                                    (preview avant publish) + bouton « Publier les résultats »
//                                    (typed-confirm "PUBLIER").
//       * status='published'       : lecture de session_config.final_ranking + bouton CSV.
//   B. Per-edition cross-session view : carte par session avec son StatusPill + lien LIVE→.

import React, { useMemo, useState } from 'react';
import { Loader2, Rocket, Download } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF } from '@/components/design/tokens';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { weightedScore } from '@/lib/rsa/constants';
import { UI, RESULTS } from '../i18n';
import { exportCsv, useLockSession, usePublishSession, useSessionResults } from '../useAdmin';

function ConfirmModal({ title, body, onConfirm, onCancel, busy, typedWord }) {
  const { t } = useLang();
  const [typed, setTyped] = useState('');
  const ok = typedWord ? typed === typedWord : true;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 31, 61, 0.45)' }}>
      <div className="bg-white rounded-[4px] max-w-md w-full p-5" style={{ border: `1px solid ${CREAM2}` }}>
        <h3 className="text-[16px] font-medium mb-2" style={{ color: NAVY, fontFamily: SERIF }}>{title}</h3>
        <p className="text-[13px] mb-3" style={{ color: INK }}>{body}</p>
        {typedWord && (
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={typedWord}
            className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 mb-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          />
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 text-[12.5px] rounded-[4px]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(UI.cancel)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !ok}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium rounded-[4px] disabled:opacity-50"
            style={{ background: GOLD, color: NAVY }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t(RESULTS.publish)}
          </button>
        </div>
      </div>
    </div>
  );
}

// Build a preview ranking from raw platform_jury_scores rows (twin du SQL rsa_publish_session).
function buildPreviewRanking(scores) {
  const byStartup = new Map();
  for (const s of scores) {
    const w = weightedScore(s);
    if (w == null) continue;
    if (!byStartup.has(s.startup_id)) byStartup.set(s.startup_id, []);
    byStartup.get(s.startup_id).push(w);
  }
  const rows = [];
  for (const [startup_id, ws] of byStartup.entries()) {
    rows.push({
      startup_id,
      avg: ws.reduce((a, b) => a + b, 0) / ws.length,
      n: ws.length,
    });
  }
  rows.sort((a, b) => (b.avg - a.avg));
  return rows.map((r, idx) => ({ ...r, final_rank: idx + 1 }));
}

// Resolves a startup label from the published ranking shape (may carry .startup or
// .startup_name) or from the preview shape (we have only id, so we fall back to id).
function startupLabel(row, startupsById) {
  if (row.startup) return row.startup;
  if (row.startup_name) return row.startup_name;
  if (row.startup_id && startupsById.get(row.startup_id)) return startupsById.get(row.startup_id);
  return row.startup_id || '—';
}

export default function ResultsTab({ edition, session, sessions, onSelectSession }) {
  const { t } = useLang();
  const results = useSessionResults(session?.id);
  const lock = useLockSession();
  const publish = usePublishSession();
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Build a lookup id → name from the sessions startups list we already have.
  // We don't have startups here directly ; for the published case the snapshot carries
  // startup_name. For the preview case, we expose ids (acceptable pre-publish — admin
  // sees the LIVE tab for names).
  const startupsById = useMemo(() => new Map(), []); // intentionally empty (see comment above)

  const cfg = results.data?.config || null;
  const scores = results.data?.scores || [];
  const status = cfg?.status || 'draft';

  const previewRanking = useMemo(() => buildPreviewRanking(scores), [scores]);

  async function doPublish() {
    setConfirmPublish(false);
    try { await publish.mutateAsync(session.id); } catch (e) { console.error(e); }
  }

  function downloadCsv() {
    // Prefer published snapshot for fidelity (it carries names) ; fall back to preview.
    const isPublished = status === 'published' && Array.isArray(cfg?.final_ranking) && cfg.final_ranking.length;
    const rows = isPublished
      ? cfg.final_ranking.map((r) => ({
          rank: r.final_rank,
          startup: r.startup ?? r.startup_name ?? '',
          avg: r.avg ?? '',
          juror_count: r.n ?? '',
        }))
      : previewRanking.map((r) => ({
          rank: r.final_rank,
          startup: startupLabel(r, startupsById),
          avg: r.avg.toFixed(2),
          juror_count: r.n,
        }));
    exportCsv(`rsa-${session.id}-results.csv`, rows);
  }

  if (!edition) return null;
  if (!session) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(RESULTS.noPublishedYet)}</p>
      </div>
    );
  }

  return (
    <>
      {/* A. Per-session palmares */}
      <section
        className="rounded-[4px] p-5 mb-6"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <header className="mb-4 flex items-center gap-3 flex-wrap">
          <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(RESULTS.sectionPerSession)}
          </h3>
          <span className="text-[12px]" style={{ color: MUTED }}>·</span>
          <span className="text-[13px]" style={{ color: INK }}>{session.name}</span>
          <StatusPill status={status} kind="jury" />
          <div className="ml-auto flex items-center gap-2">
            {status === 'locked' && (
              <button
                type="button"
                onClick={() => setConfirmPublish(true)}
                disabled={publish.isPending}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
                style={{ background: GOLD, color: NAVY }}
              >
                {publish.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {t(RESULTS.publish)}
              </button>
            )}
            {(status === 'published' || status === 'locked') && (
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              >
                <Download className="w-4 h-4" /> {t(RESULTS.csv)}
              </button>
            )}
          </div>
        </header>

        {results.isLoading && (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
        )}

        {!results.isLoading && (status === 'draft' || status === 'live') && (
          <div className="rounded-[4px] p-3" style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: INK }}>
            <p className="text-[13px]">{t(RESULTS.needLock)}</p>
            {status === 'live' && (
              <button
                type="button"
                onClick={() => lock.mutateAsync(session.id)}
                disabled={lock.isPending}
                className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
                style={{ background: NAVY, color: 'white' }}
              >
                {lock.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t(RESULTS.publishConfirmTitle)} →
              </button>
            )}
          </div>
        )}

        {!results.isLoading && status === 'locked' && previewRanking.length === 0 && (
          <p className="text-[13px]" style={{ color: MUTED }}>{t(RESULTS.noRanking)}</p>
        )}

        {!results.isLoading && status === 'locked' && previewRanking.length > 0 && (
          <RankingTable rows={previewRanking} variant="preview" startupsById={startupsById} />
        )}

        {!results.isLoading && status === 'published' && (
          <>
            {cfg?.published_at && (
              <p className="text-[11.5px] mb-2" style={{ color: MUTED }}>
                {t(RESULTS.publishedAt)} {String(cfg.published_at).slice(0, 19).replace('T', ' ')}
              </p>
            )}
            {Array.isArray(cfg?.final_ranking) && cfg.final_ranking.length > 0 ? (
              <RankingTable rows={cfg.final_ranking} variant="published" startupsById={startupsById} />
            ) : (
              <p className="text-[13px]" style={{ color: MUTED }}>{t(RESULTS.noRanking)}</p>
            )}
          </>
        )}
      </section>

      {/* B. Cross-session view */}
      <section
        className="rounded-[4px] p-5 mb-6"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <header className="mb-4 flex items-center gap-3 flex-wrap">
          <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
            {t(RESULTS.sectionCross)}
          </h3>
        </header>
        {(sessions || []).length === 0 ? (
          <p className="text-[13px]" style={{ color: MUTED }}>{t(RESULTS.noPublishedYet)}</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(sessions || []).map((s) => {
              const st = s.config?.status || 'draft';
              const finalRanking = Array.isArray(s.config?.final_ranking) ? s.config.final_ranking : [];
              const top = finalRanking.length ? (finalRanking[0]?.startup || finalRanking[0]?.startup_name || '—') : null;
              return (
                <li
                  key={s.id}
                  className="rounded-[4px] p-3"
                  style={{ background: 'white', border: `1px solid ${CREAM2}` }}
                >
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium" style={{ color: NAVY }}>{s.name}</span>
                        <StatusPill status={st} kind="jury" />
                      </div>
                      {top && (
                        <p className="text-[12.5px] mt-1" style={{ color: INK, fontFamily: SERIF, fontStyle: 'italic' }}>
                          {top}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectSession?.(s.id)}
                      className="text-[11.5px] underline decoration-1 underline-offset-2"
                      style={{ color: NAVY }}
                    >
                      →
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {confirmPublish && (
        <ConfirmModal
          title={t(RESULTS.publishConfirmTitle)}
          body={t(RESULTS.publishConfirmBody)}
          typedWord="PUBLIER"
          onConfirm={doPublish}
          onCancel={() => setConfirmPublish(false)}
          busy={publish.isPending}
        />
      )}
    </>
  );
}

function RankingTable({ rows, variant, startupsById }) {
  const { t } = useLang();
  return (
    <div className="overflow-x-auto rounded-[4px]" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
      <table className="min-w-full">
        <thead style={{ borderBottom: `1px solid ${CREAM2}` }}>
          <tr>
            <th className="text-left p-3 uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
              {t(RESULTS.rankCol)}
            </th>
            <th className="text-left p-3 uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
              {t(RESULTS.startupCol)}
            </th>
            <th className="text-right p-3 uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
              {t(RESULTS.avgCol)}
            </th>
            <th className="text-right p-3 uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
              {t(RESULTS.jurorsCol)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.startup_id || r.startup_name || idx} style={{ borderTop: idx === 0 ? 'none' : `1px solid ${CREAM2}` }}>
              <td className="p-3 text-[13px] tabular-nums" style={{ color: NAVY, fontWeight: 600 }}>
                #{r.final_rank ?? idx + 1}
              </td>
              <td className="p-3 text-[13px]" style={{ color: NAVY }}>
                {variant === 'published'
                  ? (r.startup ?? r.startup_name ?? '—')
                  : startupLabel(r, startupsById)}
              </td>
              <td className="p-3 text-right tabular-nums" style={{ color: GOLD, fontWeight: 600 }}>
                {typeof r.avg === 'number' ? r.avg.toFixed(2) : (r.avg ?? '—')}
              </td>
              <td className="p-3 text-right tabular-nums text-[12.5px]" style={{ color: MUTED }}>
                {r.n ?? r.juror_count ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
