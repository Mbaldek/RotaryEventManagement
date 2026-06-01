// Espace Startup — orchestrateur du tunnel de candidature RSA (Module 1).
//
// Hero variant (intro state) : H-Vertical-Rule (banque §16.1) — barre gold
// gauche 2px + texte stacké, voix dossier personnel. Signature micro :
// M-Gold-Sweep (funnel candidat, partagée avec Candidater + StartupUpload).
// Cf. design-upgrade-blueprint §3.3 + §4.11.
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
// Pas de choix de club côté candidat : la startup candidate au concours en général.
// L'admin (master/competition_admin) route ensuite le dossier vers un club organisateur
// post-soumission (par pays / affinité). startups.club_id reste NULL jusque-là.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
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
  useMyDossier,
  useCreateDraft,
  useSaveDraft,
  useSubmitDossier,
  rulesFromEdition,
} from '@/components/rsa/candidature';
import ChampionPhotoOptIn from '@/components/rsa/candidature/ChampionPhotoOptIn';
import GuideSpaceHelp from '@/components/rsa/guides/GuideSpaceHelp';
import { UI } from '@/components/rsa/candidature/i18n';
import { formatDate } from '@/components/rsa/candidature/validation';

function Centered({ children }) {
  return <div className="min-h-[40vh] flex items-center justify-center">{children}</div>;
}

function Spinner() {
  return <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

// LoadingWatchdog — surveille un chargement qui dure. NON destructif par défaut :
// un réseau lent ou un cold start Supabase ne doit JAMAIS signer-out
// silencieusement une session saine. On distingue deux cas :
//   1. Aucune erreur avérée → après un seuil long, on propose un simple bouton
//      « Réessayer » (refetch des queries). On ne touche pas au localStorage.
//   2. Erreur réelle ET persistante (edError/dosError) → on présume un état
//      zombie du client et, seulement là, on propose le nettoyage de session
//      (manuel, via bouton) avant un re-login propre.
const PATIENCE_S = 20; // seuil avant de proposer "Réessayer" (chargement sain)
const HEAL_HINT_S = 8;  // seuil avant de proposer le nettoyage (erreur avérée)

function LoadingWatchdog({ edLoading, dosLoading, hasError, onForceRetry }) {
  const { t } = useLang();
  const [tick, setTick] = useState(0);
  const [healing, setHealing] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Nettoyage de session — strictement MANUEL (jamais déclenché par un timer).
  // Purge les clés Supabase du localStorage puis redirige vers /Login.
  const handleHeal = useCallback(() => {
    setHealing(true);

    console.warn('[MonDossier] manual session reset — clearing storage + redirect /Login');
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const toRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((k) => window.localStorage.removeItem(k));
      }
    } catch {
      /* localStorage indispo — on tente quand même le redirect */
    }
    setTimeout(() => { window.location.href = '/Login?reset=1'; }, 400);
  }, []);

  if (healing) {
    return (
      <div className="mt-6 max-w-[440px] mx-auto text-center">
        <p className="text-[13.5px] mb-2" style={{ color: INK }}>
          {t({
            fr: 'Réinitialisation de la session en cours…',
            en: 'Resetting your session…',
            de: 'Sitzung wird zurückgesetzt…',
          })}
        </p>
        <p className="text-[11.5px]" style={{ color: MUTED }}>
          {t({
            fr: 'Vous allez être redirigé vers la page de connexion.',
            en: 'You will be redirected to the sign-in page.',
            de: 'Sie werden zur Anmeldeseite weitergeleitet.',
          })}
        </p>
      </div>
    );
  }

  // Cas 2 — erreur réelle avérée : on propose le nettoyage de session manuel.
  if (hasError && tick >= HEAL_HINT_S) {
    return (
      <div className="mt-6 max-w-[440px] mx-auto text-center">
        <p className="text-[13px] mb-3" style={{ color: INK }}>
          {t({
            fr: 'Le chargement échoue de façon persistante. Votre session est peut-être expirée.',
            en: 'Loading keeps failing. Your session may have expired.',
            de: 'Das Laden schlägt wiederholt fehl. Ihre Sitzung ist möglicherweise abgelaufen.',
          })}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onForceRetry}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
          >
            {t(UI.retry)}
          </button>
          <button
            type="button"
            onClick={handleHeal}
            className={`text-[13px] font-medium px-4 py-2 rounded-[4px] text-white ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY }}
          >
            {t({
              fr: 'Réinitialiser la session',
              en: 'Reset session',
              de: 'Sitzung zurücksetzen',
            })}
          </button>
        </div>
      </div>
    );
  }

  // Cas 1 — chargement sain mais long : ligne de diagnostic, puis bouton
  // « Réessayer » NON destructif. Aucun wipe, aucun redirect automatique.
  if (tick < 4) {
    return null;
  }
  return (
    <div className="mt-6 max-w-[440px] mx-auto text-center">
      <p className="text-[12px]" style={{ color: MUTED }}>
        {t({
          fr: `Chargement… (${tick}s)`,
          en: `Loading… (${tick}s)`,
          de: `Wird geladen… (${tick}s)`,
        })}
        {' · '}edition={edLoading ? '…' : 'ok'} · dossier={dosLoading ? '…' : 'ok'}
      </p>
      {tick >= PATIENCE_S && (
        <button
          type="button"
          onClick={onForceRetry}
          className={`mt-3 text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
          style={{ color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          {t(UI.retry)}
        </button>
      )}
    </div>
  );
}

