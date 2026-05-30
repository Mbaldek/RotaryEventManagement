// Cockpit Admin — orchestrateur du Module 4a (SETUP / LIVE / RESULTS).
//
// Flux : auth-gate (-> /Login) -> role-gate (isAdmin) -> AdminShell + URL state.
// La frontière de sécurité reste serveur (RLS + RPC SECURITY DEFINER) ; le gate ici
// est purement UX (un comité-only sans rôle 'admin' tombe sur la carte Forbidden).
//
// Le shell consomme `?tab=`, `?edition=`, `?session=` (mirror legacy RsaAdmin).
//
// V3 — Persona selector master_admin :
//   Un master_admin peut désormais basculer en vue aperçu (?scope=…) :
//     * 'master'                  → MasterCockpit (défaut)
//     * 'competition:{editionId}' → CompetitionAdminCockpit (simulation comp_admin)
//     * 'club:{clubId}'           → ClubCockpit (simulation club_admin)
//   Un PersonaPreviewBanner sticky rappelle qu'une vue aperçu est active et offre
//   un retour 1-clic au scope Master. Le scope est persisté en URL pour permettre
//   de partager le lien et de rebondir entre les vues sans relogger.

import React, { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  EditorialTitle,
  PersonaPreviewBanner,
  HierarchyBreadcrumb,
  GOLD,
  NAVY,
  INK,
  MUTED,
  CREAM2,
  FOCUS_RING_CLASS,
  SafeBackLink,
} from '@/components/design';
import { usePlatformAuth } from '@/lib/platform/auth';
import { useLang } from '@/lib/platform/i18n';
import AdminShell from '@/components/rsa/admin/platform/AdminShell';
import MasterCockpit from '@/components/rsa/admin/platform/master/MasterCockpit';
import ClubCockpit from '@/components/rsa/admin/platform/club/ClubCockpit';
import CompetitionAdminCockpit from '@/components/rsa/admin/platform/master/CompetitionAdminCockpit';
import {
  useAllCompetitions,
  useAllClubs,
  useClubsForEdition,
} from '@/components/rsa/admin/platform/master/useMaster';
import useHierarchyScope from '@/components/rsa/admin/platform/useHierarchyScope';
import { UI } from '@/components/rsa/admin/platform/i18n';

function Centered({ children, minHeight = '40vh' }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />;
}

