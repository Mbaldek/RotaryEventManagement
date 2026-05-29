// CompetitionAdminsTab — Master Cockpit, onglet « Admins compétition ».
//
// Permet au master_admin de :
//   * choisir une édition existante (picker),
//   * lister les competition_admins promus pour cette édition (RPC
//     `rsa_list_competition_admins`, équipe A — server-side gate),
//   * inviter un nouvel admin (modal → edge fn `invite-user` avec
//     role='competition_admin' + edition_id) — à la création serveur, l'edge fn
//     attribue le rôle et envoie le magic-link Élysée,
//   * révoquer un admin existant via typed-confirm (RPC
//     `rsa_revoke_competition_admin`).
//
// Frontière sécurité = serveur (RLS + RPC SECURITY DEFINER). Aucun gate de rôle
// ici : MasterCockpit ne monte cet onglet que pour master_admin.
//
// Cache invalidation : TanStack — clé ['rsa', 'master', 'competition-admins', editionId].

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, X, ShieldCheck } from 'lucide-react';
import {
  NAVY, GOLD, CREAM2, INK, MUTED, SERIF, EASE, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER, FOCUS_RING_CLASS, GOLD_TEXT } from '@/components/design/tokens.app';
import {
  Field, TextInput, Select,
} from '@/components/design';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/platform/i18n';
import { inviteUser } from '@/lib/platform/userManagement';
import { useAllCompetitions } from '../useMaster';
import { COMP_ADMINS, UI } from '../i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Hooks data ────────────────────────────────────────────────────────────────
// On parle directement à la RPC plutôt que de passer par une entité (l'équipe A
// livre `CompetitionAdmin.listForEdition` mais le contrat est aligné avec ces
// RPC — si la signature finale diffère, l'unique adapter à corriger est ici).
function useCompetitionAdmins(editionId) {
  return useQuery({
    queryKey: ['rsa', 'master', 'competition-admins', editionId],
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'rsa_list_competition_admins',
        { p_edition_id: editionId },
      );
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });
}

function useRevokeCompetitionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ editionId, email }) => {
      const { error } = await supabase.rpc('rsa_revoke_competition_admin', {
        p_edition_id: editionId,
        p_email: String(email).trim().toLowerCase(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ['rsa', 'master', 'competition-admins', vars.editionId],
      });
    },
  });
}

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteCompetitionAdminModal({ editionId, editionName, onClose, onSuccess }) {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [emailErr, setEmailErr] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEmailErr(null);
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setEmailErr(t(COMP_ADMINS.errInvalidEmail));
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteUser({
        email: normalized,
        role: 'competition_admin',
        editionId,
        lang,
      });
      if (!res?.ok) {
        throw new Error(res?.error || 'invite_failed');
      }
      onSuccess?.(normalized);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CompetitionAdminsTab] invite failed', err);
      setError(t(COMP_ADMINS.inviteError) + (err?.message || ''));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-comp-admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(250, 247, 242, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.28, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[560px] w-full rounded-[4px] flex flex-col overflow-hidden"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <header
          className="px-6 pt-5 pb-4 flex items-start gap-3"
          style={{ borderBottom: `1px solid ${CREAM2}` }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-1"
              style={{ color: GOLD_TEXT }}
            >
              {t(COMP_ADMINS.modalEyebrow)}
            </p>
            <h2
              id="invite-comp-admin-title"
              className="text-[22px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
            >
              {t(COMP_ADMINS.modalTitle)}
            </h2>
            {editionName && (
              <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>
                {editionName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            aria-label={t(UI.close)}
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-[13px]" style={{ color: INK }}>
            {t(COMP_ADMINS.modalSubtitle)}
          </p>

          <Field
            label={t(COMP_ADMINS.emailLabel)}
            required
            helper={t(COMP_ADMINS.emailHelper)}
            error={emailErr}
          >
            {({ id, describedBy, invalid, required }) => (
              <TextInput
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
                aria-required={required}
                placeholder={t(COMP_ADMINS.emailPlaceholder)}
                autoComplete="email"
                disabled={submitting}
              />
            )}
          </Field>

          {error && (
            <p
              className="text-[13px] rounded-[4px] px-3 py-2"
              role="alert"
              style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
            >
              {error}
            </p>
          )}
        </div>

        <footer
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`text-[13px] px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {t(COMP_ADMINS.revokeCancel)}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{
              background: submitting ? MUTED : NAVY,
              color: 'white',
              border: `1px solid ${submitting ? MUTED : NAVY}`,
              cursor: submitting ? 'wait' : 'pointer',
            }}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {submitting ? t(COMP_ADMINS.inviting) : t(COMP_ADMINS.inviteSubmit)}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

// ── Revoke confirm modal (typed-confirm) ──────────────────────────────────────
function RevokeConfirmModal({ editionId, email, onClose, onDone }) {
  const { t, lang } = useLang();
  const revoke = useRevokeCompetitionAdmin();
  // Phrase attendue : "REVOQUER {email}" en FR, "REVOKE {email}" sinon.
  const word =
    lang === 'fr'
      ? t(COMP_ADMINS.revokeTypedWordFr)
      : lang === 'de'
        ? t(COMP_ADMINS.revokeTypedWordDe)
        : t(COMP_ADMINS.revokeTypedWordEn);
  const expected = `${word} ${email}`;
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (typed.trim() !== expected.trim()) {
      setError(t(COMP_ADMINS.revokeMismatch));
      return;
    }
    try {
      await revoke.mutateAsync({ editionId, email });
      onDone?.();
    } catch (err) {
      setError(t(COMP_ADMINS.revokeError) + ' ' + (err?.message || ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-comp-admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(250, 247, 242, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.28, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[520px] w-full rounded-[4px] overflow-hidden"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <header className="px-6 pt-5 pb-3" style={{ borderBottom: `1px solid ${CREAM2}` }}>
          <h2
            id="revoke-comp-admin-title"
            className="text-[19px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(COMP_ADMINS.revokeTitle)}
          </h2>
        </header>

        <div className="px-6 py-4 flex flex-col gap-3">
          <p className="text-[13px]" style={{ color: INK }}>
            {t(COMP_ADMINS.revokeBody).replace('{email}', email)}
          </p>
          <Field
            label={t(COMP_ADMINS.revokeTypedPrompt)}
            error={error}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder={expected}
                autoFocus
                disabled={revoke.isPending}
              />
            )}
          </Field>
        </div>

        <footer
          className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`text-[13px] px-3 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ color: INK, background: 'white', border: `1px solid ${CREAM2}` }}
          >
            {t(COMP_ADMINS.revokeCancel)}
          </button>
          <button
            type="submit"
            disabled={revoke.isPending || typed.trim() !== expected.trim()}
            className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{
              background: (revoke.isPending || typed.trim() !== expected.trim()) ? MUTED : DANGER,
              color: 'white',
              border: `1px solid ${(revoke.isPending || typed.trim() !== expected.trim()) ? MUTED : DANGER}`,
              cursor: (revoke.isPending || typed.trim() !== expected.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {revoke.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {t(COMP_ADMINS.revokeConfirmCta)}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CompetitionAdminsTab() {
  const { t } = useLang();
  const competitions = useAllCompetitions();
  const [selectedEditionId, setSelectedEditionId] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeFor, setRevokeFor] = useState(null);

  // Bootstrap : 1re édition active si dispo, sinon la plus récente.
  React.useEffect(() => {
    if (selectedEditionId || !competitions.data?.length) return;
    const open = competitions.data.find((c) =>
      ['open', 'sessions', 'finale'].includes(c.status),
    );
    setSelectedEditionId((open || competitions.data[0])?.id || null);
  }, [competitions.data, selectedEditionId]);

  const selectedEdition = useMemo(
    () => (competitions.data || []).find((c) => c.id === selectedEditionId) || null,
    [competitions.data, selectedEditionId],
  );

  const adminsQ = useCompetitionAdmins(selectedEditionId);

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <section
      role="region"
      aria-labelledby="comp-admins-section-title"
      className="flex flex-col gap-6"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
              style={{ color: GOLD_TEXT }}
            >
              {t(COMP_ADMINS.sectionTitle)}
            </span>
          </div>
          <h2
            id="comp-admins-section-title"
            className="text-[22px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(COMP_ADMINS.sectionTitle)}
          </h2>
          <p className="text-[13px] mt-1.5 max-w-[680px]" style={{ color: INK }}>
            {t(COMP_ADMINS.intro)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          disabled={!selectedEditionId}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[13px] font-medium ${FOCUS_RING_CLASS}`}
          style={{
            background: selectedEditionId ? NAVY : MUTED,
            color: 'white',
            cursor: selectedEditionId ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {t(COMP_ADMINS.inviteButton)}
        </button>
      </header>

      {/* Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <Field label={t(COMP_ADMINS.pickCompetition)} className="min-w-[280px]">
          {({ id }) => (
            <Select
              id={id}
              value={selectedEditionId || ''}
              onChange={(e) => setSelectedEditionId(e.target.value || null)}
              placeholder={t(COMP_ADMINS.pickCompetitionPlaceholder)}
              options={(competitions.data || []).map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.year} · ${c.status}`,
              }))}
              disabled={competitions.isLoading || (competitions.data || []).length === 0}
            />
          )}
        </Field>
      </div>

      {/* Empty / loading / list */}
      {competitions.isLoading && (
        <div className="py-8 flex items-center justify-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
          {t(UI.loading)}
        </div>
      )}

      {!competitions.isLoading && (competitions.data || []).length === 0 && (
        <div
          className="rounded-[4px] p-6 text-center"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
        >
          <p className="text-[13px]" style={{ color: INK }}>{t(COMP_ADMINS.noCompetitions)}</p>
        </div>
      )}

      {selectedEditionId && (
        <div
          role="tabpanel"
          aria-labelledby="comp-admins-section-title"
          className="rounded-[4px] overflow-hidden"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          {adminsQ.isLoading && (
            <div className="py-8 flex items-center justify-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
              {t(COMP_ADMINS.loading)}
            </div>
          )}
          {adminsQ.isError && (
            <p
              className="text-[13px] m-4 rounded-[4px] px-3 py-2"
              role="alert"
              style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
            >
              {t(COMP_ADMINS.loadError)}
            </p>
          )}
          {!adminsQ.isLoading && !adminsQ.isError && (adminsQ.data || []).length === 0 && (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <ShieldCheck className="w-7 h-7" style={{ color: GOLD }} aria-hidden />
              <p className="text-[14px]" style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}>
                {t(COMP_ADMINS.empty)}
              </p>
              <p className="text-[12.5px] max-w-[420px]" style={{ color: MUTED }}>
                {t(COMP_ADMINS.emptyHint)}
              </p>
            </div>
          )}
          {!adminsQ.isLoading && !adminsQ.isError && (adminsQ.data || []).length > 0 && (
            <ul className="list-none m-0 p-0">
              {(adminsQ.data || []).map((row, idx) => (
                <li
                  key={row.email || row.user_id || idx}
                  className="px-4 md:px-5 py-3 flex items-center gap-4 flex-wrap"
                  style={{
                    borderTop: idx === 0 ? 'none' : `1px solid ${CREAM2}`,
                  }}
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-[14px]" style={{ color: NAVY, fontWeight: 500 }}>
                      {row.full_name || row.email || '—'}
                    </p>
                    <p className="text-[12px]" style={{ color: MUTED }}>
                      {row.email}
                    </p>
                  </div>
                  <div className="text-[12px] min-w-[140px]" style={{ color: INK }}>
                    <span className="uppercase tracking-[0.14em] text-[10.5px] mr-1.5" style={{ color: MUTED }}>
                      {t(COMP_ADMINS.colGrantedAt)}
                    </span>
                    {fmtDate(row.granted_at)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRevokeFor(row.email)}
                    className={`text-[12.5px] px-2.5 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
                    style={{
                      color: DANGER,
                      background: 'white',
                      border: `1px solid ${CREAM2}`,
                    }}
                  >
                    {t(COMP_ADMINS.revokeAction)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {inviteOpen && selectedEditionId && (
        <InviteCompetitionAdminModal
          editionId={selectedEditionId}
          editionName={selectedEdition?.name}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false);
            toast.success(t(COMP_ADMINS.inviteSuccess));
            adminsQ.refetch?.();
          }}
        />
      )}

      {revokeFor && selectedEditionId && (
        <RevokeConfirmModal
          editionId={selectedEditionId}
          email={revokeFor}
          onClose={() => setRevokeFor(null)}
          onDone={() => {
            setRevokeFor(null);
            toast.success(t(COMP_ADMINS.revokeSuccess));
          }}
        />
      )}
    </section>
  );
}
