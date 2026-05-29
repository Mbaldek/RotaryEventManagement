// ClubsTab — onglet « Clubs » du funnel de compétition.
//
// Trois cas :
//   * mode='create' & multiclub  → message « Vous pourrez attacher des clubs
//     après la création. »
//   * mode='create' & monoclub   → message « Compétition monoclub — section
//     non applicable. »
//   * mode='edit' & multiclub    → réutilise AttachedClubsPanel (V2.5)
//     existant via le RPC EditionClub (attach/detach + integrity guard).
//   * mode='edit' & monoclub     → AttachedClubsPanel en mode read-only (un
//     seul club, pas de détach).
//
// AttachedClubsPanel a été extrait du CompetitionEditor original. On le copie
// ici tel quel (sans modifications) pour éviter une dépendance circulaire et
// permettre la suppression future de l'ancien CompetitionEditor.jsx.

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, X, AlertTriangle,
  LayoutPanelTop, UserPlus, BarChart3,
} from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import StatPopover from '@/components/design/StatPopover';
import { useLang } from '@/lib/platform/i18n';
import { UI, COMP, CLUB_ROW_ACTIONS } from '../i18n';
import {
  useAllClubs,
  useClubsForEdition,
  useAttachClub,
  useDetachClub,
} from '../useMaster';
import useClubStats from '../useClubStats';
import { SectionNote, FieldLabel } from './fields';
import InviteClubAdminModal from './InviteClubAdminModal';

