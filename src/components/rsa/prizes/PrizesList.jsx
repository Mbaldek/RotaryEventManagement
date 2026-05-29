// PrizesList — section "Prix" autonome, intégrable dans :
//   * CompetitionEditor (Master Cockpit) avec scope='competition'
//   * ClubCockpit (onglet Prix) avec scope='club'
//
// Props :
//   editionId : string  (compétition cible)
//   clubId    : string? (obligatoire si scope='club')
//   sessionId : string? (filtre optionnel — non utilisé en V2.5 mais accepté)
//   scope     : 'competition' | 'club'
//
// Le composant se branche sur les hooks usePrizes (lectures + mutations) ; il
// ne reçoit AUCUN callback métier — l'invalidation passe par TanStack Query.
//
// Layout : cards Élysée hairline gold empilées, une par prix, avec :
//   nom (serif) · montant + devise · badges kind/jury · status (À décerner | Décerné à X)
//   + boutons Éditer / Supprimer (confirm typé) / Décerner (modale)

import React, { useMemo, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, Award, AlertTriangle, X } from 'lucide-react';
import {
  NAVY, INK, MUTED, GOLD, CREAM2, SERIF,
  TINT_BEIGE, TINT_BLUE, TINT_SAGE,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  useEditionPrizes,
  useClubPrizes,
  useCreatePrize,
  useUpdatePrize,
  useDeletePrize,
  useAwardPrize,
} from './usePrizes';
import { PRIZES_UI, PRIZE_FORM, PRIZE_DELETE, CURRENCY_OPTIONS } from './i18n';
import PrizeForm from './PrizeForm';
import AwardPrizeModal from './AwardPrizeModal';

// ── Helpers d'affichage ─────────────────────────────────────────────────────

function currencySymbol(code) {
  const found = CURRENCY_OPTIONS.find((c) => c.code === code);
  return found ? found.symbol : (code || '');
}

function formatAmount(amount, currency) {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currencySymbol(currency);
  } catch {
    return `${amount} ${currencySymbol(currency)}`;
  }
}

function KindBadge({ kind }) {
  const { t } = useLang();
  const isGeneral = kind === 'general';
  const label = isGeneral ? t(PRIZE_FORM.kindGeneral) : t(PRIZE_FORM.kindSpecial);
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: isGeneral ? '#fdf6e8' : TINT_BEIGE,
        color: isGeneral ? NAVY : INK,
        border: `1px solid ${isGeneral ? GOLD : CREAM2}`,
      }}
    >
      {label}
    </span>
  );
}

function JuryBadge({ juryType }) {
  const { t } = useLang();
  const isSpecial = juryType === 'special';
  const label = isSpecial ? t(PRIZE_FORM.jurySpecial) : t(PRIZE_FORM.juryRegular);
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: isSpecial ? TINT_BLUE : 'white',
        color: INK,
        border: `1px solid ${CREAM2}`,
      }}
    >
      {label}
    </span>
  );
}

