// Login plateforme RSA — porte UNIQUE (magic link). Après connexion, on route par rôle.
//
// Chantier 1 : le hardcoded `<Navigate to="/MonDossier" />` est remplacé par
// `computeLandingRoute(...)` (pur, testé) qui décide à partir des rôles globaux,
// des club_memberships, du `?next=` éventuel et de l'intent du lien d'entrée.
//
// Subtilité résolution :
//   - PlatformAuth pose `loading=false` dès `getSession` résolu, AVANT que
//     `loadIdentity` n'ait fini de charger rôles + clubs (cf. auth.jsx). On peut
//     donc avoir `isAuthenticated=true` et `roles=[]` pendant un court instant
//     sans être un user role-less. On ajoute un `resolved` local qui passe
//     à true rapidement — pire cas : un master_admin attend ROLE_RESOLVE_TIMEOUT_MS
//     avant le redirect, plutôt que d'être faussement classé candidat fallback.
//
// ÉQUIPE A — F1 : `hasDossier` lookup retiré (computeLandingRoute renvoyait
// /MonDossier dans tous les cas). On gagne 200-500ms.
// ÉQUIPE A — F2 : timeout fallback réduit de 600 → 200ms. Si `loading=false`
// ET roles=[] ET clubMemberships=[], on résout IMMÉDIATEMENT (pas d'attente).
// ÉQUIPE A — F6 : deux copies distinctes pour les deux spinners (init session
// vs chargement workspace).

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { PageShell, MagicLinkLogin } from '@/components/design';
import { GOLD, NAVY, SERIF, EASE } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { computeLandingRoute, parseLoginQuery } from '@/lib/platform/postLoginRoute';

// Délai max avant de considérer que la résolution rôles+clubs est terminée.
// On ne déclenche ce timeout QUE dans le cas où `loading` est encore true OU
// roles/clubMemberships sont encore en train d'arriver — pour le user
// authentifié role-less avéré, la résolution est immédiate (cf. F2).
const ROLE_RESOLVE_TIMEOUT_MS = 200;

export default function Login() {
  const { t } = useLang();
  const { search } = useLocation();
  const {
    isAuthenticated,
    loading,
    roles,
    clubMemberships,
  } = usePlatformAuth();

  // Parse ?next=&intent=&edition=&club= une seule fois par changement de search.
  const query = useMemo(() => parseLoginQuery(search || ''), [search]);

  // `resolved` = on a laissé assez de temps à loadIdentity pour s'exécuter.
  const [resolved, setResolved] = useState(false);

  // Reset de l'état local si on se déconnecte / change d'utilisateur.
  useEffect(() => {
    if (!isAuthenticated) {
      setResolved(false);
    }
  }, [isAuthenticated]);

  // Résolution rôles — trois branches (F2) :
  //   a) on a déjà au moins un rôle ou un club membership → résolu immédiat
  //   b) PlatformAuth a fini son init (loading=false) ET roles=[] ET
  //      clubMemberships=[] → user role-less avéré, résolu immédiat (pas
  //      d'attente artificielle)
  //   c) sinon (init pas terminée) → fallback setTimeout 200ms au cas où
  //      loadIdentity tarde, pour ne pas rester bloqué sur le spinner.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const hasRoles = (roles && roles.length) || (clubMemberships && clubMemberships.length);
    if (hasRoles) {
      setResolved(true);
      return undefined;
    }
    if (!loading) {
      // Init terminée ET aucun rôle : c'est un candidat, on résout direct.
      setResolved(true);
      return undefined;
    }
    const id = setTimeout(() => setResolved(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isAuthenticated, loading, roles, clubMemberships]);

  // — État 1 : déjà authentifié + résolu → redirect computé. —
  if (!loading && isAuthenticated && resolved) {
    const target = computeLandingRoute({
      roles,
      clubMemberships,
      nextParam: query.next,
      intent: query.intent,
      editionId: query.edition,
      clubId: query.club,
    });
    // DIAGNOSTIC : tracer le redirect post-login pour debugger les routages
    // inattendus (ex. master_admin envoyé sur /MonDossier alors que /Admin
    // attendu — observé 2026-05-29). À retirer une fois la cause identifiée.
    // eslint-disable-next-line no-console
    console.info('[Login] redirect →', target, { roles, clubMemberships: clubMemberships?.length, query });
    return <Navigate to={target} replace />;
  }

  // — État 2 : authentifié mais en attente de résolution rôles → workspace spinner. —
  if (!loading && isAuthenticated) {
    const loadingCopy = t({
      fr: 'Récupération de votre espace…',
      en: 'Loading your workspace…',
      de: 'Arbeitsbereich wird geladen…',
    });
    return (
      <PageShell>
        <div
          className="min-h-[70vh] flex flex-col items-center justify-center gap-4"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            aria-label={loadingCopy}
            style={{ color: GOLD }}
          />
          <p className="text-[14px]" style={{ color: NAVY, fontFamily: SERIF }}>
            {loadingCopy}
          </p>
        </div>
      </PageShell>
    );
  }

  // — État 2b : init auth (getSession) en cours → spinner session check. —
  if (loading) {
    const loadingCopy = t({
      fr: 'Vérification de votre session…',
      en: 'Checking your session…',
      de: 'Sitzung wird geprüft…',
    });
    return (
      <PageShell>
        <div
          className="min-h-[70vh] flex flex-col items-center justify-center gap-4"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            aria-label={loadingCopy}
            style={{ color: GOLD }}
          />
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
  // À ce stade `loading` est forcément false (sinon on serait sorti via État 2b),
  // donc pas besoin du garde `!loading &&` autour de la motion entry.
  const redirectPath = buildRedirectPath(query);

  return (
    <PageShell>
      <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="w-full max-w-[440px]"
        >
          <MagicLinkLogin
            redirectPath={redirectPath}
            intent={query.intent}
            editionId={query.edition}
            clubId={query.club}
          />
        </motion.div>
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
