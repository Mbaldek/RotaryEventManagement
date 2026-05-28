// Espace Startup — orchestrateur du tunnel de candidature RSA (Module 1).
//
// Flux : auth-gate (-> /Login) -> résout l'édition active -> charge le dossier du
// candidat (Startup.mine) :
//   - aucun dossier  -> écran d'intro + « Commencer mon dossier » (crée le brouillon)
//   - brouillon      -> tunnel (CandidatureFunnel) avec autosave débouncé
//   - soumis+        -> vue de suivi (CandidatureTracking), éditable jusqu'à la clôture
//
// Auto-création tôt : la ligne dossier doit exister avant le 1er upload de document
// (RLS storage clé sur startup_id), donc « Commencer » insère immédiatement le brouillon.

import React, { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell, GOLD, NAVY, INK, MUTED, SERIF } from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import {
  CandidatureFunnel,
  CandidatureTracking,
  useActiveEdition,
  useMyDossier,
  useCreateDraft,
  useSaveDraft,
  useSubmitDossier,
  rulesFromEdition,
} from '@/components/rsa/candidature';
import { UI } from '@/components/rsa/candidature/i18n';
import { formatDate } from '@/components/rsa/candidature/validation';

function Centered({ children }) {
  return <div className="min-h-[40vh] flex items-center justify-center">{children}</div>;
}

function Spinner() {
  return <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

export default function MonDossier() {
  const { isAuthenticated, loading: authLoading, authUser } = usePlatformAuth();
  const { t, lang } = useLang();

  const { data: edition, isLoading: edLoading, isError: edError, refetch: refetchEdition } = useActiveEdition();
  const editionId = edition?.id;
  const { data: dossier, isLoading: dosLoading, isError: dosError, refetch: refetchDossier } = useMyDossier(editionId);

  const createDraft = useCreateDraft(editionId);
  const saveDraft = useSaveDraft(editionId);
  const submit = useSubmitDossier(editionId, edition);

  // Mode édition forcé après soumission (« Modifier mon dossier »).
  const [editingSubmitted, setEditingSubmitted] = useState(false);

  const rules = useMemo(() => rulesFromEdition(edition), [edition]);

  // Clôture des candidatures dépassée ? (lecture seule après la deadline)
  const closed = useMemo(() => {
    if (!edition?.application_close) return false;
    const close = new Date(edition.application_close);
    close.setHours(23, 59, 59, 999);
    return Date.now() > close.getTime();
  }, [edition]);

  const closeDate = formatDate(edition?.application_close, lang);

  // ── Mutations exposées au funnel ───────────────────────────────────────────
  const handlePatch = useCallback(
    (patch) => {
      if (dossier?.id) saveDraft.mutate({ id: dossier.id, patch });
    },
    [dossier?.id, saveDraft],
  );

  // Enregistrement immédiat (bouton « Enregistrer le brouillon » / flush).
  const handleFlush = useCallback(
    (patch) => {
      if (dossier?.id && patch && Object.keys(patch).length) {
        return saveDraft.mutateAsync({ id: dossier.id, patch });
      }
      return Promise.resolve();
    },
    [dossier?.id, saveDraft],
  );

  const handleSubmit = useCallback(
    async (draft) => {
      if (!dossier?.id) return;
      // R-M1 : la dernière autosave a déjà été flushée et awaitée par le funnel
      // (CandidatureFunnel#handleSubmit -> await flushPending()), ce qui nous
      // garantit que la ligne en DB porte les dernières saisies AVANT que le RPC
      // de soumission ne la verrouille FOR UPDATE. On retire donc le saveDraft
      // redondant qui causait une race entre son onSettled et celui du submit.
      await submit.mutateAsync({ id: dossier.id, draft });
      setEditingSubmitted(false);
    },
    [dossier?.id, submit],
  );

  const handleStart = useCallback(() => {
    if (createDraft.isPending || dossier?.id) return;
    createDraft.mutate({
      ownerId: authUser?.id,
      patch: { name: 'Brouillon', email: authUser?.email ?? null },
    });
  }, [createDraft, dossier?.id, authUser]);

  // ── États de garde ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <PageShell nav>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (edLoading || dosLoading) {
    return (
      <PageShell nav>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }

  // Aucune édition ouverte.
  if (!edition) {
    return (
      <PageShell nav>
        <Centered>
          <p className="text-[15px] text-center" style={{ color: INK }}>
            {t(UI.noOpenEdition)}
          </p>
        </Centered>
      </PageShell>
    );
  }

  // Erreur de chargement (édition/dossier).
  if (edError || dosError) {
    return (
      <PageShell nav>
        <Centered>
          <div className="text-center">
            <p className="text-[15px] mb-4" style={{ color: INK }}>
              {t(UI.loadError)}
            </p>
            <button
              type="button"
              onClick={() => {
                refetchEdition();
                refetchDossier();
              }}
              className="text-[14px] font-medium px-4 py-2 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY }}
            >
              {t(UI.retry)}
            </button>
          </div>
        </Centered>
      </PageShell>
    );
  }

  const status = dossier?.status;
  const isSubmitted = !!dossier && status && status !== 'brouillon';
  // Éditable après soumission tant que la deadline n'est pas passée et que la
  // sélection n'est pas trop avancée (soumis / en_selection).
  const canEditSubmitted = isSubmitted && !closed && ['soumis', 'en_selection'].includes(status);

  // ── Intro (aucun dossier) ──────────────────────────────────────────────────
  if (!dossier) {
    return (
      <PageShell nav>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t(UI.eyebrow)}
          </span>
        </div>
        <h1 className="text-[34px] leading-tight mb-3" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(UI.introTitle)}
        </h1>
        <p className="text-[15px] leading-relaxed mb-2" style={{ color: INK }}>
          {t(UI.introBody)}
        </p>
        <p className="text-[13px] leading-relaxed mb-7" style={{ color: MUTED }}>
          {t(UI.signedInAs)} <strong style={{ color: INK }}>{authUser?.email}</strong> · {edition.name}
        </p>
        {closed ? (
          <p className="text-[14px]" style={{ color: INK }}>
            {t(UI.noOpenEdition)}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={createDraft.isPending}
            className="inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: createDraft.isPending ? '#7a8a9a' : NAVY }}
          >
            {createDraft.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {t(UI.introStart)}
          </button>
        )}
        {createDraft.isError && (
          <p className="text-[13px] mt-3" style={{ color: '#a23b2d' }}>
            {t(UI.loadError)}
          </p>
        )}
      </PageShell>
    );
  }

  // ── Suivi (soumis+) — sauf si l'utilisateur a choisi de modifier ───────────
  if (isSubmitted && !editingSubmitted) {
    return (
      <PageShell nav>
        <CandidatureTracking
          startup={dossier}
          edition={edition}
          canEdit={canEditSubmitted}
          onEdit={() => setEditingSubmitted(true)}
        />
      </PageShell>
    );
  }

  // ── Tunnel (brouillon, ou édition d'un dossier soumis) ─────────────────────
  return (
    <PageShell nav>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
        <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
          {t(UI.eyebrow)} · {edition.name}
        </span>
      </div>
      <CandidatureFunnel
        startup={dossier}
        edition={edition}
        rules={rules}
        onPatch={handlePatch}
        onFlush={handleFlush}
        onSubmit={handleSubmit}
        saving={saveDraft.isPending}
        submitting={submit.isPending}
        readOnly={closed && !canEditSubmitted}
        closeDate={closeDate}
      />
    </PageShell>
  );
}
