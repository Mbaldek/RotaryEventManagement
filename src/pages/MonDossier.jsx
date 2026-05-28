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
//
// V2 multi-club : si l'édition active a model='multiclub', on insère AVANT le tunnel
// un step « Choisis ton club » qui liste les clubs rattachés à la compétition (via
// EditionClub.forEdition). La startup est créée avec son club_id dès « Commencer ».
// Pour les monoclub historiques, le club est implicite ('paris' par backfill).

import React, { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin } from 'lucide-react';
import { PageShell, GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design';
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
import { EditionClub } from '@/lib/rsa/entities';

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

  // V2 multi-club : club choisi par le candidat (état local pour le step picker).
  // Pré-rempli avec dossier.club_id si dossier déjà créé.
  const [chosenClubId, setChosenClubId] = useState(null);
  // Sync : dès qu'on a un dossier, on adopte SON club_id (réouverture après reload).
  React.useEffect(() => {
    if (dossier?.club_id && chosenClubId !== dossier.club_id) {
      setChosenClubId(dossier.club_id);
    }
  }, [dossier?.club_id, chosenClubId]);

  const isMulticlub = edition?.model === 'multiclub';

  // Clubs rattachés à la compétition active (utilisé uniquement en multiclub).
  const editionClubsQ = useQuery({
    queryKey: ['rsa', 'mon-dossier', 'edition-clubs', editionId],
    queryFn: () => EditionClub.forEdition(editionId),
    enabled: !!editionId && isMulticlub,
    staleTime: 5 * 60 * 1000,
  });
  const editionClubs = editionClubsQ.data || [];

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

  // V2 multi-club : pour une édition multiclub, le club DOIT être choisi avant la
  // création du brouillon (la colonne startups.club_id est NOT NULL après migration).
  // Pour les monoclub, on retombe sur 'paris' (backfill 2026) qui doit exister.
  const resolveClubIdForCreate = useCallback(() => {
    if (isMulticlub) return chosenClubId; // requis ; null bloque le démarrage
    return 'paris'; // legacy monoclub (édition 2026 backfillée)
  }, [isMulticlub, chosenClubId]);

  const handleStart = useCallback(() => {
    if (createDraft.isPending || dossier?.id) return;
    const club_id = resolveClubIdForCreate();
    if (!club_id) return; // multiclub sans club choisi → bouton désactivé en aval
    createDraft.mutate({
      ownerId: authUser?.id,
      patch: { name: 'Brouillon', email: authUser?.email ?? null, club_id },
    });
  }, [createDraft, dossier?.id, authUser, resolveClubIdForCreate]);

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
    // V2 multi-club : si l'édition active est multiclub et le candidat n'a pas
    // encore choisi, on l'oblige à sélectionner un club avant le « Commencer ».
    const needsClubPick = isMulticlub && !chosenClubId;
    const canStart = !closed && !createDraft.isPending && (!isMulticlub || !!chosenClubId);
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

        {/* V2 step — picker de club (compétitions multiclub uniquement) */}
        {isMulticlub && !closed && (
          <section className="mb-7">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t({
                  fr: 'Étape 1 · Choisissez votre club',
                  en: 'Step 1 · Choose your club',
                  de: 'Schritt 1 · Wählen Sie Ihren Club',
                })}
              </span>
            </div>
            <p className="text-[13.5px] mb-4" style={{ color: INK }}>
              {t({
                fr: 'Votre candidature sera examinée par le comité du club que vous choisissez. Vous ne pourrez pas changer ce choix après création du dossier.',
                en: 'Your application will be reviewed by the committee of the club you pick. You will not be able to change this choice after the dossier is created.',
                de: 'Ihre Bewerbung wird vom Komitee des gewählten Clubs geprüft. Diese Wahl ist nach Erstellung der Bewerbung nicht mehr änderbar.',
              })}
            </p>
            {editionClubsQ.isLoading && (
              <p className="text-[13px]" style={{ color: MUTED }}>{t({ fr: 'Chargement des clubs…', en: 'Loading clubs…', de: 'Clubs werden geladen…' })}</p>
            )}
            {!editionClubsQ.isLoading && editionClubs.length === 0 && (
              <p className="text-[13px]" style={{ color: MUTED }}>
                {t({
                  fr: 'Aucun club n’est rattaché à cette compétition pour le moment.',
                  en: 'No club is attached to this competition yet.',
                  de: 'Diesem Wettbewerb ist noch kein Club zugeordnet.',
                })}
              </p>
            )}
            {editionClubs.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {editionClubs.map((row) => {
                  const c = row.club || {};
                  const selected = chosenClubId === row.club_id;
                  return (
                    <li key={row.club_id}>
                      <button
                        type="button"
                        onClick={() => setChosenClubId(row.club_id)}
                        aria-pressed={selected}
                        className="w-full text-left rounded-[4px] p-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                        style={{
                          background: selected ? '#fdf6e8' : 'white',
                          border: `1px solid ${selected ? GOLD : CREAM2}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                              {c.name || row.club_id}
                            </p>
                            {c.region && (
                              <p className="text-[12px] mt-1 inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                                <MapPin className="w-3 h-3" /> {c.region}
                              </p>
                            )}
                            <p className="text-[11px] mt-1 font-mono" style={{ color: MUTED }}>{row.club_id}</p>
                          </div>
                          {selected && (
                            <span className="uppercase text-[10px] tracking-[0.18em]" style={{ color: GOLD }}>·</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {closed ? (
          <p className="text-[14px]" style={{ color: INK }}>
            {t(UI.noOpenEdition)}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-[4px] text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: createDraft.isPending ? '#7a8a9a' : NAVY }}
          >
            {createDraft.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {needsClubPick
              ? t({
                  fr: 'Choisissez d’abord un club',
                  en: 'Pick a club first',
                  de: 'Wählen Sie zuerst einen Club',
                })
              : t(UI.introStart)}
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
          {dossier?.club_id && (<> · {dossier.club_id}</>)}
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
