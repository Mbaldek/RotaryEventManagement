// DeleteCompetitionModal — modale 3-step de suppression d'une compétition.
//
// Step 1 : récap des dépendances (rsa_count_competition_dependencies).
// Step 2 : input typed "SUPPRIMER {name}". Bouton "Supprimer définitivement"
//          désactivé tant que la saisie ne matche pas exactement.
// onSuccess → toast Sonner + onDeleted() (le parent referme l'éditeur).
//
// Extrait du legacy CompetitionEditor.jsx pour partage entre CompetitionFunnel
// (création — non utilisé) et CompetitionEditView (édition — utilisé). API
// inchangée par rapport à l'original.

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CREAM2, NAVY, MUTED, INK, SERIF, EASE } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, COMP } from './i18n';
import {
  useCountCompetitionDependencies,
  useDeleteCompetition,
} from './useMaster';

export default function DeleteCompetitionModal({ competition, step, setStep, onDeleted }) {
  const { t } = useLang();
  const deps   = useCountCompetitionDependencies(step >= 1 ? competition?.id : null);
  const remove = useDeleteCompetition();

  const expectedPhrase = `SUPPRIMER ${competition?.name || ''}`;
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

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

  const open = step !== 0 && !!competition;

  const data           = deps.data || {};
  const sessionsTotal  = data.sessions_total     ?? 0;
  const sessionsDraft  = data.sessions_draft     ?? 0;
  const sessionsLive   = data.sessions_live      ?? 0;
  const sessionsPub    = data.sessions_published ?? 0;
  const clubsCount     = data.clubs_count        ?? 0;
  const startupsCount  = data.startups_count     ?? 0;
  const reviewsCount   = data.reviews_count      ?? 0;
  const scoresCount    = data.scores_count       ?? 0;

  const promptRaw    = t(COMP.deleteStep2Prompt);
  const promptParts  = promptRaw.split('{phrase}');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 31, 61, 0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: EASE }}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
