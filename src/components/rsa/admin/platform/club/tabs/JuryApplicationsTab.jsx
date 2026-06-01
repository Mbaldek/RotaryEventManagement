// JuryApplicationsTab (Club Cockpit) — Module 7 partie 2.
//
// File d'attente des candidatures jury déposées via le funnel public
// /JuryCandidate?club=<id>. Le club_admin peut approuver ou refuser chaque
// dossier. Côté SQL :
//   - rsa_list_jury_applications : restreint master_admin / club_admin du club
//   - rsa_approve_jury_application : retourne { application, needs_auth_creation, user_id }
//   - rsa_reject_jury_application  : status pending -> rejected
//
// needsAuthCreation : si le candidat n'a pas encore signé in une fois (auth.users
// vide pour son email), la RPC ne peut pas finaliser le membership. Le club_admin
// reçoit alors un message lui demandant d'envoyer un magic-link (Email Studio M9
// à venir). Dès que le candidat se connecte au moins une fois, le club_admin
// rappelle approve() pour finaliser membership + profile.
//
// Wiré dans ClubCockpit.jsx : 'jury_applications' fait partie des PREP_TABS
// (cf. src/lib/rsa/club-cockpit/modes.js), labellisé dans CLUB_TABS, rendu dans
// l'onglet du mode Préparation.

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Check,
  X,
  Mail,
  Calendar,
  Briefcase,
  Tag,
  Clock,
  Link as LinkIcon,
  AlertTriangle,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  NAVY,
  GOLD,
  CREAM,
  CREAM2,
  INK,
  MUTED,
  SERIF,
  EASE,
  TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, SUCCESS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { JuryApplication } from '@/lib/rsa/entities';
import { JURY_TAB_UI, JURY_QUALITES } from '@/components/rsa/candidature/juryFunnel.i18n';

const PHOTO_BUCKET = 'jury-photos';
const FILTERS = ['pending', 'approved', 'rejected', null];

function qualiteLabel(value, t) {
  const q = JURY_QUALITES.find((x) => x.value === value);
  return q ? t(q.label) : value;
}

function StatusPillLocal({ status, t }) {
  const map = {
    pending:   { bg: '#f7eddc', dot: '#9a6400', label: t(JURY_TAB_UI.statusPending) },
    approved:  { bg: '#ecf1e5', dot: SUCCESS,   label: t(JURY_TAB_UI.statusApproved) },
    rejected:  { bg: TINT_DANGER, dot: DANGER,  label: t(JURY_TAB_UI.statusRejected) },
    cancelled: { bg: CREAM2, dot: MUTED,        label: t(JURY_TAB_UI.statusCancelled) },
  };
  const tone = map[status] || map.cancelled;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px]"
      style={{ background: tone.bg, color: NAVY, border: `1px solid ${CREAM2}` }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} aria-hidden />
      {tone.label}
    </span>
  );
}

function CopyButton({ value, t }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard indisponible — silencieux */
        }
      }}
      className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
      style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
    >
      {done ? <CheckCircle2 className="w-3 h-3" style={{ color: SUCCESS }} /> : <Copy className="w-3 h-3" />}
      {done ? t(JURY_TAB_UI.copied) : t(JURY_TAB_UI.copy)}
    </button>
  );
}

// ─── Modale de refus (confirmation typée + note optionnelle) ───────────────