export default function MonDossier() {
  const { isAuthenticated, loading: authLoading, authUser } = usePlatformAuth();
  const { t, lang } = useLang();

  // Query param `?edition=…` posé par OpenCompetitions / Candidater. Si fourni :
  // on épingle l'édition (au lieu de l'active globale). Pas de notion de club
  // côté candidat — l'admin route post-soumission.
  const [searchParams] = useSearchParams();
  const editionParam = searchParams.get('edition') || null;

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

  // Règles d'éligibilité : globales de l'édition (pas de merge per-club côté candidat).
  const rules = useMemo(() => rulesFromEdition(edition), [edition]);

  // Clôture des candidatures dépassée ? (lecture seule après la deadline)
  const closed = useMemo(() => {
    if (!edition?.application_close) return false;
    const close = new Date(edition.application_close);
    close.setHours(23, 59, 59, 999);
    return Date.now() > close.getTime();
  }, [edition]);

  // Jours restants avant clôture des candidatures (null si pas de deadline ou déjà clôturé).
  // Affiché en sous-ligne du rail de progression : "J-12 jusqu'à clôture".
  const daysToClose = useMemo(() => {
    if (!edition?.application_close) return null;
    const close = new Date(edition.application_close);
    close.setHours(23, 59, 59, 999);
    const days = Math.ceil((close.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days >= 0 ? days : null;
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

  // Création du brouillon : club_id reste NULL (admin routera post-soumission).
  const handleStart = useCallback(() => {
    if (createDraft.isPending || dossier?.id) return;
    createDraft.mutate({
      ownerId: authUser?.id,
      patch: { name: 'Brouillon', email: authUser?.email ?? null, club_id: null },
    });
  }, [createDraft, dossier?.id, authUser]);

  // Auto-création du brouillon quand l'URL fournit ?edition=… ET qu'aucun dossier
  // n'existe encore. Skip l'écran intro, le candidat arrive direct dans le funnel.
  // Garde-fou via ref pour ne mutate qu'UNE fois.
  const autoCreateRef = useRef(false);
  useEffect(() => {
    if (!editionParam) return;
    if (!edition || !authUser) return;
    if (dossier) return;
    if (createDraft.isPending) return;
    if (closed) return; // pas d'auto-create après deadline
    if (autoCreateRef.current) return;
    autoCreateRef.current = true;
    createDraft.mutate({
      ownerId: authUser.id,
      patch: { name: 'Brouillon', email: authUser.email ?? null, club_id: null },
    });
  }, [editionParam, edition, authUser, dossier, createDraft, closed]);

  // ── États de garde ─────────────────────────────────────────────────────────
  // DIAGNOSTIC : log l'état des queries à chaque render pour debug spinner infini
  // (à retirer une fois la cause root identifiée).
   
  console.debug('[MonDossier]', {
    authLoading, isAuthenticated, edLoading, dosLoading,
    editionId, edition: edition?.id, edError, dosError,
    dossierId: dossier?.id, editionParam,
  });

  if (authLoading) {
    return (
      <PageShell nav footer={<PlatformFooter />}>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  if (edLoading || dosLoading) {
    return (
      <PageShell nav footer={<PlatformFooter />}>
        <Centered>
          <div className="text-center">
            <Spinner />
            <LoadingWatchdog
              edLoading={edLoading}
              dosLoading={dosLoading}
              hasError={!!(edError || dosError)}
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
      <PageShell nav footer={<PlatformFooter />}>
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
      <PageShell nav footer={<PlatformFooter />}>
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
    const canStart = !closed && !createDraft.isPending;
    return (
      <PageShell nav footer={<PlatformFooter />}>
        {/* Hero H-Vertical-Rule — barre gold gauche + texte stacké, voix dossier personnel. */}
        <header className="mb-10 md:mb-12 pl-6 md:pl-8 relative">
          <span
            aria-hidden
            className="absolute left-0 top-1 bottom-2 w-[2px]"
            style={{ background: GOLD }}
          />
          <span
            className="uppercase text-[10.5px] tracking-[0.18em] font-medium block"
            style={{ color: GOLD }}
          >
            {t(UI.eyebrow)}
          </span>
          <h1
            className="mt-3 text-[32px] md:text-[40px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400, lineHeight: 1.05 }}
          >
            {t(UI.introTitle)}
          </h1>
          <p className="mt-5 text-[15px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
            {t(UI.introBody)}
          </p>
          <p
            className="mt-4 text-[11.5px] uppercase tracking-[0.14em]"
            style={{ color: MUTED }}
          >
            {t(UI.signedInAs)}{' '}
            <span className="normal-case tracking-normal" style={{ color: INK }}>
              {authUser?.email}
            </span>
            {' · '}
            <span className="normal-case tracking-normal">{edition.name}</span>
          </p>
        </header>

        {/* Rail de progression candidat — 4 jalons (dossier / soumis / sélec / finale).
            Étape courante (état "aucun dossier") = #1 Dossier, jalon gold rempli. */}
        <nav
          aria-label={t({ fr: 'Parcours candidat', en: 'Applicant journey', de: 'Bewerbungspfad' })}
          className="mb-10 md:mb-12"
        >
          <ol className="grid grid-cols-4 gap-2 md:gap-3" role="list">
            {[
              { n: 1, label: { fr: 'Dossier',  en: 'Dossier',    de: 'Akte' } },
              { n: 2, label: { fr: 'Soumis',   en: 'Submitted',  de: 'Eingereicht' } },
              { n: 3, label: { fr: 'Sélec.',   en: 'Selection',  de: 'Auswahl' } },
              { n: 4, label: { fr: 'Finale',   en: 'Finale',     de: 'Finale' } },
            ].map((stage, i, arr) => {
              const isCurrent = stage.n === 1;
              const last = i === arr.length - 1;
              return (
                <li key={stage.n} className="flex flex-col">
                  <div className="flex items-center w-full">
                    <span
                      aria-hidden
                      className="shrink-0 inline-flex items-center justify-center rounded-full"
                      style={{
                        width: 12,
                        height: 12,
                        background: isCurrent ? GOLD : 'transparent',
                        border: `1.5px solid ${isCurrent ? GOLD : CREAM2}`,
                      }}
                    />
                    {!last && (
                      <span
                        aria-hidden
                        className="ml-1 flex-1 h-px"
                        style={{ background: CREAM2 }}
                      />
                    )}
                  </div>
                  <span
                    className="mt-2 uppercase text-[10px] tracking-[0.14em] font-medium tabular-nums"
                    style={{ color: isCurrent ? NAVY : MUTED }}
                  >
                    {String(stage.n).padStart(2, '0')}·{t(stage.label)}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[12.5px] italic" style={{ fontFamily: SERIF, color: INK }}>
            {t({ fr: 'Vous êtes ici.', en: 'You are here.', de: 'Sie sind hier.' })}
            {daysToClose != null && !closed && (
              <span
                className="ml-2 not-italic text-[11px] uppercase tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                {' · J-'}{daysToClose}{' '}
                {t({
                  fr: "jusqu'à clôture",
                  en: 'until close',
                  de: 'bis Schluss',
                })}
              </span>
            )}
          </p>
        </nav>

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
            {t(UI.introStart)}
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
      <PageShell nav footer={<PlatformFooter />}>
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
  // Le mini-banner contextualisé du Funnel affiche désormais l'édition seule
  // (plus de club côté candidat — assigné par admin post-soumission).
  return (
    <PageShell nav footer={<PlatformFooter />}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <GuideSpaceHelp space="dossier" editionId={editionId || null} className="shrink-0" />
      </div>
      <CandidatureFunnel
        startup={dossier}
        edition={edition}
        rules={rules}
        onPatch={handlePatch}
        onFlush={handleFlush}
        onSubmit={handleSubmit}
        onCancel={editingSubmitted ? () => setEditingSubmitted(false) : undefined}
        saving={saveDraft.isPending}
        submitting={submit.isPending}
        readOnly={closed && !canEditSubmitted}
        closeDate={closeDate}
      />
    </PageShell>
  );
}