function AwardedPill({ prize, awardedName }) {
  const { t } = useLang();
  if (!prize.awarded_to) {
    return (
      <span
        className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
        style={{ background: 'white', color: MUTED, border: `1px solid ${CREAM2}` }}
      >
        {t(PRIZES_UI.toAward)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{ background: TINT_SAGE, color: NAVY, border: `1px solid ${CREAM2}` }}
    >
      {t(PRIZES_UI.awardedTo)} : {awardedName || prize.awarded_to}
    </span>
  );
}

// ── Confirm typé inline ─────────────────────────────────────────────────────

function DeleteConfirm({ prize, onConfirm, onCancel, busy }) {
  const { t } = useLang();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);
  const expected = t(PRIZE_DELETE.typedExpected);
  const isAwarded = prize.awarded_to != null;

  async function handleConfirm() {
    setError(null);
    if (isAwarded) {
      setError(t(PRIZE_DELETE.awardedBlocked));
      return;
    }
    if (typed !== expected) {
      setError(t(PRIZE_DELETE.typedPrompt));
      return;
    }
    try {
      await onConfirm?.();
    } catch (err) {
      // Le RPC peut RAISE '23503' si awarded_to set (course condition)
      const msg = err?.message || '';
      if (/déjà été décerné|already been awarded|verliehen/i.test(msg)) {
        setError(t(PRIZE_DELETE.awardedBlocked));
      } else {
        setError(msg || String(err));
      }
    }
  }

  return (
    <div
      className="rounded-[4px] p-3 mt-2 w-full"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px]" style={{ color: NAVY }}>
            <strong>{t(PRIZE_DELETE.title)} — {prize.name}.</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {isAwarded ? t(PRIZE_DELETE.awardedBlocked) : t(PRIZE_DELETE.body)}
          </p>
          {!isAwarded && (
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={t(PRIZE_DELETE.typedPrompt)}
                className="flex-1 text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
              <button
                type="button"
                onClick={handleConfirm}
                disabled={typed !== expected || busy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
                style={{ background: DANGER, color: 'white' }}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t(PRIZE_DELETE.confirm)}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              >
                {t(PRIZES_UI.cancel)}
              </button>
            </div>
          )}
          {isAwarded && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              <X className="w-3 h-3" />
              {t(PRIZES_UI.close)}
            </button>
          )}
          {error && (
            <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hooks d'aide : startups + sessions de l'édition (scope-aware) ───────────

function useStartupsForScope({ editionId, clubId, scope }) {
  return useQuery({
    queryKey: ['rsa', 'prizes', 'startups-for-scope', editionId, clubId || null, scope],
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('startups')
        .select('id, name, club_id')
        .eq('edition_id', editionId)
        .order('name', { ascending: true });
      if (scope === 'club' && clubId) q = q.eq('club_id', clubId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

function useSessionsForScope({ editionId, clubId, scope }) {
  return useQuery({
    queryKey: ['rsa', 'prizes', 'sessions-for-scope', editionId, clubId || null, scope],
    enabled: !!editionId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('sessions')
        .select('id, name, club_id, kind, position')
        .eq('edition_id', editionId)
        .order('position', { ascending: true });
      if (scope === 'club' && clubId) {
        // Sessions du club + finales (club_id IS NULL → finale)
        // PostgREST .or() prend une chaîne ; on filtre côté client pour rester simple.
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).filter((s) => s.club_id === clubId || s.club_id == null);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Carte d'un prix ─────────────────────────────────────────────────────────

function PrizeCard({
  prize,
  awardedName,
  onEdit,
  onDelete,
  onAward,
  isEditing,
  isDeleting,
  editForm,
  deleteForm,
}) {
  const { t } = useLang();
  return (
    <li
      className="group rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h4
            className="text-[17px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {prize.name}
          </h4>
          <p className="text-[13px] mt-0.5 tabular-nums" style={{ color: INK }}>
            {formatAmount(prize.amount, prize.currency)}
          </p>
          {prize.description && (
            <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: INK }}>
              {prize.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <KindBadge kind={prize.kind} />
            <JuryBadge juryType={prize.jury_type} />
            <AwardedPill prize={prize} awardedName={awardedName} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!prize.awarded_to && (
            <button
              type="button"
              onClick={onAward}
              className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ color: NAVY, border: `1px solid ${GOLD}`, background: '#fdf6e8' }}
              title={t(PRIZES_UI.award)}
            >
              <Award className="w-3.5 h-3.5" />
              {t(PRIZES_UI.award)}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            title={t(PRIZES_UI.edit)}
          >
            <Pencil className="w-3.5 h-3.5" />
            {t(PRIZES_UI.edit)}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: 'white' }}
            title={t(PRIZES_UI.remove)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t(PRIZES_UI.remove)}
          </button>
        </div>
      </div>

      {isEditing && editForm}
      {isDeleting && deleteForm}
    </li>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────

export default function PrizesList({
  editionId,
  clubId = null,
  // sessionId : accepté par l'API publique du composant pour l'avenir
  // (filtre par session) — non utilisé en V2.5, on l'ignore explicitement.
  sessionId: _sessionId = null,
  scope = 'competition',
}) {
  const { t } = useLang();
  const isClub = scope === 'club';

  // Source unique : selon scope. On appelle TOUJOURS les deux hooks (règle des
  // hooks React) ; on désactive celui qui ne correspond pas via `enabled` à
  // l'intérieur du hook (clubId tombé à null désactive useClubPrizes
  // automatiquement, et scope!='competition' désactive useEditionPrizes via le
  // suffixe de queryKey).
  const competitionQ = useEditionPrizes(isClub ? null : editionId, { scope: 'competition' });
  const clubQ        = useClubPrizes(isClub ? editionId : null, isClub ? clubId : null);
  const prizesQ      = isClub ? clubQ : competitionQ;
  const sessionsQ    = useSessionsForScope({ editionId, clubId, scope });
  const startupsQ    = useStartupsForScope({ editionId, clubId, scope });

  const createPrize = useCreatePrize(editionId);
  const updatePrize = useUpdatePrize(editionId);
  const deletePrize = useDeletePrize(editionId);
  const awardPrize  = useAwardPrize(editionId);

  // UI state (inline form / confirm typé / modale)
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [awardingPrize, setAwardingPrize] = useState(null);

  const prizes = prizesQ.data || [];
  const sessions = sessionsQ.data || [];
  const startups = startupsQ.data || [];

  const startupsById = useMemo(
    () => Object.fromEntries((startups || []).map((s) => [s.id, s])),
    [startups],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleCreate(payload) {
    await createPrize.mutateAsync({
      clubId: isClub ? clubId : null,
      sessionId: payload.sessionId,
      kind: payload.kind,
      name: payload.name,
      amount: payload.amount,
      currency: payload.currency,
      juryType: payload.juryType,
      description: payload.description,
    });
    setCreating(false);
  }

  async function handleUpdate(id, payload) {
    await updatePrize.mutateAsync({
      id,
      name: payload.name,
      amount: payload.amount,
      currency: payload.currency,
      juryType: payload.juryType,
      sessionId: payload.sessionId === null ? '' : payload.sessionId, // '' = vider côté RPC
      description: payload.description ?? '',
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    await deletePrize.mutateAsync(id);
    setDeletingId(null);
  }

  async function handleAward({ id, startupId }) {
    await awardPrize.mutateAsync({ id, startupId });
    setAwardingPrize(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {isClub ? t(PRIZES_UI.sectionTitleClub) : t(PRIZES_UI.sectionTitleCompetition)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {prizes.length}</span>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditingId(null); setDeletingId(null); }}
          disabled={creating}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          {t(PRIZES_UI.newPrize)}
        </button>
      </header>

      <p className="text-[12px] mb-4" style={{ color: MUTED }}>
        {isClub ? t(PRIZES_UI.sectionHintClub) : t(PRIZES_UI.sectionHintCompetition)}
      </p>

      {creating && (
        <PrizeForm
          scope={scope}
          sessions={sessions}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          busy={createPrize.isPending}
          error={createPrize.error?.message || null}
        />
      )}

      {prizesQ.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!prizesQ.isLoading && prizes.length === 0 && !creating && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(PRIZES_UI.empty)}</p>
      )}

      {!prizesQ.isLoading && prizes.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-3">
          {prizes.map((p) => (
            <PrizeCard
              key={p.id}
              prize={p}
              awardedName={p.awarded_to ? startupsById[p.awarded_to]?.name : null}
              onEdit={() => { setEditingId(p.id); setDeletingId(null); setCreating(false); }}
              onDelete={() => { setDeletingId(p.id); setEditingId(null); setCreating(false); }}
              onAward={() => setAwardingPrize(p)}
              isEditing={editingId === p.id}
              isDeleting={deletingId === p.id}
              editForm={(
                <PrizeForm
                  scope={scope}
                  sessions={sessions}
                  initial={p}
                  onSubmit={(payload) => handleUpdate(p.id, payload)}
                  onCancel={() => setEditingId(null)}
                  busy={updatePrize.isPending}
                  error={updatePrize.error?.message || null}
                />
              )}
              deleteForm={(
                <DeleteConfirm
                  prize={p}
                  onConfirm={() => handleDelete(p.id)}
                  onCancel={() => setDeletingId(null)}
                  busy={deletePrize.isPending}
                />
              )}
            />
          ))}
        </ul>
      )}

      {awardingPrize && (
        <AwardPrizeModal
          prize={awardingPrize}
          startups={startups}
          onAward={handleAward}
          onClose={() => setAwardingPrize(null)}
          busy={awardPrize.isPending}
        />
      )}
    </section>
  );
}
