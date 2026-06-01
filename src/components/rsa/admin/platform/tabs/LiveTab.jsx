// LiveTab — onglet « En direct » du cockpit (grille de scoring temps réel).
//
// NAME-KEYED (flux jury SANS COMPTE — cf. docs/blueprints/jury-no-account-scoring.md).
//   * Rows : startups du lineup, en ORDRE DE PASSAGE (startups.pitch_order).
//   * Cols : jurés APPROUVÉS de la session (jury_applications, via rsa_session_jurors).
//   * Cell : `—` / `n/6` (brouillon partiel) / `N.NN` (note finale) depuis
//            jury_scores / jury_score_drafts (clé = jury_name::startup_name).
//   * Realtime : sub Supabase sur jury_scores + jury_score_drafts filtrés session_id.
//   * Poids des critères = paramètre de session (session_config.score_weights) —
//     l'agrégat pondéré et le détail respectent ces poids.
//
// Le précédent câblage lisait le modèle AUTH (platform_jury_assignments /
// platform_jury_scores) où le flux name-pick n'écrit jamais → grille vide. On
// rebranche sur le store name-keyed. Lifecycle (status) reste dans session_config.
//
// Restyle Élysée : pas de zebra rows, hairline CREAM2, MUTED uppercase column headers,
// tabular-nums, StatusPill (kind=jury) sur le lifecycle.

import React, { useMemo, useState } from 'react';
import { Loader2, Lock, LockOpen, Play, Rocket, Undo2 } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { CRITERIA, weightedScore, resolveSessionWeights } from '@/lib/rsa/constants';
import { UI, LIVE } from '../i18n';
import ScoreCell from '../ScoreCell';
import SessionScoringAccess from '../club/session/SessionScoringAccess';
import {
  useNameKeyedLiveGrid,
  useLockSession,
  usePublishSession,
  useSessionConfig,
  useSetSessionDraft,
  useSetSessionLive,
  useUnlockSession,
} from '../useAdmin';

