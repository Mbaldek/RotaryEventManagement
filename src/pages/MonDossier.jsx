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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin } from 'lucide-react';
import {
  PageShell,
  Eyebrow,
  EditorialTitle,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  SERIF,
  DANGER,
  FOCUS_RING_CLASS,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import {
  CandidatureFunnel,
  CandidatureTracking,
  useActiveEdition,
  useEdition,
  useEditionClubRules,
  useMyDossier,
  useCreateDraft,
  useSaveDraft,
  useSubmitDossier,
  rulesFromEdition,
} from '@/components/rsa/candidature';
import ChampionPhotoOptIn from '@/components/rsa/candidature/ChampionPhotoOptIn';
import { UI } from '@/components/rsa/candidature/i18n';
import { formatDate } from '@/components/rsa/candidature/validation';
import { EditionClub } from '@/lib/rsa/entities';

function Centered({ children }) {
  return <div className="min-h-[40vh] flex items-center justify-center">{children}</div>;
}

function Spinner() {
  return <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

// LoadingWatchdog — après 8s sans résolution, montre une explication + retry
// button. Évite le spinner infini quand une query Supabase reste pending
// (CSP, réseau, RLS qui DENY sans erreur surfacée, etc.).
function LoadingWatchdog({ edLoading, dosLoading, onForceRetry }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (tick < 8) {
    return (
      <p className="mt-4 text-[12px]" style={{ color: MUTED }}>
        {tick > 3 ? `Chargement… (${tick}s)` : ''}
      </p>
    );
  }
  return (
    <div className="mt-6 max-w-[440px] mx-auto">
      <p className="text-[13.5px] mb-2" style={{ color: INK }}>
        Le chargement prend plus de temps que prévu.
      </p>
      <p className="text-[11.5px] mb-4" style={{ color: MUTED }}>
        Détail : edition={edLoading ? '…' : 'ok'} · dossier={dosLoading ? '…' : 'ok'}.
        Ouvrez la console (F12) pour voir les erreurs réseau.
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onForceRetry}
          className={`text-[13px] px-3 py-1.5 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
          style={{ background: NAVY }}
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={() => { window.location.href = '/Login'; }}
          className={`text-[13px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
        >
          Retour /Login
        </button>
      </div>
    </div>
  );
}

export default function MonDossier() {
  const { isAuthenticated, loading: authLoading, authUser } = usePlatformAuth();
  const { t, lang } = useLang();

  // Chantier 2 — query params `?edition=…&club=…` posés par OpenCompetitions /
  // Login. Si fournis : on épingle l'édition (au lieu de l'active globale) et
  // on pré-remplit le choix de club. Si absents : comportement historique.
  const [searchParams] = useSearchParams();
  const editionParam = searchParams.get('edition') || null;
  const clubParam = searchParams.get('club') || null;

  // Si l'URL épingle une édition, on l'utilise — sinon on retombe sur l'active.
  const activeQ = useActiveEdition();
  const pinnedQ = useEdition(editionParam);
  const usePinned = !!editionParam;
  const edition = usePinned ? pinnedQ.data : activeQ.data;
  const edLoading = usePinned ? pinnedQ.isLoading : activeQ.isLoading;
  const edError = usePinned ? pinnedQ.isError : activeQ.isError;
  const refetchEdition = usePinned ? pinnedQ.refetch : activeQ.refetch;

  const editionId = edition?.id;
  const { data: dossier, isLoading: dosLoading, isError: dosError, refetch: refetchDossier } = useMyDossier(editionId);

  const createDraft = useCreateDraft(editionId);
  const saveDraft = useSaveDraft(editionId);
  const submit = useSubmitDossier(editionId, edition);

  // Mode édition forcé après soumission (« Modifier mon dossier »).
  const [editingSubmitted, setEditingSubmitted] = useState(false);

  // V2 multi-club : club choisi par le candidat (état local pour le step picker).
  // Pré-rempli avec dossier.club_id si dossier déjà créé.
  // Chantier 2 : si `?club=…` est fourni dans l'URL ET qu'il n'y a pas encore de
  // dossier, on adopte immédiatement ce club comme choix initial.
  const [chosenClubId, setChosenClubId] = useState(clubParam);
  // Sync : dès qu'on a un dossier, on adopte SON club_id (réouverture après reload).
  useEffect(() => {
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

  // Chantier 2 — règles d'éligibilité effectives.
  // Si on a un dossier avec un club_id assigné, on merge edition.rules + per-club
  // override via useEditionClubRules. Sinon (avant choix), on garde les règles
  // globales d'édition seules (rulesFromEdition) pour le step picker.
  const dossierClubId = dossier?.club_id || null;
  const effectiveRulesQ = useEditionClubRules(editionId, dossierClubId);
  const rulesGlobal = useMemo(() => rulesFromEdition(edition), [edition]);
  const rules = dossierClubId ? effectiveRulesQ.data : rulesGlobal;

  // Clôture des candidatures dépassée ? (lecture seule après la deadline)
  const closed = useMemo(() => {
    if (!edition?.application_close) return false;
    const close = new Date(edition.application_close);
    close.setHours(23, 59, 59, 999);
    return Date.now() > close.getTime();
  }, [edition]);

  const closeDate = formatDate(edition?.application_close, lang);

  // Chantier 2 — Résolution du libellé humain du club pour l'eyebrow du Funnel.
  // Hoisté ici (avant tout early-return) pour respecter les rules-of-hooks :
  // ce useMemo doit être appelé dans le même ordre à chaque render.
  const clubLabel = useMemo(() => {
    if (!dossier?.club_id) return null;
    const row = editionClubs.find((r) => r.club_id === dossier.club_id);
    return row?.club?.name || dossier.club_id;
  }, [dossier?.club_id, editionClubs]);

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

  // Chantier 2 — auto-création du brouillon quand l'URL fournit ?edition=…&club=…
  // ET qu'aucun dossier n'existe encore. Skip l'écran intro/picker, le candidat
  // arrive direct dans le funnel. Garde-fou via ref pour ne mutate qu'UNE fois.
  const autoCreateRef = useRef(false);
  useEffect(() => {
    if (!editionParam || !clubParam) return;
    if (!edition || !authUser) return;
    if (dossier) return;
    if (createDraft.isPending) return;
    if (closed) return; // pas d'auto-create après deadline
    if (autoCreateRef.current) return;
    autoCreateRef.current = true;
    createDraft.mutate({
      ownerId: authUser.id,
      patch: { name: 'Brouillon', email: authUser.email ?? null, club_id: clubParam },
    });
  }, [editionParam, clubParam, edition, authUser, dossier, createDraft, closed]);

  // ── États de garde ─────────────────────────────────────────────────────────
  // DIAGNOSTIC : log l'état des queries à chaque render pour debug spinner infini
  // (à retirer une fois la cause root identifiée).
  // eslint-disable-next-line no-console
  console.debug('[MonDossier]', {
    authLoading, isAuthenticated, edLoading, dosLoading,
    editionId, edition: edition?.id, edError, dosError,
    dossierId: dossier?.id, editionParam,
  });

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
          <div className="text-center">
            <Spinner />
            <LoadingWatchdog
              edLoading={edLoading}
              dosLoading={dosLoading}
              onForceRetry={() => {
                refetchEdition();
                refetchDossier();
              }}
            />
          </div>
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
              className={`text-[14px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
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
        <header className="mb-7">
          <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
          <EditorialTitle lead={t(UI.introTitle)} size="md" />
          <p className="mt-4 text-[15px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
            {t(UI.introBody)}
          </p>
          <p className="mt-2 text-[13px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            {t(UI.signedInAs)} <strong style={{ color: INK }}>{authUser?.email}</strong> · {edition.name}
          </p>
        </header>

        {/* V2 step — picker de club (compétitions multiclub uniquement) */}
        {isMulticlub && !closed && (
          <section className="mb-7" aria-label={t(UI.pickClubEyebrow)}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(UI.pickClubEyebrow)}
              </span>
            </div>
            <p className="text-[13.5px] mb-4 max-w-[60ch]" style={{ color: INK, lineHeight: 1.6 }}>
              {t(UI.pickClubBody)}
            </p>
            {editionClubsQ.isLoading && (
              <p className="text-[13px]" style={{ color: MUTED }}>{t(UI.pickClubLoading)}</p>
            )}
            {!editionClubsQ.isLoading && editionClubs.length === 0 && (
              <p className="text-[13px]" style={{ color: MUTED }}>
                {t(UI.pickClubEmpty)}
              </p>
            )}
            {editionClubs.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t(UI.pickClubEyebrow)}>
                {editionClubs.map((row) => {
                  const c = row.club || {};
                  const selected = chosenClubId === row.club_id;
                  return (
                    <li key={row.club_id}>
                      <button
                        type="button"
                        onClick={() => setChosenClubId(row.club_id)}
                        role="radio"
                        aria-checked={selected}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#c9a84c]/60 ${FOCUS_RING_CLASS}`}
                        style={{
                          background: selected ? '#f5ede0' : 'white',
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
                                <MapPin className="w-3 h-3" aria-hidden /> {c.region}
                              </p>
                            )}
                            <p className="text-[11px] mt-1 font-mono" style={{ color: MUTED }}>{row.club_id}</p>
                          </div>
                          {selected && (
                            <span className="uppercase text-[10px] tracking-[0.18em]" style={{ color: GOLD }} aria-hidden>·</span>
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
            className={`inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-[4px] text-white ${FOCUS_RING_CLASS} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            style={{ background: createDraft.isPending ? MUTED : NAVY }}
          >
            {createDraft.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {needsClubPick ? t(UI.pickClubFirst) : t(UI.introStart)}
          </button>
        )}
        {createDraft.isError && (
          <p className="text-[13px] mt-3" style={{ color: DANGER }} role="alert">
            {t(UI.loadError)}
          </p>
        )}
      </PageShell>
    );
  }

  // ── Suivi (soumis+) — sauf si l'utilisateur a choisi de modifier ───────────
  if (isSubmitted && !editingSubmitted) {
    // V3 Vague 2 C — opt-in photo champion : visible quand le dossier a atteint
    // au moins le statut 'finaliste' (avant : pas pertinent, on évite de
    // demander un consentement RGPD inutile).
    const showChampionOptIn = ['finaliste', 'laureat', 'champion'].includes(status);
    return (
      <PageShell nav>
        <CandidatureTracking
          startup={dossier}
          edition={edition}
          canEdit={canEditSubmitted}
          onEdit={() => setEditingSubmitted(true)}
        />
        {showChampionOptIn && (
          <div className="mt-6">
            <ChampionPhotoOptIn
              startup={dossier}
              editionId={editionId}
              onPatch={(patch) => dossier?.id && saveDraft.mutate({ id: dossier.id, patch })}
              disabled={saveDraft.isPending}
            />
          </div>
        )}
      </PageShell>
    );
  }

  // ── Tunnel (brouillon, ou édition d'un dossier soumis) ─────────────────────
  // Note Chantier 2 : on n'affiche plus ici l'eyebrow `… · edition · club` car
  // le CandidatureFunnel porte désormais son propre mini-banner contextualisé
  // (toujours visible quel que soit le step). On garde juste l'eyebrow générique.
  return (
    <PageShell nav>
      <div className="mb-5">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
      </div>
      <CandidatureFunnel
        startup={dossier}
        edition={edition}
        rules={rules}
        clubLabel={clubLabel}
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
