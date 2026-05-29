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

import React, { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  PageShell,
  PlatformFooter,
  Eyebrow,
  EditorialTitle,
  PersonaPreviewBanner,
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
import { useAllCompetitions, useAllClubs } from '@/components/rsa/admin/platform/master/useMaster';
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
  const scopeMatchesOption = scopeOptions.some((o) => o.value === scope);
  const effectiveScope = scopeMatchesOption ? scope : defaultScope;

  // Label résolu du scope courant (pour le banner de preview).
  const currentScopeLabel = scopeOptions.find((o) => o.value === effectiveScope)?.label || '';

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
    body = <ClubCockpit clubId={effectiveScope.slice('club:'.length)} />;
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

      {scopeOptions.length > 1 && (
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
      )}

      {body}
    </PageShell>
  );
}