export default function Admin() {
  const {
    isAuthenticated,
    isAdmin,
    isMasterAdmin,
    myAdminClubs,
    loading: authLoading,
    identityLoaded,
  } = usePlatformAuth();
  const { t } = useLang();
  const [params, setParams] = useSearchParams();

  // V2 multi-club : sélecteur de scope (Master / Competition X / Club X / AdminShell legacy)
  // - master_admin par défaut → Master Cockpit (vue plateforme globale)
  // - master_admin peut basculer en vue aperçu compétition / club (V3)
  // - club_admin d'un ou plusieurs clubs → Club Cockpit (avec selector si N>1)
  // - admin legacy (sans master_admin ni club_admin) → AdminShell V1 (backward-compat)
  const hasMaster = isMasterAdmin;
  const adminClubs = myAdminClubs || [];
  const hasClubAdmin = adminClubs.length > 0;
  const hasLegacyAdmin = isAdmin;

  // Source de vérité pour le persona selector : URL (?scope=…). Defaults :
  //   master_admin    → 'master'
  //   club_admin only → 'club:{firstClub}'
  //   legacy admin    → 'legacy'
  //   none            → 'none'
  const defaultScope = hasMaster
    ? 'master'
    : hasClubAdmin
      ? `club:${adminClubs[0]}`
      : hasLegacyAdmin
        ? 'legacy'
        : 'none';
  const scope = params.get('scope') || defaultScope;

  const setScope = (next) => {
    const p = new URLSearchParams(params);
    if (!next || next === defaultScope) {
      p.delete('scope');
    } else {
      p.set('scope', next);
    }
    // Quitter les sous-tabs/subview hérités du précédent scope pour éviter les
    // états inconsistants (ex. ?subview=edit-competition d'un Master Cockpit qui
    // ne s'applique pas à un ClubCockpit).
    p.delete('subview');
    p.delete('id');
    p.delete('tab');
    setParams(p, { replace: true });
  };

  // V3 hiérarchie — breadcrumb + résolution silencieuse du scope legacy
  // ?scope=club:{cid} → ?scope=club:{eid}/{cid}. À placer AVANT toute early
  // return pour respecter les Rules of Hooks. Le breadcrumb ne rend rien tant
  // qu'on est en scope 'master'/'legacy'/'none' ; il s'affiche quand on monte
  // dans une compétition ou un club.
  const hierarchy = useHierarchyScope({ scope, t, setScope });
  useEffect(() => {
    if (hierarchy.resolvedLegacyScope && hierarchy.resolvedLegacyScope !== scope) {
      const p = new URLSearchParams(params);
      p.set('scope', hierarchy.resolvedLegacyScope);
      setParams(p, { replace: true });
    }
     
  }, [hierarchy.resolvedLegacyScope]);

  // V3 — pour le master_admin, le selector dévoile toutes les compétitions
  // (status != 'closed') et tous les clubs pour simuler n'importe quel persona.
  // On ne déclenche les hooks que si master_admin pour éviter le coût pour les
  // autres profils (les hooks sont sûrs à conditionner ici car le composant ne
  // remonte pas avant que `isMasterAdmin` se stabilise après auth).
  const competitionsQ = useAllCompetitions();
  const clubsQ = useAllClubs();

  const activeCompetitions = useMemo(() => {
    if (!hasMaster) return [];
    return (competitionsQ.data || []).filter((c) => c.status !== 'closed');
  }, [hasMaster, competitionsQ.data]);

  const allClubs = useMemo(() => {
    if (!hasMaster) return [];
    return clubsQ.data || [];
  }, [hasMaster, clubsQ.data]);

  // Phase 4 — Persona switcher cascade master_admin. On parse le scope COURANT
  // (raw URL) pour dériver editionId / clubId, alimenter les selects et le hook
  // useClubsForEdition. À placer AVANT les early returns (Rules of Hooks).
  const currentEditionId = useMemo(() => {
    if (!hasMaster) return null;
    if (scope.startsWith('competition:')) {
      return scope.slice('competition:'.length);
    }
    if (scope.startsWith('club:')) {
      const rest = scope.slice('club:'.length);
      return rest.includes('/') ? rest.split('/')[0] : null;
    }
    return null;
  }, [scope, hasMaster]);

  const currentClubId = useMemo(() => {
    if (!hasMaster) return null;
    if (scope.startsWith('club:')) {
      const rest = scope.slice('club:'.length);
      return rest.includes('/') ? rest.split('/')[1] : rest;
    }
    return null;
  }, [scope, hasMaster]);

  const clubsForEditionQ = useClubsForEdition(currentEditionId);

  if (authLoading) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }
  if (!isAuthenticated) return <Navigate to="/Login" replace />;

  // V3 hardening — tant que l'identité (roles + clubs + comp-editions) n'a
  // pas été chargée AU MOINS UNE FOIS avec succès, on ne tranche pas sur
  // Forbidden. Sinon : watchdog 10s + RPCs hung sur réseau froid = Forbidden
  // flash alors que le user EST master_admin. On affiche un spinner jusqu'à
  // ce que identityLoaded passe à true.
  if (!identityLoaded) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered>
          <Spinner />
        </Centered>
      </PageShell>
    );
  }

  // Aucun rôle admin (master, club_admin ni legacy admin) → Forbidden
  if (!hasMaster && !hasClubAdmin && !hasLegacyAdmin) {
    return (
      <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
        <Centered minHeight="50vh">
          <div className="text-center max-w-md">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(UI.eyebrow)}
              </span>
              <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            </div>
            <p className="text-[15px]" style={{ color: INK }}>
              {t(UI.noAccess)}
            </p>
          </div>
        </Centered>
      </PageShell>
    );
  }

  // Construit les options du sélecteur de scope.
  // V3 — pour le master_admin : Master + toutes compétitions actives + tous clubs.
  // Pour un club_admin classique : ses propres clubs uniquement.
  // Pour un admin legacy : option legacy unique.
  const scopeOptions = [];
  if (hasMaster) {
    scopeOptions.push({ value: 'master', label: t(UI.scopeMaster) });
    // Compétitions actives (status != 'closed')
    const compFn = t(UI.scopeCompetition);
    activeCompetitions.forEach((ed) => {
      const label = typeof compFn === 'function'
        ? compFn(ed.name || ed.id)
        : `${compFn} · ${ed.name || ed.id}`;
      scopeOptions.push({ value: `competition:${ed.id}`, label });
    });
    // Tous les clubs (par nom si dispo, sinon par id)
    const clubFn = t(UI.scopeClub);
    allClubs.forEach((cl) => {
      const label = typeof clubFn === 'function'
        ? clubFn(cl.name || cl.id)
        : `${clubFn} · ${cl.name || cl.id}`;
      scopeOptions.push({ value: `club:${cl.id}`, label });
    });
  } else if (hasClubAdmin) {
    // club_admin classique : ses propres clubs (label = id puisqu'on n'a pas le
    // nom dans le contexte auth — c'était le comportement V2 préservé).
    adminClubs.forEach((c) => {
      const labelFn = t(UI.scopeClub);
      const label = typeof labelFn === 'function' ? labelFn(c) : `${labelFn} · ${c}`;
      scopeOptions.push({ value: `club:${c}`, label });
    });
  } else if (hasLegacyAdmin) {
    scopeOptions.push({ value: 'legacy', label: t(UI.scopeLegacy) });
  }

  // Le scope courant peut ne pas matcher d'option (ex. ancien lien deep-link
  // vers une édition close ou un club supprimé). Dans ce cas on retombe sur
  // le default sans casser l'UI.
  //
  // V3 hiérarchie : on tolère aussi club:{eid}/{cid} (forme canonique) qui ne
  // figure pas en literal dans scopeOptions (qui n'a que club:{cid}). On
  // accepte donc tout scope qui commence par 'club:' OR competition:' tant
  // que le défaut peut s'appliquer ; sinon fallback defaultScope.
  const scopeMatchesOption = scopeOptions.some((o) => o.value === scope)
    || (hasMaster && (scope.startsWith('club:') || scope.startsWith('competition:')));
  const effectiveScope = scopeMatchesOption ? scope : defaultScope;

  // Label résolu du scope courant (pour le banner de preview).
  // Refonte hiérarchie : on n'utilise plus scopeOptions car celles-ci ne
  // contiennent que la forme legacy club:{cid}. On dérive directement le
  // libellé depuis effectiveScope et les listings disponibles.
  let currentScopeLabel = '';
  if (effectiveScope === 'master') {
    currentScopeLabel = t(UI.scopeMaster);
  } else if (effectiveScope === 'legacy') {
    currentScopeLabel = t(UI.scopeLegacy);
  } else if (effectiveScope.startsWith('competition:')) {
    const eid = effectiveScope.slice('competition:'.length);
    const ed = activeCompetitions.find((c) => c.id === eid);
    const fn = t(UI.scopeCompetition);
    const name = ed?.name || eid;
    currentScopeLabel = typeof fn === 'function' ? fn(name) : `${fn} · ${name}`;
  } else if (effectiveScope.startsWith('club:')) {
    const rest = effectiveScope.slice('club:'.length);
    const cid = rest.includes('/') ? rest.split('/')[1] : rest;
    const cl = allClubs.find((c) => c.id === cid);
    const fn = t(UI.scopeClub);
    const name = cl?.name || cid;
    currentScopeLabel = typeof fn === 'function' ? fn(name) : `${fn} · ${name}`;
  }

  // Banner : visible uniquement pour master_admin qui n'est PAS en scope master.
  const showPreviewBanner = hasMaster && effectiveScope !== 'master';

  // Rendu du contenu selon le scope
  let body;
  if (effectiveScope === 'master') {
    body = <MasterCockpit />;
  } else if (effectiveScope.startsWith('competition:')) {
    const editionId = effectiveScope.slice('competition:'.length);
    body = (
      <CompetitionAdminCockpit
        editionId={editionId}
        onClose={() => setScope('master')}
      />
    );
  } else if (effectiveScope.startsWith('club:')) {
    // V3 hiérarchie : club:{eid}/{cid} canonique ; club:{cid} legacy résolu
    // silencieusement par le useEffect ci-dessus.
    const rest = effectiveScope.slice('club:'.length);
    const [maybeEdition, maybeClub] = rest.includes('/')
      ? rest.split('/')
      : [null, rest];
    body = <ClubCockpit clubId={maybeClub} editionId={maybeEdition} />;
  } else {
    body = <AdminShell />;
  }

  return (
    <PageShell nav width="wide" footer={<PlatformFooter width="wide" />}>
      {/* ÉQUIPE C (history-nav) : lien "Retour" SAFE — navigate(-1) si history,
          sinon fallback "/" pour ne jamais sortir de l'onglet sur deep-link. */}
      <div className="mb-4">
        <SafeBackLink to="/" label="Retour" />
      </div>
      {/* V3 hiérarchie — breadcrumb Master ▸ Compétition ▸ Club. Rendu vide
          (donc invisible) en scope 'master' / 'legacy' / 'none'. */}
      <HierarchyBreadcrumb items={hierarchy.breadcrumbItems} />
      <header className="mb-8 md:mb-10">
        <Eyebrow>{t(UI.eyebrow)}</Eyebrow>
        <EditorialTitle lead={t(UI.pageTitle)} size="md" />
        <p className="mt-3 text-[14px] md:text-[15px] max-w-[60ch]" style={{ color: INK, lineHeight: 1.65 }}>
          {t(UI.pageSubtitle)}
        </p>
      </header>

      {/* V3 — Persona preview banner. Sticky-ish (mb-5 sous le header), visible
          uniquement si master_admin et scope != master. Cliquer "Retour à
          Master" reset le scope (URL + body). */}
      {showPreviewBanner && (
        <PersonaPreviewBanner
          scopeLabel={currentScopeLabel}
          onReturn={() => setScope('master')}
        />
      )}

      {/* Persona switcher — Phase 4 refonte hiérarchie.
          master_admin : cascade 2-niveaux (Compétition / Club). Le 2nd select
            n'apparaît que pour une compétition multiclub ; les monoclubs vont
            droit à competition:{eid} (un seul club implicite).
          club_admin / legacy admin : select plat existant (1 niveau). */}
      {hasMaster ? (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <label
            htmlFor="admin-scope-s1"
            className="text-[10.5px] uppercase tracking-[0.18em] font-medium"
            style={{ color: MUTED }}
          >
            {t(UI.viewLabel)}
          </label>
          <select
            id="admin-scope-s1"
            value={currentEditionId ? `competition:${currentEditionId}` : 'master'}
            onChange={(e) => setScope(e.target.value)}
            className={`text-[13px] rounded-[4px] px-3 py-1.5 ${FOCUS_RING_CLASS}`}
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <option value="master">{t(UI.scopeMaster)}</option>
            {activeCompetitions.map((ed) => {
              const compFn = t(UI.scopeCompetition);
              const label = typeof compFn === 'function'
                ? compFn(ed.name || ed.id)
                : `${compFn} · ${ed.name || ed.id}`;
              return (
                <option key={ed.id} value={`competition:${ed.id}`}>
                  {label}
                </option>
              );
            })}
          </select>

          {/* Select 2 (club) — visible pour les compétitions multiclub. Pour
              une compétition monoclub, le club unique est implicite. */}
          {currentEditionId
            && activeCompetitions.find((c) => c.id === currentEditionId)?.model === 'multiclub' && (
              <select
                id="admin-scope-s2"
                value={currentClubId || '__all__'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__all__') {
                    setScope(`competition:${currentEditionId}`);
                  } else {
                    setScope(`club:${currentEditionId}/${v}`);
                  }
                }}
                className={`text-[13px] rounded-[4px] px-3 py-1.5 ${FOCUS_RING_CLASS}`}
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
                aria-label={t({ fr: 'Club participant', en: 'Participating club', de: 'Teilnehmender Club' })}
              >
                <option value="__all__">
                  {t({ fr: 'Tous les clubs', en: 'All clubs', de: 'Alle Clubs' })}
                </option>
                {(clubsForEditionQ.data || []).map((row) => (
                  <option key={row.club_id} value={row.club_id}>
                    {row.club?.name || row.club_id}
                  </option>
                ))}
              </select>
            )}
        </div>
      ) : (
        scopeOptions.length > 1 && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <label
              htmlFor="admin-scope"
              className="text-[10.5px] uppercase tracking-[0.18em] font-medium"
              style={{ color: MUTED }}
            >
              {t(UI.viewLabel)}
            </label>
            <select
              id="admin-scope"
              value={effectiveScope}
              onChange={(e) => setScope(e.target.value)}
              className={`text-[13px] rounded-[4px] px-3 py-1.5 ${FOCUS_RING_CLASS}`}
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {scopeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )
      )}

      {body}
    </PageShell>
  );
}