function ConfirmModal({ title, body, onConfirm, onCancel, busy, typedWord, kind = 'primary' }) {
  const { t } = useLang();
  const [typed, setTyped] = useState('');
  const ok = typedWord ? typed === typedWord : true;
  const accent = kind === 'danger' ? DANGER : NAVY;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 31, 61, 0.45)' }}>
      <div className="bg-white rounded-[4px] max-w-md w-full p-5" style={{ border: `1px solid ${CREAM2}` }}>
        <h3 className="text-[16px] font-medium mb-2" style={{ color: NAVY, fontFamily: SERIF }}>{title}</h3>
        <p className="text-[13px] mb-3 whitespace-pre-line" style={{ color: INK }}>{body}</p>
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
            style={{ background: accent, color: 'white' }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t(UI.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ row, jurorLabel, startupLabel, weights, onClose }) {
  const w = weightedScore(row, weights);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 31, 61, 0.45)' }}>
      <div className="bg-white rounded-[4px] max-w-md w-full p-5" style={{ border: `1px solid ${CREAM2}` }}>
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              {jurorLabel} → {startupLabel}
            </p>
            <p className="text-[18px] font-medium tabular-nums" style={{ color: NAVY, fontFamily: SERIF }}>
              {w != null ? `${w.toFixed(2)} / 5` : '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: MUTED }} aria-label="Fermer">×</button>
        </div>
        <ul className="space-y-1.5">
          {CRITERIA.map((c) => {
            const pct = Math.round((weights?.[c.id] ?? c.weight) * 100);
            return (
              <li key={c.id} className="flex items-center justify-between text-[12.5px]">
                <span style={{ color: INK }}>{c.label}</span>
                <span className="tabular-nums" style={{ color: NAVY }}>
                  {row[c.id] != null ? `${row[c.id]}/5` : '—'}
                  <span className="ml-2 text-[10.5px]" style={{ color: MUTED }}>· {pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
        {row.comment && (
          <div className="mt-3 p-3 rounded-[4px] text-[12.5px]" style={{ background: '#fdf6e8', color: INK, border: `1px solid ${CREAM2}` }}>
            <p className="text-[10.5px] uppercase tracking-[0.14em] mb-1" style={{ color: MUTED }}>Commentaire</p>
            {row.comment}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveTab({ edition, session }) {
  const { t } = useLang();
  const config = useSessionConfig(session?.id);
  const grid = useNameKeyedLiveGrid(session?.id);
  const setLive  = useSetSessionLive();
  const setDraft = useSetSessionDraft();
  const lock     = useLockSession();
  const unlock   = useUnlockSession();
  const publish  = usePublishSession();

  const [pending, setPending] = useState(null); // 'live' | 'draft' | 'lock' | 'publish'
  const [detail, setDetail]   = useState(null);  // { row, jurorLabel, startupLabel }

  const status = config.data?.status || 'draft';
  // Poids des critères pour cette session (fractions), défaut standard si non réglés.
  const weights = useMemo(() => resolveSessionWeights(config.data), [config.data]);

  // Lookup cellule : (jury_name, startup_name) → row (score final ou brouillon)
  const scoreByKey = useMemo(() => {
    const m = new Map();
    for (const s of grid.scores || []) m.set(`${s.jury_name}::${s.startup_name}`, s);
    return m;
  }, [grid.scores]);

  const draftByKey = useMemo(() => {
    const m = new Map();
    for (const d of grid.drafts || []) m.set(`${d.jury_name}::${d.startup_name}`, d);
    return m;
  }, [grid.drafts]);

  // Agrégat par startup (moyenne pondérée + n sur les notes finales complètes)
  const aggregates = useMemo(() => {
    const out = new Map();
    for (const s of grid.startups || []) {
      const ws = [];
      for (const j of grid.jurors || []) {
        const sr = scoreByKey.get(`${j.full_name}::${s.name}`);
        const w = sr ? weightedScore(sr, weights) : null;
        if (w != null) ws.push(w);
      }
      out.set(s.id, {
        n: ws.length,
        avg: ws.length ? ws.reduce((acc, x) => acc + x, 0) / ws.length : null,
      });
    }
    return out;
  }, [grid.startups, grid.jurors, scoreByKey, weights]);

  const totalScored = grid.scores?.length || 0;
  const jurorsScoring = new Set(
    (grid.drafts || []).concat(grid.scores || []).map((r) => r.jury_name),
  ).size;

  if (!edition) return null;
  if (!session) {
    return (
      <div
        className="rounded-[4px] p-6 text-center"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: MUTED }}>{t(LIVE.pickSession)}</p>
      </div>
    );
  }

  async function doSetLive() {
    setPending(null);
    try { await setLive.mutateAsync(session.id); } catch (e) { console.error(e); }
  }
  async function doSetDraft() {
    setPending(null);
    try { await setDraft.mutateAsync(session.id); } catch (e) { console.error(e); }
  }
  async function doLock() {
    setPending(null);
    try { await lock.mutateAsync(session.id); } catch (e) { console.error(e); }
  }
  async function doUnlock() {
    setPending(null);
    try { await unlock.mutateAsync(session.id); } catch (e) { console.error(e); }
  }
  async function doPublish() {
    setPending(null);
    try { await publish.mutateAsync(session.id); } catch (e) { console.error(e); }
  }

  const busy = setLive.isPending || setDraft.isPending || lock.isPending || unlock.isPending || publish.isPending;

  return (
    <>
      {/* Session header */}
      <section
        className="rounded-[4px] p-4 mb-4 flex items-center gap-3 flex-wrap"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[18px]" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>
              {session.name}
            </h2>
            <StatusPill status={status} kind="jury" />
            <span className="text-[11.5px]" style={{ color: MUTED }}>· {session.kind}</span>
            {session.session_date && (
              <span className="text-[11.5px]" style={{ color: MUTED }}>· {session.session_date}</span>
            )}
          </div>
          {session.theme && <p className="text-[12.5px] mt-0.5" style={{ color: INK }}>{session.theme}</p>}
        </div>

        {/* Lifecycle controls */}
        <div className="flex gap-2 flex-wrap">
          {status === 'draft' && (
            <button
              type="button"
              onClick={() => setPending('live')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              <Play className="w-4 h-4" /> {t(LIVE.openScoring)}
            </button>
          )}
          {status === 'live' && (
            <>
              {totalScored === 0 && (
                <button
                  type="button"
                  onClick={() => setPending('draft')}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
                  style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
                >
                  <Undo2 className="w-3.5 h-3.5" /> {t(LIVE.reopenDraft)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPending('lock')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
                style={{ background: NAVY, color: 'white' }}
              >
                <Lock className="w-4 h-4" /> {t(LIVE.lockSession)}
              </button>
            </>
          )}
          {status === 'locked' && (
            <>
              <button
                type="button"
                onClick={() => setPending('unlock')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] self-start"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
              >
                <LockOpen className="w-3.5 h-3.5" /> {t(LIVE.reopenLive)}
              </button>
              <button
                type="button"
                onClick={() => setPending('publish')}
                disabled={busy}
                title={t(LIVE.concludeAction)}
                className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-[4px] font-medium disabled:opacity-50 max-w-[420px] text-left leading-tight whitespace-normal"
                style={{ background: GOLD, color: NAVY }}
              >
                <Rocket className="w-4 h-4 shrink-0" />
                <span className="block">{t(LIVE.concludeAction)}</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Accès scoring juré (lien + PIN à envoyer) + poids des critères — surface
          opérationnelle : l'admin atterrit ici en ouvrant une session. */}
      <SessionScoringAccess sessionId={session.id} />

      {/* Helper line + loading */}
      <p className="text-[11.5px] mt-4 mb-3" style={{ color: MUTED }}>{t(LIVE.partialsHint)}</p>

      {grid.isLoading && (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
        </div>
      )}

      {!grid.isLoading && grid.startups.length === 0 && (
        <div className="rounded-[4px] p-4" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
          <p className="text-[13px]" style={{ color: MUTED }}>{t(LIVE.noStartups)}</p>
        </div>
      )}

      {!grid.isLoading && grid.startups.length > 0 && grid.jurors.length === 0 && (
        <div className="rounded-[4px] p-4" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
          <p className="text-[13px]" style={{ color: MUTED }}>{t(LIVE.noJurors)}</p>
        </div>
      )}

      {!grid.isLoading && grid.startups.length > 0 && grid.jurors.length > 0 && (
        <div className="overflow-x-auto rounded-[4px]" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
          <table className="min-w-full">
            <thead style={{ borderBottom: `1px solid ${CREAM2}` }}>
              <tr>
                <th
                  className="text-left p-3 sticky left-0 uppercase tracking-[0.14em] text-[10.5px]"
                  style={{ color: MUTED, background: TINT_ADMIN }}
                >
                  {t(LIVE.startupCol)}
                </th>
                {grid.jurors.map((j) => (
                  <th
                    key={j.id}
                    className="p-2 text-center uppercase tracking-[0.14em] text-[10.5px]"
                    style={{ color: MUTED }}
                    title={[j.full_name, j.qualite].filter(Boolean).join(' · ')}
                  >
                    <span className="block truncate max-w-[96px] mx-auto" style={{ color: INK }}>
                      {j.full_name}
                    </span>
                  </th>
                ))}
                <th
                  className="text-right p-3 uppercase tracking-[0.14em] text-[10.5px]"
                  style={{ color: MUTED }}
                >
                  {t(LIVE.avgCol)}
                </th>
                <th
                  className="text-right p-3 uppercase tracking-[0.14em] text-[10.5px]"
                  style={{ color: MUTED }}
                >
                  {t(LIVE.countCol)}
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.startups.map((s, i) => {
                const agg = aggregates.get(s.id) || { n: 0, avg: null };
                return (
                  <tr key={s.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${CREAM2}` }}>
                    <td className="p-3 text-[13px] sticky left-0" style={{ background: TINT_ADMIN, color: NAVY }}>
                      <span className="text-[11px] tabular-nums mr-2" style={{ color: MUTED }}>{i + 1}.</span>
                      {s.name}
                    </td>
                    {grid.jurors.map((j) => {
                      const key = `${j.full_name}::${s.name}`;
                      const draft = draftByKey.get(key);
                      const score = scoreByKey.get(key);
                      return (
                        <td key={j.id} className="p-1 text-center align-middle">
                          <ScoreCell
                            draft={draft}
                            score={score}
                            weights={weights}
                            onClick={() => score && setDetail({ row: score, jurorLabel: j.full_name, startupLabel: s.name })}
                          />
                        </td>
                      );
                    })}
                    <td className="p-3 text-right tabular-nums" style={{ color: GOLD, fontWeight: 600 }}>
                      {agg.avg != null ? agg.avg.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums text-[12.5px]" style={{ color: MUTED }}>
                      {agg.n}/{grid.jurors.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats footer */}
      {!grid.isLoading && grid.startups.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Stat
            label={t(LIVE.statStartups)}
            value={grid.startups.length}
            sub={`${[...aggregates.values()].filter((a) => a.n > 0).length} ${t(LIVE.startedSuffix)}`}
          />
          <Stat
            label={t(LIVE.statJurors)}
            value={grid.jurors.length}
            sub={`${jurorsScoring} ${t(LIVE.scoringSuffix)}`}
          />
          <Stat
            label={t(LIVE.statScored)}
            value={totalScored}
            sub={`/ ${grid.jurors.length * grid.startups.length}`}
          />
        </div>
      )}

      {/* Modals */}
      {pending === 'live' && (
        <ConfirmModal
          title={t(LIVE.confirmLiveTitle)}
          body={t(LIVE.confirmLiveBody)}
          onConfirm={doSetLive}
          onCancel={() => setPending(null)}
          busy={setLive.isPending}
        />
      )}
      {pending === 'draft' && (
        <ConfirmModal
          title={t(LIVE.confirmDraftTitle)}
          body={t(LIVE.confirmDraftBody)}
          onConfirm={doSetDraft}
          onCancel={() => setPending(null)}
          busy={setDraft.isPending}
        />
      )}
      {pending === 'lock' && (
        <ConfirmModal
          title={t(LIVE.confirmLockTitle)}
          body={t(LIVE.confirmLockBody)}
          onConfirm={doLock}
          onCancel={() => setPending(null)}
          busy={lock.isPending}
        />
      )}
      {pending === 'unlock' && (
        <ConfirmModal
          title={t(LIVE.confirmUnlockTitle)}
          body={t(LIVE.confirmUnlockBody)}
          onConfirm={doUnlock}
          onCancel={() => setPending(null)}
          busy={unlock.isPending}
        />
      )}
      {pending === 'publish' && (
        <ConfirmModal
          title={t(LIVE.concludeConfirmTitle)}
          body={`${t(LIVE.concludeConfirmBody)}\n\n${t(LIVE.concludeRecap)}`}
          typedWord={t(LIVE.concludeTypedWord)}
          onConfirm={doPublish}
          onCancel={() => setPending(null)}
          busy={publish.isPending}
        />
      )}

      {detail && (
        <DetailDrawer
          row={detail.row}
          jurorLabel={detail.jurorLabel}
          startupLabel={detail.startupLabel}
          weights={weights}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-[4px] p-3 text-center" style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}>
      <p className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>{label}</p>
      <p className="text-[22px] tabular-nums" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>{value}</p>
      {sub && <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}
