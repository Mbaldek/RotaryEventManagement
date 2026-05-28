// CompetitionEditor — édition d'une compétition (Master Cockpit V2 + V2.5).
//
// Réutilise EditionEditor (M4a) pour les champs status / dates / prix / règles,
// puis ajoute une sous-section « Clubs participants » spécifique au master_admin :
//   * Si model='multiclub' → liste des clubs attachés + bouton "Attacher un club"
//     (dropdown des clubs disponibles) + bouton "Détacher" avec confirm typé.
//   * Si model='monoclub' → on affiche un disclaimer + la liste read-only du club
//     attaché (généralement Paris pour le legacy).
//
// V2.5 — Footer sticky en bas avec lien "Supprimer cette compétition" (rouge subtil,
// non dominant) qui ouvre une modale 3-step Élysée :
//   Step 0 : invisible (état initial)
//   Step 1 : récap des entités liées (clubs/sessions/startups/reviews/scores) avec
//            CTAs "Suivant" / "Annuler"
//   Step 2 : input typé "SUPPRIMER {nom_compétition}" + bouton "Supprimer
//            définitivement" (DANGER), désactivé tant que le typed ne matche pas
//            exactement. Au succès → toast Sonner + onClose pour refermer l'éditeur.
//
// Le Save reste géré par EditionEditor (M4a) qui a déjà son propre bouton +
// son tracking isDirty + son feedback inline. On ne duplique pas le Save pour ne
// pas confuser l'opérateur.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF,
} from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, COMP } from './i18n';
import EditionEditor from '../EditionEditor';
import {
  useAllClubs,
  useClubsForEdition,
  useAttachClub,
  useDetachClub,
  useCountCompetitionDependencies,
  useDeleteCompetition,
} from './useMaster';

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