// ── Row inline actions (équipe C — cross-cockpit deep-links) ────────────────
// Style ghost commun aux 3 boutons (Cockpit / Inviter admin / Stats) :
//   - texte NAVY, border CREAM2, hover GOLD ;
//   - icon 14 px à gauche ;
//   - label en small caps (uppercase tracking-wide) ;
//   - padding py-1 px-2, gap-1.5.
function RowActionButton({ icon: Icon, label, title, onClick, refCb, extraProps }) {
  return (
    <button
      type="button"
      ref={refCb}
      onClick={onClick}
      title={title || label}
      aria-label={title || label}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[10.5px] uppercase tracking-[0.12em] font-medium transition-colors duration-150 hover:border-[#c9a84c] hover:text-[#0f1f3d] ${FOCUS_RING_CLASS}`}
      style={{ color: NAVY, background: 'white', border: `1px solid ${CREAM2}` }}
      {...(extraProps || {})}
    >
      {Icon && <Icon className="w-[14px] h-[14px]" aria-hidden style={{ color: GOLD }} />}
      <span>{label}</span>
    </button>
  );
}

// Bloc des actions d'une row club attaché. Composant à part car il loue 3 hooks
// (navigate, stats) qui ne doivent pas vivre dans le map() inline.
function AttachedClubRowActions({ club, editionId }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Lazy : les stats ne se fetchent qu'une fois la première fois que le popover
  // est ouvert (mais comme la queryKey est partagée par tous les clubs de la même
  // édition, ce coût est mutualisé).
  const [statsTouched, setStatsTouched] = useState(false);
  const stats = useClubStats({
    clubId:     club.id,
    editionId:  statsTouched ? editionId : null,
  });

  const handleOpenCockpit = () => {
    // Refonte hiérarchie : drill-down canonique club:{eid}/{cid} pour que
    // le breadcrumb Master ▸ Compétition ▸ Club reste cohérent au mount du
    // ClubCockpit (sinon, l'éditionId est résolu silencieusement et on perd
    // l'info "vient de cette compétition").
    navigate(`/Admin?scope=club:${encodeURIComponent(editionId)}/${encodeURIComponent(club.id)}`);
  };

  const items = useMemo(() => {
    const d = stats?.data;
    return [
      { label: t(CLUB_ROW_ACTIONS.statApplications), value: d ? d.startupsCount  : '—' },
      { label: t(CLUB_ROW_ACTIONS.statSessions),     value: d ? d.sessionsCount  : '—' },
      { label: t(CLUB_ROW_ACTIONS.statFinalists),    value: d ? d.finalistsCount : '—' },
    ];
  }, [stats?.data, t]);

  return (
    <>
      {/* Stack vertical sur < md, inline gap-1.5 dès md. */}
      <div className="flex flex-col md:flex-row md:items-center gap-1.5 shrink-0">
        <RowActionButton
          icon={LayoutPanelTop}
          label={t(CLUB_ROW_ACTIONS.openCockpit)}
          title={t(CLUB_ROW_ACTIONS.openCockpitTitle)}
          onClick={handleOpenCockpit}
        />
        <RowActionButton
          icon={UserPlus}
          label={t(CLUB_ROW_ACTIONS.inviteAdmin)}
          title={t(CLUB_ROW_ACTIONS.inviteAdminTitle)}
          onClick={() => setInviteOpen(true)}
        />
        <StatPopover
          title={t(CLUB_ROW_ACTIONS.statPopoverTitle)}
          items={items}
          loading={statsTouched && stats?.isLoading}
          loadingLabel={t(CLUB_ROW_ACTIONS.statLoading)}
          error={statsTouched && stats?.isError ? t(CLUB_ROW_ACTIONS.statError) : null}
          onOpenChange={(open) => { if (open) setStatsTouched(true); }}
          trigger={(_open, ref, props) => (
            <RowActionButton
              icon={BarChart3}
              label={t(CLUB_ROW_ACTIONS.viewStats)}
              title={t(CLUB_ROW_ACTIONS.viewStatsTitle)}
              refCb={ref}
              extraProps={props}
            />
          )}
        />
      </div>

      <InviteClubAdminModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        clubId={club.id}
        clubName={club.name}
      />
    </>
  );
}

function DetachButton({ editionId, clubId, clubName, onDetach }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onConfirm() {
    if (typed !== 'DETACH') {
      setError(t(COMP.detachTypePrompt));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onDetach({ editionId, clubId });
      setOpen(false);
      setTyped('');
    } catch (err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === '23503' || /startups|sessions/i.test(msg)) {
        setError(t(COMP.detachIntegrityBlocked));
      } else {
        setError(msg || 'Error');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
        title={t(COMP.detachClub)}
      >
        <X className="w-3 h-3" /> {t(COMP.detachClub)}
      </button>
    );
  }

  return (
    <div
      className="rounded-[4px] p-3 mt-2 w-full"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px]" style={{ color: NAVY }}>
            <strong>{t(COMP.detachConfirmTitle)} — {clubName}.</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {t(COMP.detachConfirmBody)}
          </p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t(COMP.detachTypePrompt)}
              className="flex-1 text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            <button
              type="button"
              onClick={onConfirm}
              disabled={typed !== 'DETACH' || busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t(COMP.detachClub)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setTyped(''); setError(null); }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(UI.cancel)}
            </button>
          </div>
          {error && (
            <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachedClubsPanel({ competition }) {
  const { t } = useLang();
  const attached = useClubsForEdition(competition.id);
  const allClubs = useAllClubs();
  const attach = useAttachClub();
  const detach = useDetachClub();

  const [pickedClubId, setPickedClubId] = useState('');
  const [attachError, setAttachError] = useState(null);

  const attachedList = attached.data || [];
  const allList = allClubs.data || [];

  const attachedIds = useMemo(
    () => new Set(attachedList.map((row) => row.club_id)),
    [attachedList],
  );
  const availableClubs = useMemo(
    () => allList.filter((c) => !attachedIds.has(c.id)),
    [allList, attachedIds],
  );

  async function onAttach() {
    setAttachError(null);
    if (!pickedClubId) return;
    try {
      await attach.mutateAsync({ editionId: competition.id, clubId: pickedClubId });
      setPickedClubId('');
    } catch (err) {
      setAttachError(err?.message || 'Error');
    }
  }

  const isMulti = competition.model === 'multiclub';

  return (
    <section>
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMP.attachedClubsSection)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {attachedList.length}</span>
      </header>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>{t(COMP.attachedClubsHint)}</p>

      {isMulti && (
        <div
          className="rounded-[4px] p-3 mb-4 flex items-end gap-3 flex-wrap"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex-1 min-w-[220px]">
            <FieldLabel htmlFor="club-picker">{t(COMP.pickClubToAttach)}</FieldLabel>
            <select
              id="club-picker"
              value={pickedClubId}
              onChange={(e) => setPickedClubId(e.target.value)}
              disabled={availableClubs.length === 0 || allClubs.isLoading}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              <option value="">—</option>
              {availableClubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
              ))}
            </select>
            {availableClubs.length === 0 && !allClubs.isLoading && (
              <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>{t(COMP.allClubsAttached)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onAttach}
            disabled={!pickedClubId || attach.isPending}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {attach.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t(COMP.attachClub)}
          </button>
          {attachError && (
            <span className="text-[12px] w-full" style={{ color: DANGER }}>{attachError}</span>
          )}
        </div>
      )}

      {attached.isLoading && (
        <div className="py-3 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!attached.isLoading && attachedList.length === 0 && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(COMP.noClubsAttached)}</p>
      )}

      {!attached.isLoading && attachedList.length > 0 && (
        <ul className="divide-y" style={{ borderColor: CREAM2 }}>
          {attachedList.map((row) => {
            const club = row.club || { id: row.club_id, name: row.club_id };
            return (
              <li key={row.club_id} className="py-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium" style={{ color: NAVY }}>{club.name}</p>
                  <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>
                    {club.id}
                    {club.region && (
                      <> · <span style={{ color: GOLD }}>{club.region}</span></>
                    )}
                  </p>
                </div>
                {/* Équipe C — cross-cockpit deep-links + invite + stats popover */}
                <AttachedClubRowActions
                  club={club}
                  editionId={competition.id}
                />
                {isMulti && (
                  <DetachButton
                    editionId={competition.id}
                    clubId={row.club_id}
                    clubName={club.name}
                    onDetach={(vars) => detach.mutateAsync(vars)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function ClubsTab({ competition, mode = 'edit' }) {
  const { t } = useLang();

  // Mode création (la compétition n'existe pas encore en DB) → on n'a pas d'ID
  // donc l'attach RPC ne peut rien faire. On affiche un message d'attente.
  if (mode === 'create' || !competition?.id) {
    const isMonoclub = (competition?.model || 'multiclub') === 'monoclub';
    return (
      <div>
        <SectionNote>
          {isMonoclub ? t(COMP.clubsMonoclubNote) : t(COMP.clubsAfterCreate)}
        </SectionNote>
      </div>
    );
  }

  return <AttachedClubsPanel competition={competition} />;
}
