// JuryApplicationsPanel — file de review master_admin (chantier 3).
//
// Standalone : à intégrer dans MasterCockpit en phase synthèse. Le composant
// est autonome, son intégration au shell sera faite par l'orchestrateur
// (probablement comme un 5e/6e onglet du cockpit ou un drawer sur l'onglet
// "Rôles globaux").
//
// UX :
//   - 4 tabs (Pending / Approved / Rejected / All) avec compteurs.
//   - Layout 2 colonnes (queue à gauche, detail à droite).
//   - Approve = flip status (la création du rôle jury + email reste TODO
//     chantier 4 — cf. commentaire dans la mutation).
//   - Reject = ouvre une textarea pour la raison, puis confirme.
//
// Sécurité :
//   - RLS côté DB (ja_master_select / ja_master_update) est la vraie frontière.
//   - Garde-fou UX : si !isMasterAdmin → placeholder "Accès refusé".

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Clock, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  Eyebrow,
  Textarea,
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  TINT_SAGE,
} from '@/components/design';
import {
  DANGER,
  TINT_DANGER,
  SUCCESS,
  WARNING,
  TINT_WARNING,
  FOCUS_RING_CLASS,
} from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { JuryApplication } from '@/lib/rsa/jury-applications';
import { UI, EXPERTISE_OPTIONS } from '@/components/rsa/jury-application/i18n';

// Tabs ordonnées : pending en premier (le default).
const TAB_IDS = ['pending', 'approved', 'rejected', 'all'];

const TAB_LABEL = {
  pending: UI.tabPending,
  approved: UI.tabApproved,
  rejected: UI.tabRejected,
  all: UI.tabAll,
};

const STATUS_BADGE = {
  pending: { bg: TINT_WARNING, fg: WARNING, label: UI.statusPending, Icon: Clock },
  approved: { bg: TINT_SAGE, fg: SUCCESS, label: UI.statusApproved, Icon: CheckCircle2 },
  rejected: { bg: TINT_DANGER, fg: DANGER, label: UI.statusRejected, Icon: XCircle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'fr-FR',
      { day: '2-digit', month: 'short', year: 'numeric' },
    );
  } catch {
    return '';
  }
}

function expertiseLabels(slugs, t) {
  if (!Array.isArray(slugs) || slugs.length === 0) return '—';
  return slugs
    .map((s) => {
      const opt = EXPERTISE_OPTIONS.find((o) => o.value === s);
      return opt ? t(opt.label) : s;
    })
    .join(' · ');
}

// ─── Pieces ───────────────────────────────────────────────────────────────

