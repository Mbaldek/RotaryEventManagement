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
import { PageShell, MagicLinkLogin, PlatformFooter } from '@/components/design';
import { GOLD, NAVY, SERIF, EASE } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { computeLandingRoute, parseLoginQuery } from '@/lib/platform/postLoginRoute';

// Délai max avant de considérer que la résolution rôles+clubs est terminée.
// Historique :
//   * 200ms → 1500ms (2026-05-29) : SSO Google trop lent sur cold-start.
//   * 1500ms → 9000ms (2026-05-30) : sur réseau froid + rsa_my_roles slow/erroné,
//     1500ms restait trop court → master_admin envoyé sur /MonDossier (cf.
//     docs/deepsolve/sso-google-master-admin-misroute.md). Aligné sur le timeout
//     RPC interne (8s) + 1s de marge réseau. Couplé au safety net plus bas, un
//     master_admin sera JAMAIS routé vers /MonDossier par fallback rôles=[] :
//     soit la RPC répond et on route correctement, soit on reste en spinner et
//     les retries auth.jsx finissent par populer roles. Coût : un VRAI candidat
//     sans rôle voit le spinner ~9s max si RPC outage — préférable à un master
//     éjecté vers le funnel candidat.
const ROLE_RESOLVE_TIMEOUT_MS = 9000;

export default function Login() {
  const { t } = useLang();
  const { search } = useLocation();
  const {
    isAuthenticated,
    loading,
    roles,
    clubMemberships,
    rolesLoaded,
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

  // Résolution rôles — quatre branches :
  //   a) on a déjà au moins un rôle ou un club membership → résolu immédiat
  //   b) rolesLoaded passé à true (rsa_my_roles a *réellement* répondu, success
  //      ou array vide confirmé) → on peut trancher : si roles=[] c'est un
  //      vrai candidat
  //   c) sinon (rsa_my_roles pas encore résolue) → fallback setTimeout 9000ms
  //      pour ne pas rester bloqué si l'init hang totalement (très rare)
  //   d) si pas authentifié → reset resolved par l'effet précédent
  //
  // BUG ROOT CAUSE (2026-05-30) : avant ce fix on attendait `identityLoaded`
  // qui était un OR de 4 RPC. Si rsa_my_roles erreur mais profiles réussissait,
  // identityLoaded=true → resolved=true → route avec roles=[] → /MonDossier.
  // Maintenant on attend `rolesLoaded` qui ne se base QUE sur rsa_my_roles,
  // l'unique source de vérité pour le routing.
  // Cf. docs/deepsolve/sso-google-master-admin-misroute.md.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const hasRoles = (roles && roles.length) || (clubMemberships && clubMemberships.length);
    if (hasRoles) {
      setResolved(true);
      return undefined;
    }
    if (rolesLoaded) {
      // rsa_my_roles a *réellement* répondu. Si roles toujours [],
      // c'est un candidat avéré.
      setResolved(true);
      return undefined;
    }
    // rolesLoaded encore false → on attend, mais on cap à 9000ms pour ne
    // jamais bloquer indéfiniment si l'init hang totalement. Le safety net
    // dans la branche redirect (ci-dessous) prend le relais à ce moment-là.
    const id = setTimeout(() => setResolved(true), ROLE_RESOLVE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isAuthenticated, loading, roles, clubMemberships, rolesLoaded]);

  // — État 1 : déjà authentifié + résolu → redirect computé. —
  if (!loading && isAuthenticated && resolved) {
    // SAFETY NET (FIX 2026-05-30) — si le fallback timer a expiré SANS que
    // rsa_my_roles n'ait répondu, ET qu'on n'a NI rôles globaux NI club
    // memberships, on est dans le scénario dangereux du deepsolve :
    // probablement un master/club admin dont la RPC a hang plutôt qu'un vrai
    // candidat sans rôle. Routing fallback vers /MonDossier produirait
    // exactement le bug qu'on essaie de fixer. On reste sur le spinner, les
    // retries auth.jsx (1.5s, 5s) finiront par populer roles, le useEffect
    // ci-dessus ré-évaluera et le routing se fera proprement.
    // Cf. docs/deepsolve/sso-google-master-admin-misroute.md §5 Patch 3.
    if (!rolesLoaded && roles.length === 0 && clubMemberships.length === 0) {
       
      console.warn('[Login] safety net — rolesLoaded=false after timeout, refusing /MonDossier fallback. Waiting for retry…');
      const safetyCopy = t({
        fr: 'Vérification de vos accès…',
        en: 'Verifying your access…',
        de: 'Berechtigungen werden geprüft…',
      });
      return (
        <PageShell footer={<PlatformFooter />}>
          <div
            className="min-h-[70vh] flex flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="w-6 h-6 animate-spin"
              aria-label={safetyCopy}
              style={{ color: GOLD }}
            />
            <p className="text-[14px]" style={{ color: NAVY, fontFamily: SERIF }}>
              {safetyCopy}
            </p>
          </div>
        </PageShell>
      );
    }
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
    // attendu — observé 2026-05-29). console.warn pour ne pas être filtré
    // par le niveau "Default" Chrome (info caché).
     
    console.warn('[Login] redirect →', target, { roles, clubMemberships: clubMemberships?.length, rolesLoaded, query });
    // ÉQUIPE C (history-nav) : on N'utilise PAS `replace` ici.
    // Conserver /Login dans l'history permet à un "back" depuis /Admin (ou
    // toute target post-login) de revenir au formulaire de login plutôt que
    // de sortir de l'app. Cf. docs/audit history-nav bug.
    return <Navigate to={target} />;
  }

  // — État 2 : authentifié mais en attente de résolution rôles → workspace spinner. —
  if (!loading && isAuthenticated) {
    const loadingCopy = t({
      fr: 'Récupération de votre espace…',
      en: 'Loading your workspace…',
      de: 'Arbeitsbereich wird geladen…',
    });
    return (
      <PageShell footer={<PlatformFooter />}>
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
      <PageShell footer={<PlatformFooter />}>
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

  const tagline = t({
    fr: 'au programme Rotary Startup Award',
    en: 'to the Rotary Startup Award programme',
    de: 'beim Rotary Startup Award',
  });
  const logoAlt = t({
    fr: 'Logo Rotary',
    en: 'Rotary logo',
    de: 'Rotary-Logo',
  });

  return (
    <PageShell footer={<PlatformFooter />}>
      {/* Hero H-Typo-Only — giant serif greeting + italic tagline, MagicLink dessous. */}
      <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="w-full max-w-[520px]"
        >
          <motion.img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698886adec2381a5bebb878f/8eca9f2bf_rotaryinterrouecrop.png"
            alt={logoAlt}
            className="mb-6 drop-shadow-[0_8px_20px_rgba(15,31,61,0.18)]"
            style={{
              width: 'clamp(96px, 14vw, 140px)',
              height: 'auto',
              display: 'block',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          <p
            className="italic mb-10"
            style={{
              fontFamily: SERIF,
              color: '#3a3a52',
              fontSize: 'clamp(15px, 2vw, 19px)',
              lineHeight: 1.3,
            }}
          >
            {tagline}
          </p>
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