function DetachButton({ editionId, clubId, clubName, onDetach }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onConfirm() {
    if (typed !== 'DETACH') {
      setError(t(COMP.detachTypePrompt));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onDetach({ editionId, clubId });
      setOpen(false);
      setTyped('');
    } catch (err) {
      // RPC RAISE 23503 (foreign_key_violation) si startups/sessions existent
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === '23503' || /startups|sessions/i.test(msg)) {
        setError(t(COMP.detachIntegrityBlocked));
      } else {
        setError(msg || 'Error');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
        title={t(COMP.detachClub)}
      >
        <X className="w-3 h-3" /> {t(COMP.detachClub)}
      </button>
    );
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
            <strong>{t(COMP.detachConfirmTitle)} — {clubName}.</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {t(COMP.detachConfirmBody)}
          </p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t(COMP.detachTypePrompt)}
              className="flex-1 text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            <button
              type="button"
              onClick={onConfirm}
              disabled={typed !== 'DETACH' || busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t(COMP.detachClub)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setTyped(''); setError(null); }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(UI.cancel)}
            </button>
          </div>
          {error && (
            <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachedClubsPanel({ competition }) {
  const { t } = useLang();
  const attached = useClubsForEdition(competition.id);
  const allClubs = useAllClubs();
  const attach = useAttachClub();
  const detach = useDetachClub();

  const [pickedClubId, setPickedClubId] = useState('');
  const [attachError, setAttachError] = useState(null);

  const attachedList = attached.data || [];
  const allList = allClubs.data || [];

  const attachedIds = useMemo(
    () => new Set(attachedList.map((row) => row.club_id)),
    [attachedList],
  );
  const availableClubs = useMemo(
    () => allList.filter((c) => !attachedIds.has(c.id)),
    [allList, attachedIds],
  );

  async function onAttach() {
    setAttachError(null);
    if (!pickedClubId) return;
    try {
      await attach.mutateAsync({ editionId: competition.id, clubId: pickedClubId });
      setPickedClubId('');
    } catch (err) {
      setAttachError(err?.message || 'Error');
    }
  }

  const isMulti = competition.model === 'multiclub';

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMP.attachedClubsSection)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {attachedList.length}</span>
      </header>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>{t(COMP.attachedClubsHint)}</p>

      {isMulti && (
        <div
          className="rounded-[4px] p-3 mb-4 flex items-end gap-3 flex-wrap"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex-1 min-w-[220px]">
            <FieldLabel htmlFor="club-picker">{t(COMP.pickClubToAttach)}</FieldLabel>
            <select
              id="club-picker"
              value={pickedClubId}
              onChange={(e) => setPickedClubId(e.target.value)}
              disabled={availableClubs.length === 0 || allClubs.isLoading}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              <option value="">—</option>
              {availableClubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
            {availableClubs.length === 0 && !allClubs.isLoading && (
              <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>{t(COMP.allClubsAttached)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onAttach}
            disabled={!pickedClubId || attach.isPending}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {attach.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t(COMP.attachClub)}
          </button>
          {attachError && (
            <span className="text-[12px] w-full" style={{ color: DANGER }}>{attachError}</span>
          )}
        </div>
      )}

      {attached.isLoading && (
        <div className="py-3 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!attached.isLoading && attachedList.length === 0 && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(COMP.noClubsAttached)}</p>
      )}

      {!attached.isLoading && attachedList.length > 0 && (
        <ul className="divide-y" style={{ borderColor: CREAM2 }}>
          {attachedList.map((row) => {
            const club = row.club || { id: row.club_id, name: row.club_id };
            return (
              <li key={row.club_id} className="py-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium" style={{ color: NAVY }}>{club.name}</p>
                  <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>
                    {club.id}
                    {club.region && (
                      <> · <span style={{ color: GOLD }}>{club.region}</span></>
                    )}
                  </p>
                </div>
                {isMulti && (
                  <DetachButton
                    editionId={competition.id}
                    clubId={row.club_id}
                    clubName={club.name}
                    onDetach={(vars) => detach.mutateAsync(vars)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── V2.5 — Modale 3-step de suppression de compétition ─────────────────────
//
// Step 1 : récap des dépendances (issu de rsa_count_competition_dependencies).
// Step 2 : input typé "SUPPRIMER {name}". Le bouton "Supprimer définitivement"
//          est désactivé tant que la saisie ne matche pas exactement.
// onSuccess → toast Sonner + onDeleted() (le parent referme l'éditeur).
function DeleteCompetitionModal({ competition, step, setStep, onDeleted }) {
  const { t } = useLang();
  const deps   = useCountCompetitionDependencies(step >= 1 ? competition.id : null);
  const remove = useDeleteCompetition();

  const expectedPhrase = `SUPPRIMER ${competition.name || ''}`;
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  // Reset interne quand on revient à 0 ou qu'on change d'édition
  useEffect(() => {
    if (step === 0) {
      setTyped('');
      setError(null);
    }
  }, [step, competition?.id]);

  function close() {
    setStep(0);
  }

  async function onConfirm() {
    if (typed !== expectedPhrase) {
      setError(t(COMP.deleteTypedMismatch));
      return;
    }
    setError(null);
    try {
      const snapshot = await remove.mutateAsync({
        editionId:    competition.id,
        typedConfirm: typed,
      });
      const name = snapshot?.name || competition.name;
      toast.success(t(COMP.competitionDeleted), {
        description: name ? `« ${name} »` : undefined,
      });
      setStep(0);
      onDeleted?.();
    } catch (err) {
      const code = err?.code || '';
      const msg  = err?.message || '';
      if (code === '42501' || /master_admin/i.test(msg)) {
        setError(t(COMP.deleteForbidden));
      } else if (/typed_confirm_mismatch/i.test(msg)) {
        setError(t(COMP.deleteTypedMismatch));
      } else {
        setError(msg || 'Error');
      }
    }
  }

  if (step === 0) return null;

  const data           = deps.data || {};
  const sessionsTotal  = data.sessions_total     ?? 0;
  const sessionsDraft  = data.sessions_draft     ?? 0;
  const sessionsLive   = data.sessions_live      ?? 0;
  const sessionsPub    = data.sessions_published ?? 0;
  const clubsCount     = data.clubs_count        ?? 0;
  const startupsCount  = data.startups_count     ?? 0;
  const reviewsCount   = data.reviews_count      ?? 0;
  const scoresCount    = data.scores_count       ?? 0;

  // Construction du prompt step 2 : on conserve la phrase {phrase} dans la string
  // i18n et on la remplace ici pour pouvoir styler {phrase} en mono inline.
  const promptRaw    = t(COMP.deleteStep2Prompt);
  const promptParts  = promptRaw.split('{phrase}');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 31, 61, 0.45)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-[4px] max-w-lg w-full p-5"
        style={{ border: `1px solid ${CREAM2}` }}
      >
        {step === 1 && (
          <>
            <h3
              className="text-[17px] font-medium mb-1 flex items-center gap-2"
              style={{ color: NAVY, fontFamily: SERIF }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
              {t(COMP.deleteStep1Title)}
            </h3>
            <p className="text-[12.5px] mb-3" style={{ color: INK }}>
              {t(COMP.deleteStep1Lede)}
            </p>

            <div
              className="rounded-[4px] p-3 mb-4"
              style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
            >
              {deps.isLoading && (
                <div className="py-2 flex items-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t(UI.loading)}
                </div>
              )}
              {!deps.isLoading && (
                <ul className="text-[12.5px] space-y-1.5" style={{ color: NAVY }}>
                  <li>
                    <span className="font-medium tabular-nums">{clubsCount}</span>{' '}
                    <span style={{ color: INK }}>{t(COMP.countClubsAttached)}</span>
                  </li>
                  <li>
                    <span className="font-medium tabular-nums">{sessionsTotal}</span>{' '}
                    <span style={{ color: INK }}>{t(COMP.countSessions)}</span>
                    {sessionsTotal > 0 && (
                      <span className="text-[11.5px]" style={{ color: MUTED }}>
                        {' '}(
                        <span className="tabular-nums">{sessionsDraft}</span> {t(COMP.countSessionsBreakdownDraft)}
                        {' · '}
                        <span className="tabular-nums">{sessionsLive}</span> {t(COMP.countSessionsBreakdownLive)}
                        {' · '}
                        <span className="tabular-nums">{sessionsPub}</span> {t(COMP.countSessionsBreakdownPublished)}
                        )
                      </span>
                    )}
                  </li>
                  <li>
                    <span className="font-medium tabular-nums">{startupsCount}</span>{' '}
                    <span style={{ color: INK }}>{t(COMP.countStartups)}</span>
                  </li>
                  <li>
                    <span className="font-medium tabular-nums">{reviewsCount}</span>{' '}
                    <span style={{ color: INK }}>{t(COMP.countReviews)}</span>
                  </li>
                  <li>
                    <span className="font-medium tabular-nums">{scoresCount}</span>{' '}
                    <span style={{ color: INK }}>{t(COMP.countScores)}</span>
                  </li>
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="px-3 py-1.5 text-[12.5px] rounded-[4px]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              >
                {t(UI.cancel)}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={deps.isLoading || !!deps.error}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium rounded-[4px] text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                {t(COMP.deleteNext)}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3
              className="text-[17px] font-medium mb-1 flex items-center gap-2"
              style={{ color: NAVY, fontFamily: SERIF }}
            >
              <Trash2 className="w-5 h-5" style={{ color: DANGER }} />
              {t(COMP.deleteStep2Title)}
            </h3>
            <p className="text-[12.5px] mb-3" style={{ color: INK }}>
              {promptParts[0]}
              <span
                className="font-mono px-1.5 py-0.5 rounded-[3px] mx-1 text-[12px]"
                style={{ background: TINT_DANGER, color: DANGER }}
              >
                {expectedPhrase}
              </span>
              {promptParts[1]}
            </p>

            <input
              type="text"
              value={typed}
              autoFocus
              onChange={(e) => { setTyped(e.target.value); setError(null); }}
              placeholder={expectedPhrase}
              className="w-full text-[13px] font-mono rounded-[4px] px-2.5 py-2 mb-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${error ? DANGER : CREAM2}`, color: NAVY }}
            />
            {error && (
              <p className="text-[12px] mb-3" style={{ color: DANGER }}>{error}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={remove.isPending}
                className="px-3 py-1.5 text-[12.5px] rounded-[4px]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              >
                {t(UI.back)}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={typed !== expectedPhrase || remove.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium rounded-[4px] text-white disabled:opacity-50"
                style={{ background: DANGER }}
              >
                {remove.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t(COMP.deleteFinalAction)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CompetitionEditor({ competition, onClose }) {
  const { t } = useLang();
  // deleteStep : 0 = fermé, 1 = récap, 2 = typed confirm
  const [deleteStep, setDeleteStep] = useState(0);

  if (!competition) return null;

  function onDeleted() {
    // Referme l'éditeur — le parent re-fetch competitions et déselectionne.
    onClose?.();
  }

  return (
    <div
      className="rounded-[4px] p-4 mt-2"
      style={{ background: 'white', border: `1px solid ${GOLD}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMP.editorTitle)}
        </h3>
        <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: GOLD }}>
          {competition.id}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <X className="w-3.5 h-3.5" /> {t(UI.close)}
        </button>
      </header>

      <EditionEditor edition={competition} />
      <AttachedClubsPanel competition={competition} />

      {/* V2.5 — Zone destructive : lien rouge subtil pour ouvrir la modale 3-step. */}
      <div
        className="mt-4 pt-3 border-t text-[11px]"
        style={{ borderColor: `${CREAM2}80` }}
      >
        <button
          type="button"
          onClick={() => setDeleteStep(1)}
          className="text-[11px] underline opacity-60 hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] rounded-[2px]"
          style={{ color: DANGER }}
        >
          {t(COMP.deleteCompetitionLink)}
        </button>
      </div>

      <DeleteCompetitionModal
        competition={competition}
        step={deleteStep}
        setStep={setDeleteStep}
        onDeleted={onDeleted}
      />
    </div>
  );
}