function Tab({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${FOCUS_RING_CLASS}`}
      style={{
        background: active ? NAVY : 'white',
        color: active ? 'white' : INK,
        border: `1px solid ${active ? NAVY : CREAM2}`,
      }}
      aria-pressed={active}
    >
      {label}
      {typeof count === 'number' && (
        <span
          className="ml-1.5 inline-block min-w-[20px] text-center text-[10.5px] tracking-wide rounded-full px-1.5"
          style={{
            background: active ? 'rgba(255,255,255,0.18)' : CREAM,
            color: active ? 'white' : MUTED,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBadge({ status, t }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const { Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {t(cfg.label)}
    </span>
  );
}

function QueueCard({ row, active, onClick, t, lang }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full rounded-md p-3.5 transition-colors ${FOCUS_RING_CLASS}`}
      style={{
        background: active ? CREAM : 'white',
        border: `1px solid ${active ? GOLD : CREAM2}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-[14px] truncate" style={{ color: NAVY }}>
            {row.full_name || '—'}
          </div>
          <div className="text-[12px] truncate" style={{ color: INK }}>
            {row.email}
          </div>
        </div>
        <StatusBadge status={row.status} t={t} />
      </div>
      <div className="mt-2 text-[11px]" style={{ color: MUTED }}>
        <Calendar className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden />
        {fmtDate(row.created_at || row.applied_at, lang)}
      </div>
    </button>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10.5px] uppercase tracking-[0.12em]"
        style={{ color: MUTED }}
      >
        {label}
      </span>
      <span className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
        {children}
      </span>
    </div>
  );
}

function DetailPanel({ row, onApprove, onReject, approving, rejecting, t, lang }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

  // Reset le mode rejet quand on change de candidature.
  React.useEffect(() => {
    setRejectMode(false);
    setReason('');
  }, [row?.id]);

  if (!row) {
    return (
      <div
        className="rounded-md p-8 text-center text-[13px]"
        style={{ background: 'white', border: `1px solid ${CREAM2}`, color: MUTED }}
      >
        {t(UI.emptyDetail)}
      </div>
    );
  }

  const canAct = row.status === 'pending';

  return (
    <motion.div
      key={row.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="rounded-md p-5 flex flex-col gap-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      {/* En-tête détail */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            className="text-[20px] font-normal"
            style={{ fontFamily: SERIF, color: NAVY }}
          >
            {row.full_name || '—'}
          </h3>
          <a
            href={`mailto:${row.email}`}
            className="text-[12.5px] inline-flex items-center gap-1 mt-1"
            style={{ color: INK, textDecorationColor: GOLD }}
          >
            <Mail className="w-3 h-3" aria-hidden /> {row.email}
          </a>
        </div>
        <StatusBadge status={row.status} t={t} />
      </div>

      {/* Champs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailRow label={t(UI.detailEditionLabel)}>
          {row.edition_id || t(UI.detailNone)}
        </DetailRow>
        <DetailRow label={t(UI.detailClubLabel)}>
          {row.club_id || t(UI.detailNone)}
        </DetailRow>
        <DetailRow label={t(UI.detailExpertiseLabel)}>
          {expertiseLabels(row.expertise, t)}
        </DetailRow>
        <DetailRow label={t(UI.detailAvailabilityLabel)}>
          {row.availability || t(UI.detailNone)}
        </DetailRow>
      </div>

      <DetailRow label={t(UI.detailMotivationLabel)}>
        <span className="whitespace-pre-wrap">
          {row.motivation || t(UI.detailNone)}
        </span>
      </DetailRow>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: CREAM2 }}>
        <DetailRow label={t(UI.detailSubmittedLabel)}>
          {fmtDate(row.created_at || row.applied_at, lang) || t(UI.detailNone)}
        </DetailRow>
        <DetailRow label={t(UI.detailReviewedLabel)}>
          {fmtDate(row.reviewed_at, lang) || t(UI.detailNone)}
        </DetailRow>
      </div>

      {row.status === 'rejected' && row.rejection_reason && (
        <DetailRow label={t(UI.detailRejectionLabel)}>
          <span className="whitespace-pre-wrap">{row.rejection_reason}</span>
        </DetailRow>
      )}

      {/* Actions */}
      {canAct && !rejectMode && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => onApprove(row)}
            disabled={approving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium ${FOCUS_RING_CLASS}`}
            style={{
              background: approving ? CREAM : NAVY,
              color: approving ? MUTED : 'white',
              border: `1px solid ${approving ? CREAM2 : NAVY}`,
              cursor: approving ? 'wait' : 'pointer',
            }}
          >
            {approving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <CheckCircle2 className="w-4 h-4" aria-hidden />}
            {t(UI.actionApprove)}
          </button>
          <button
            type="button"
            onClick={() => setRejectMode(true)}
            disabled={approving || rejecting}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium ${FOCUS_RING_CLASS}`}
            style={{
              background: 'white',
              color: DANGER,
              border: `1px solid ${CREAM2}`,
              cursor: 'pointer',
            }}
          >
            <XCircle className="w-4 h-4" aria-hidden />
            {t(UI.actionReject)}
          </button>
        </div>
      )}

      {canAct && rejectMode && (
        <div className="flex flex-col gap-2 pt-2">
          <label
            htmlFor={`reject-reason-${row.id}`}
            className="text-[11px] uppercase tracking-[0.12em]"
            style={{ color: INK }}
          >
            {t(UI.rejectReasonLabel)}
          </label>
          <Textarea
            id={`reject-reason-${row.id}`}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t(UI.rejectReasonPlaceholder)}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onReject(row, reason)}
              disabled={rejecting}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium ${FOCUS_RING_CLASS}`}
              style={{
                background: rejecting ? CREAM : DANGER,
                color: rejecting ? MUTED : 'white',
                border: `1px solid ${rejecting ? CREAM2 : DANGER}`,
                cursor: rejecting ? 'wait' : 'pointer',
              }}
            >
              {rejecting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              {t(UI.actionConfirmReject)}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectMode(false);
                setReason('');
              }}
              disabled={rejecting}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium ${FOCUS_RING_CLASS}`}
              style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
            >
              {t(UI.actionCancel)}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function JuryApplicationsPanel() {
  const { t, lang } = useLang();
  const { isMasterAdmin, authUser } = usePlatformAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);

  // Garde-fou UX : la RLS bloquerait de toute façon les non master_admins,
  // mais on évite des appels stériles + on rend un message Élysée plus chaud.
  const enabled = !!isMasterAdmin;

  // On charge TOUJOURS la liste complète pour pouvoir afficher les compteurs
  // de chaque tab et basculer instantanément sans relancer 4 queries. C'est
  // borné par .listAll(limit) côté entité.
  const query = useQuery({
    queryKey: ['rsa', 'jury-apps', 'all'],
    queryFn: () => JuryApplication.listAll(200),
    enabled,
    staleTime: 30 * 1000,
  });

  const rows = query.data || [];

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: rows.length };
    for (const r of rows) {
      if (r.status === 'pending') c.pending += 1;
      else if (r.status === 'approved') c.approved += 1;
      else if (r.status === 'rejected') c.rejected += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  // Sélection auto : 1er row du tab actif si rien de sélectionné OU si le row
  // sélectionné n'est plus dans la vue filtrée (ex. on vient d'approuver un
  // pending → il sort de Pending → on auto-sélectionne le suivant).
  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );
  React.useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const approveMut = useMutation({
    // TODO chantier 4 : déclencher RPC rsa_grant_role(email, 'jury') +
    // send-transactional jury-welcome ici. Pour l'instant, seul le status
    // bascule à 'approved' — le master_admin doit ajouter manuellement le
    // rôle dans app_user_roles en attendant.
    mutationFn: (row) => JuryApplication.approve(row.id, authUser?.id || null),
    onSuccess: () => {
      toast.success(t(UI.mutationApprovedToast));
      qc.invalidateQueries({ queryKey: ['rsa', 'jury-apps'], exact: false });
    },
    onError: (err) => {
      console.error('[JuryApplicationsPanel] approve failed:', err);
      toast.error(t(UI.mutationErrorToast));
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ row, reason }) =>
      JuryApplication.reject(row.id, authUser?.id || null, reason),
    onSuccess: () => {
      toast.success(t(UI.mutationRejectedToast));
      qc.invalidateQueries({ queryKey: ['rsa', 'jury-apps'], exact: false });
    },
    onError: (err) => {
      console.error('[JuryApplicationsPanel] reject failed:', err);
      toast.error(t(UI.mutationErrorToast));
    },
  });

  // ── Garde-fou : non master_admin → message ─────────────────────────────
  if (!isMasterAdmin) {
    return (
      <div
        className="rounded-md p-6 text-center text-[14px]"
        style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
      >
        {t(UI.forbidden)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header>
        <Eyebrow>{t(UI.panelEyebrow)}</Eyebrow>
        <h2
          className="text-[26px] font-normal"
          style={{ fontFamily: SERIF, color: NAVY }}
        >
          {t(UI.panelTitle)}
        </h2>
        <p className="text-[13.5px] mt-1.5 max-w-[620px]" style={{ color: INK }}>
          {t(UI.panelSubtitle)}
        </p>
      </header>

      {/* Tabs avec compteurs */}
      <div className="flex flex-wrap gap-2">
        {TAB_IDS.map((id) => (
          <Tab
            key={id}
            label={t(TAB_LABEL[id])}
            count={counts[id]}
            active={tab === id}
            onClick={() => {
              setTab(id);
              setSelectedId(null);
            }}
          />
        ))}
      </div>

      {/* Loading / contenu */}
      {query.isLoading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          {lang === 'en' ? 'Loading…' : lang === 'de' ? 'Laden…' : 'Chargement…'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-5">
          {/* Queue */}
          <aside className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div
                className="rounded-md p-5 text-center text-[13px]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: MUTED }}
              >
                {t(UI.emptyQueue)}
              </div>
            ) : (
              filtered.map((row) => (
                <QueueCard
                  key={row.id}
                  row={row}
                  active={selected?.id === row.id}
                  onClick={() => setSelectedId(row.id)}
                  t={t}
                  lang={lang}
                />
              ))
            )}
          </aside>

          {/* Detail */}
          <section>
            <DetailPanel
              row={selected}
              onApprove={(row) => approveMut.mutate(row)}
              onReject={(row, reason) => rejectMut.mutate({ row, reason })}
              approving={approveMut.isPending}
              rejecting={rejectMut.isPending}
              t={t}
              lang={lang}
            />
          </section>
        </div>
      )}
    </div>
  );
}
