// Login plateforme RSA — porte UNIQUE (magic link). Après connexion, on route par rôle.
//
// Chantier 1 : le hardcoded `<Navigate to="/MonDossier" />` est remplacé par
// `computeLandingRoute(...)` (pur, testé) qui décide à partir des rôles globaux,
// des club_memberships, du `?next=` éventuel et de l'intent du lien d'entrée.
//
// Subtilité résolution :
//   - PlatformAuth pose `loading=false` dès `getSession` résolu, AVANT que
//     `loadIdentity` n'ait fini de charger rôles + clubs (cf. auth.jsx). On peut
//     donc avoir `isAuthenticated=true` et `roles=[]` pendant ~quelques centaines
//     de ms sans être un user role-less. On ajoute un `resolved` local qui passe
//     à true au plus tard 600 ms après la première détection d'auth — pire cas :
//     un master_admin attend 600 ms avant le redirect, plutôt que d'être faussement
//     classé candidat fallback et envoyé sur /MonDossier au premier render.
//   - `hasDossier` est résolu via une requête légère `startups.eq(owner_id, uid).limit(1)`.
//     En cas d'échec (réseau, RLS), on retombe sur `false` — l'utilisateur verra
//     MonDossier en mode picker, pas de page cassée.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageShell, MagicLinkLogin } from '@/components/design';
import { GOLD, NAVY, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { supabase } from '@/lib/supabase';
import { computeLandingRoute, parseLoginQuery } from '@/lib/platform/postLoginRoute';

// Délai max avant de considérer que la résolution rôles+clubs est terminée.
// Aligné sur le watchdog auth (4s) mais beaucoup plus court parce qu'on n'a
// pas besoin d'attendre `getSession` ici — uniquement `loadIdentity`.
const ROLE_RESOLVE_TIMEOUT_MS = 600;

export default function Login() {
  const { t } = useLang();
  const { search } = useLocation();
  const {
    isAuthenticated,
    loading,
    authUser,
    roles,
    clubMemberships,
  } = usePlatformAuth();

  // Parse ?next=&intent=&edition=&club= une seule fois par changement de search.
  const query = useMemo(() => parseLoginQuery(search || ''), [search]);

  // `resolved` = on a laissé assez de temps à loadIdentity pour s'exécuter.
  const [resolved, setResolved] = useState(false);
  // `hasDossier` triple-state : null (inconnu, fetch pas fini), true, false.
  const [hasDossier, setHasDossier] = useState(null);

  // Reset de l'état local si on se déconnecte / change d'utilisateur.
  useEffect(() => {
    if (!isAuthenticated) {
      setResolved(false);
      setHasDossier(null);
    }
  }, [isAuthenticated]);

  // Timer de résolution rôles : ouvre la fenêtre de redirect après ROLE_RESOLVE_TIMEOUT_MS.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    // Si on a DÉJÀ au moins un rôle ou une club_membership, c'est résolu immédiatement.
    if ((roles && roles.length) || (clubMemberships && clubMemberships.length)) {
      setResolved(true);
      return undefined;
    }
    const id = setTimeout(() => setResolved(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isAuthenticated, roles, clubMemberships]);

  // Lookup léger « est-ce que ce user a un dossier startup ? ».
  // Pourquoi ici plutôt que dans le contexte auth : le contexte n'a pas à savoir
  // ce qu'est un "dossier" (couplage métier). On garde le contexte minimal.
  useEffect(() => {
    let active = true;
    if (!isAuthenticated || !authUser?.id) return undefined;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('startups')
          .select('id')
          .eq('owner_id', authUser.id)
          .limit(1);
        if (!active) return;
        if (error) {
          // RLS / réseau : on dégrade sans bruit, MonDossier saura quoi faire.
          // eslint-disable-next-line no-console
          console.warn('[Login] hasDossier lookup failed:', error.message || error);
          setHasDossier(false);
          return;
        }
        setHasDossier(Array.isArray(data) && data.length > 0);
      } catch (err) {
        if (!active) return;
        // eslint-disable-next-line no-console
        console.warn('[Login] hasDossier lookup threw:', err?.message || err);
        setHasDossier(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, authUser?.id]);

  // — État 1 : déjà authentifié + résolu → redirect computé. —
  if (!loading && isAuthenticated && resolved && hasDossier !== null) {
    const target = computeLandingRoute({
      roles,
      clubMemberships,
      hasDossier,
      nextParam: query.next,
      intent: query.intent,
      editionId: query.edition,
      clubId: query.club,
    });
    return <Navigate to={target} replace />;
  }

  // — État 2 : authentifié mais en attente de résolution → spinner court. —
  if (!loading && isAuthenticated) {
    const loadingCopy = t({
      fr: 'Connexion en cours…',
      en: 'Signing you in…',
      de: 'Anmeldung läuft…',
    });
    return (
      <PageShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden style={{ color: GOLD }} />
          <p className="text-[14px]" style={{ color: NAVY, fontFamily: SERIF }}>
            {loadingCopy}
          </p>
        </div>
      </PageShell>
    );
  }

  // — État 3 : pas (encore) authentifié → formulaire magic link. —
  // On revient sur /Login post-clic (avec query params préservés) plutôt que
  // sur /MonDossier direct : c'est ICI que la logique de routage vit maintenant.
  const redirectPath = buildRedirectPath(query);

  return (
    <PageShell>
      <div className="min-h-[70vh] flex items-center justify-center">
        {!loading && (
          <MagicLinkLogin
            redirectPath={redirectPath}
            intent={query.intent}
            editionId={query.edition}
            clubId={query.club}
          />
        )}
      </div>
    </PageShell>
  );
}

// Construit le chemin de retour magic-link en préservant le contexte d'entrée.
// On NE met PAS `next` dans le redirectPath (le user reviendra forcément sur
// /Login → on relit ?next= depuis l'URL au moment du redirect computé).
function buildRedirectPath({ next, intent, edition, club }) {
  const parts = [];
  if (next) parts.push(`next=${encodeURIComponent(next)}`);
  if (intent) parts.push(`intent=${encodeURIComponent(intent)}`);
  if (edition) parts.push(`edition=${encodeURIComponent(edition)}`);
  if (club) parts.push(`club=${encodeURIComponent(club)}`);
  return parts.length ? `/Login?${parts.join('&')}` : '/Login';
}