function RejectModal({ open, onClose, onConfirm, busy }) {
  const { t } = useLang();
  const [note, setNote] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setNote('');
      setTyped('');
      setError(null);
    }
  }, [open]);

  const expected = t(JURY_TAB_UI.rejectConfirmWord);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 31, 61, 0.45)' }}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="w-full max-w-md rounded-[4px] p-5"
            style={{ background: CREAM, border: `1px solid ${CREAM2}` }}
          >
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: DANGER }} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {t(JURY_TAB_UI.rejectModalTitle)}
            </h3>
            <p className="text-[12.5px] mt-1" style={{ color: INK }}>
              {t(JURY_TAB_UI.rejectModalBody)}
            </p>
          </div>
        </div>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(JURY_TAB_UI.rejectModalPlaceholder)}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] mb-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        />
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={expected}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] mb-3"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        />
        {error && <p className="text-[12px] mb-2" style={{ color: DANGER }}>{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(JURY_TAB_UI.cancel)}
          </button>
          <button
            type="button"
            disabled={busy || typed !== expected}
            onClick={async () => {
              if (typed !== expected) {
                setError(`${expected} ?`);
                return;
              }
              try {
                await onConfirm(note.trim() || null);
              } catch (e) {
                setError(e?.message || 'Error');
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
            style={{ background: DANGER, color: 'white' }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t(JURY_TAB_UI.reject)}
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Carte candidature ────────────────────────────────────────────────────

function ApplicationCard({ app, sessionsById, photoUrl, onApprove, onReject, busyId }) {
  const { t, lang } = useLang();
  const dateFmt = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(
        lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
      );
    } catch { return iso; }
  };

  const themes = Array.isArray(app.preferred_themes) ? app.preferred_themes : [];
  const sessionLabels = (Array.isArray(app.availability_session_ids) ? app.availability_session_ids : [])
    .map((id) => sessionsById.get(id)?.name)
    .filter(Boolean);

  const isPending = app.status === 'pending';
  const isBusy = busyId === app.id;

  return (
    <article
      className="group rounded-[4px] p-4 mb-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="flex items-start gap-3 mb-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="w-12 h-12 rounded-full object-cover shrink-0"
            style={{ border: `1px solid ${CREAM2}` }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: MUTED }}
            aria-hidden
          >
            <Briefcase className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              {app.full_name}
            </h3>
            <StatusPillLocal status={app.status} t={t} />
          </div>
          {/* Métier réel : fonction + organisation en premier. */}
          {(app.role_title || app.organisation) && (
            <p className="text-[12.5px] mt-0.5 font-medium" style={{ color: NAVY }}>
              {[app.role_title, app.organisation].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-[12px] mt-0.5" style={{ color: INK }}>
            <Mail className="w-3 h-3 inline mr-1" />
            <a href={`mailto:${app.email}`} className="underline decoration-1 underline-offset-2" style={{ color: NAVY }}>
              {app.email}
            </a>
            {app.qualite && (
              <>
                <span className="mx-2" style={{ color: MUTED }}>·</span>
                <span style={{ color: MUTED }}>{qualiteLabel(app.qualite, t)}</span>
              </>
            )}
          </p>
          <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>
            <Calendar className="w-3 h-3 inline mr-1" />
            {t(JURY_TAB_UI.appliedAt)} {dateFmt(app.applied_at)}
          </p>
        </div>
      </header>

      {app.bio && (
        <div className="mb-3">
          <p className="text-[10.5px] uppercase tracking-[0.12em] mb-1" style={{ color: MUTED }}>
            {t(JURY_TAB_UI.bioLabel)}
          </p>
          <p className="text-[13px] whitespace-pre-wrap" style={{ color: INK }}>{app.bio}</p>
        </div>
      )}

      {themes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10.5px] uppercase tracking-[0.12em] mb-1" style={{ color: MUTED }}>
            <Tag className="w-3 h-3 inline mr-1" />
            {t(JURY_TAB_UI.themesLabel)}
          </p>
          <ul className="flex flex-wrap gap-1.5 list-none m-0 p-0">
            {themes.map((th) => (
              <li
                key={th}
                className="text-[11.5px] px-2 py-0.5 rounded-full"
                style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
              >
                {th}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sessionLabels.length > 0 && (
        <div className="mb-3">
          <p className="text-[10.5px] uppercase tracking-[0.12em] mb-1" style={{ color: MUTED }}>
            <Clock className="w-3 h-3 inline mr-1" />
            {t(JURY_TAB_UI.availabilityLabel)}
          </p>
          <p className="text-[12.5px]" style={{ color: INK }}>{sessionLabels.join(', ')}</p>
        </div>
      )}

      {!isPending && (
        <p className="text-[11.5px] mt-2 pt-2" style={{ color: MUTED, borderTop: `1px dashed ${CREAM2}` }}>
          {t(JURY_TAB_UI.reviewedBy)} {app.reviewed_by || '—'} · {t(JURY_TAB_UI.reviewedAt)} {dateFmt(app.reviewed_at)}
          {app.reviewer_note && (
            <>
              <br />
              <strong style={{ color: INK }}>{t(JURY_TAB_UI.noteLabel)} :</strong> {app.reviewer_note}
            </>
          )}
        </p>
      )}

      {isPending && (
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${CREAM2}` }}>
          <button
            type="button"
            onClick={() => onApprove(app)}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium text-white disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY }}
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t(JURY_TAB_UI.approve)}
          </button>
          <button
            type="button"
            onClick={() => onReject(app)}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
          >
            <X className="w-3.5 h-3.5" />
            {t(JURY_TAB_UI.reject)}
          </button>
        </div>
      )}
    </article>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────

export default function JuryApplicationsTab({ clubId }) {
  const { t } = useLang();
  const qc = useQueryClient();

  const [filter, setFilter] = useState('pending');
  const [toast, setToast] = useState(null); // { kind: 'ok'|'err', msg }
  const [rejectModalFor, setRejectModalFor] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Liste des candidatures (RPC restrict club_admin/master_admin).
  const appsQ = useQuery({
    queryKey: ['rsa', 'jury-applications', clubId, filter],
    queryFn: () => JuryApplication.listByClub(clubId, filter),
    enabled: !!clubId,
    staleTime: 15 * 1000,
  });
  const apps = appsQ.data || [];

  // Photos : signed URLs pour chaque photo_path présent. Régénérées à chaque
  // refetch (TTL court côté Storage).
  const photoPaths = useMemo(
    () => apps.filter((a) => !!a.photo_path).map((a) => a.photo_path),
    [apps],
  );
  const photosQ = useQuery({
    queryKey: ['rsa', 'jury-applications', 'photos', clubId, photoPaths.join('|')],
    queryFn: async () => {
      if (photoPaths.length === 0) return {};
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(photoPaths, 300);
      if (error) return {};
      const out = {};
      for (const item of data || []) {
        if (item?.path && item?.signedUrl) out[item.path] = item.signedUrl;
      }
      return out;
    },
    enabled: photoPaths.length > 0,
    staleTime: 4 * 60 * 1000,
  });

  // Sessions par id pour rendre les libellés de dispo.
  const sessionIds = useMemo(() => {
    const s = new Set();
    for (const a of apps) for (const id of a.availability_session_ids || []) s.add(id);
    return Array.from(s);
  }, [apps]);
  const sessionsQ = useQuery({
    queryKey: ['rsa', 'jury-applications', 'sessions', clubId, sessionIds.join('|')],
    queryFn: async () => {
      if (sessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, theme, session_date')
        .in('id', sessionIds);
      if (error) return [];
      return data || [];
    },
    enabled: sessionIds.length > 0,
    staleTime: 60 * 1000,
  });
  const sessionsById = useMemo(() => {
    const m = new Map();
    for (const s of sessionsQ.data || []) m.set(s.id, s);
    return m;
  }, [sessionsQ.data]);

  // ── Mutations ──────────────────────────────────────────────────────────
  const approve = useMutation({
    mutationFn: (id) => JuryApplication.approve(id),
    onSuccess: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ['rsa', 'jury-applications', clubId] });
      setToast({ kind: 'ok', msg: t(JURY_TAB_UI.approveSuccess) });
    },
    onError: (err) => { setBusyId(null); setToast({ kind: 'err', msg: err?.message || 'Error' }); },
  });
  const reject = useMutation({
    mutationFn: ({ id, note }) => JuryApplication.reject(id, note),
    onSuccess: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ['rsa', 'jury-applications', clubId] });
      setRejectModalFor(null);
      setToast({ kind: 'ok', msg: t(JURY_TAB_UI.rejectSuccess) });
    },
    onError: (err) => {
      setBusyId(null);
      setToast({ kind: 'err', msg: err?.message || 'Error' });
    },
  });

  useEffect(() => {
    if (!toast) return;
    const tid = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tid);
  }, [toast]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleApprove = (app) => {
    setBusyId(app.id);
    approve.mutate(app.id);
  };
  const handleOpenReject = (app) => setRejectModalFor(app);
  const handleConfirmReject = async (note) => {
    if (!rejectModalFor) return;
    setBusyId(rejectModalFor.id);
    await reject.mutateAsync({ id: rejectModalFor.id, note });
  };

  // Lien public à partager (origin + path + ?club=).
  const publicLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    return `${origin}/JuryCandidate?club=${encodeURIComponent(clubId)}`;
  }, [clubId]);

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.16em] font-medium" style={{ color: GOLD }}>
            {t(JURY_TAB_UI.eyebrow)}
          </span>
        </div>
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(JURY_TAB_UI.title)}
        </h3>
        <p className="text-[13px] mt-1" style={{ color: INK }}>{t(JURY_TAB_UI.subtitle)}</p>
      </header>

      {/* Lien public à partager */}
      <div
        className="rounded-[4px] p-3 mb-4 flex items-center gap-3 flex-wrap"
        style={{ background: CREAM, border: `1px solid ${CREAM2}` }}
      >
        <LinkIcon className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            {t(JURY_TAB_UI.shareLink)}
          </p>
          <p className="text-[12.5px] font-mono break-all" style={{ color: NAVY }}>{publicLink}</p>
        </div>
        <CopyButton value={publicLink} t={t} />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => {
          const id = f || 'all';
          const label =
            f === 'pending' ? t(JURY_TAB_UI.filterPending) :
            f === 'approved' ? t(JURY_TAB_UI.filterApproved) :
            f === 'rejected' ? t(JURY_TAB_UI.filterRejected) :
            t(JURY_TAB_UI.filterAll);
          const active = filter === f;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{
                background: active ? NAVY : TINT_ADMIN,
                color: active ? 'white' : INK,
                border: `1px solid ${active ? NAVY : CREAM2}`,
              }}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-auto text-[12px] self-center" style={{ color: MUTED }}>
          {apps.length} {apps.length === 1 ? t(JURY_TAB_UI.countOne) : t(JURY_TAB_UI.countMany)}
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="mb-3 rounded-[4px] p-3 text-[12.5px]"
          style={{
            background: toast.kind === 'ok' ? '#ecf1e5' : TINT_DANGER,
            color: NAVY,
            border: `1px solid ${CREAM2}`,
          }}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      {/* Liste */}
      {appsQ.isLoading && (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
        </div>
      )}
      {!appsQ.isLoading && appsQ.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{appsQ.error?.message || 'Error'}</p>
      )}
      {!appsQ.isLoading && !appsQ.isError && apps.length === 0 && (
        <p className="text-[13px] py-4" style={{ color: MUTED }}>{t(JURY_TAB_UI.empty)}</p>
      )}
      {!appsQ.isLoading && apps.length > 0 && (
        <div>
          {apps.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              sessionsById={sessionsById}
              photoUrl={a.photo_path ? photosQ.data?.[a.photo_path] : null}
              onApprove={handleApprove}
              onReject={handleOpenReject}
              busyId={busyId}
            />
          ))}
        </div>
      )}

      <RejectModal
        open={!!rejectModalFor}
        busy={reject.isPending}
        onClose={() => { setRejectModalFor(null); setBusyId(null); }}
        onConfirm={handleConfirmReject}
      />
    </section>
  );
}
