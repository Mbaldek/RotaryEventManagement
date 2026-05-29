// AddJurorModal — modale d'ajout d'un juré à une session.
//
// 3 modes (switch en haut) :
//   1. 'existing' : sélectionner un juré déjà dans le pool club (RPC
//      rsa_list_club_members rôle 'jury') + role select (regular/special).
//   2. 'create'   : créer un juré externe inline (rsa_create_jury_profile)
//      puis rsa_assign_juror role='special'. Photo optionnelle, upload bucket
//      'uploads'.
//   3. 'invite'   : envoyer un magic-link (signInWithOtp) + créer la ghost
//      profile + assigner role='special'. Le lien auth.uid <-> ghost profile
//      se fait au premier sign-in côté /jury/onboarding (TODO ci-dessous).
//
// Style Élysée — modale calquée sur AwardPrizeModal (overlay
// rgba(15,31,61,0.45) + carte blanche border GOLD radius 4px).

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X, Mail, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF, EASE, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { Field, TextInput, Textarea, Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/db';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import {
  useClubJuryPool,
  useAssignJuror,
  useCreateJuryProfile,
} from './useJury';

const MODES = ['existing', 'create', 'invite'];

const ROLE_OPTIONS = [
  { value: 'regular', labelKey: 'roleRegular' },
  { value: 'special', labelKey: 'roleSpecial' },
];

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function ModeSwitch({ value, onChange, modes }) {
  const { t } = useLang();
  const labels = {
    existing: t(SESSION_JURY.modeExisting),
    create:   t(SESSION_JURY.modeCreate),
    invite:   t(SESSION_JURY.modeInvite),
  };
  const icons = {
    existing: UserCheck,
    create:   UserPlus,
    invite:   Mail,
  };
  return (
    <div
      className="grid grid-cols-3 gap-1 p-1 rounded-[4px] mb-4"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      role="tablist"
    >
      {modes.map((m) => {
        const Icon = icons[m];
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[3px] text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{
              background: active ? NAVY : 'transparent',
              color: active ? 'white' : INK,
              fontWeight: active ? 500 : 400,
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate">{labels[m]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AddJurorModal({ sessionId, clubId, onClose }) {
  const { t } = useLang();
  const [mode, setMode] = useState('existing');

  const poolQ = useClubJuryPool(clubId);
  const assign = useAssignJuror(sessionId);
  const createProfile = useCreateJuryProfile();

  // Mode 1 — existing
  const [pickedJurorId, setPickedJurorId] = useState('');
  const [pickedRole, setPickedRole] = useState('regular');

  // Modes 2 + 3 — fields communs
  const [qualite, setQualite] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [bio, setBio] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Mode 3 — fields additionnels
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Pool list filtré : on retire ceux déjà assignés à la session (UX seulement —
  // la base supporte l'upsert idempotent côté rsa_assign_juror).
  const poolOptions = useMemo(() => {
    const rows = poolQ.data || [];
    return rows.map((p) => ({
      value: p.user_id,
      label: [
        p.full_name || p.email || p.user_id?.slice(0, 8),
        p.qualite ? '· ' + p.qualite : null,
        p.organisation ? '· ' + p.organisation : null,
      ].filter(Boolean).join(' '),
    }));
  }, [poolQ.data]);

  async function maybeUploadPhoto() {
    if (!photoFile) return null;
    setUploading(true);
    try {
      const res = await uploadFile(photoFile);
      // uploadFile retourne { file_url } — mais on stocke le path, donc on
      // extrait le segment après /uploads/ si on a juste l'URL publique.
      // Pour cohérence avec photo_path stocké en relatif côté autres composants,
      // on garde l'URL publique complète (compat avec consommateurs existants).
      return res.file_url || null;
    } catch (err) {
      throw new Error(t(SESSION_JURY.errPhotoUpload) + ' (' + (err?.message || err) + ')');
    } finally {
      setUploading(false);
    }
  }

  // ── Submit handlers par mode ────────────────────────────────────────────────
  async function handleSubmitExisting() {
    if (!pickedJurorId) return;
    setError(null);
    setSubmitting(true);
    try {
      await assign.mutateAsync({ juryUserId: pickedJurorId, role: pickedRole });
      toast.success(t(SESSION_JURY.jurorAssigned));
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCreate() {
    setError(null);
    if (!qualite.trim()) {
      setError(t(SESSION_JURY.errQualiteRequired));
      return;
    }
    setSubmitting(true);
    try {
      const photoPath = await maybeUploadPhoto();
      const newUserId = await createProfile.mutateAsync({
        qualite: qualite.trim(),
        organisation: organisation.trim(),
        bio: bio.trim(),
        photoPath,
        roleHint: 'special',
      });
      await assign.mutateAsync({ juryUserId: newUserId, role: 'special' });
      toast.success(t(SESSION_JURY.jurorCreated));
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitInvite() {
    setError(null);
    if (!validEmail(email)) {
      setError(t(SESSION_JURY.errInvalidEmail));
      return;
    }
    if (!qualite.trim()) {
      setError(t(SESSION_JURY.errQualiteRequired));
      return;
    }
    setSubmitting(true);
    try {
      // 1) Créer la ghost profile (user_id généré côté SQL, sans auth.users).
      const photoPath = await maybeUploadPhoto();
      const fullBio = bio.trim() || [firstName.trim(), lastName.trim()]
        .filter(Boolean).join(' ');
      const newUserId = await createProfile.mutateAsync({
        qualite: qualite.trim(),
        organisation: organisation.trim(),
        bio: fullBio,
        photoPath,
        roleHint: 'special',
      });
      // 2) Attacher la ghost profile à la session avec role='special'.
      await assign.mutateAsync({ juryUserId: newUserId, role: 'special' });

      // 3) Envoyer le magic-link. signInWithOtp ne provisionne PAS de user
      //    avant le clic ; au premier sign-in, le hook /jury/onboarding doit
      //    détecter qu'aucune fiche n'est liée à auth.uid() et faire un UPDATE
      //    platform_jury_profiles SET user_id = auth.uid(), auth_linked_at = now()
      //    sur la ghost profile la plus récente correspondant à l'email
      //    (à matcher via un champ d'invite ou via une RPC d'onboarding).
      //
      // TODO(jury-onboarding): implémenter /jury/onboarding qui :
      //   - lit auth.uid()
      //   - cherche la ghost profile (par email d'invite) à laquelle l'utilisateur
      //     a été pré-assigné
      //   - met à jour platform_jury_profiles.user_id = auth.uid()
      //     et auth_linked_at = now()
      //   - met à jour platform_jury_assignments.jury_user_id en cascade.
      //
      // Pour cette V0, on envoie juste le magic-link Supabase brut. La table
      // ghost porte la trace bio/qualite ; le lien sera reconnecté côté
      // onboarding au prochain sprint.
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: origin + '/jury/onboarding',
        },
      });
      if (otpErr) {
        // Le profile est créé + assigné — on prévient mais on ne rollback pas.
        toast.warning((t(SESSION_JURY.jurorCreated)) + ' · ' + (otpErr.message || ''));
      } else {
        toast.success(t(SESSION_JURY.jurorInvited));
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    if (mode === 'existing') return handleSubmitExisting();
    if (mode === 'create')   return handleSubmitCreate();
    if (mode === 'invite')   return handleSubmitInvite();
    return null;
  }

  const busy = submitting || uploading || assign.isPending || createProfile.isPending;

  const roleSelectOptions = ROLE_OPTIONS.map((r) => ({
    value: r.value,
    label: t(SESSION_JURY[r.labelKey]),
  }));

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15,31,61,0.45)' }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !busy) onClose?.();
        }}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="rounded-[4px] w-full max-w-[560px] p-5"
          style={{ background: 'white', border: `1px solid ${GOLD}`, maxHeight: '90vh', overflowY: 'auto' }}
        >
          <header className="mb-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
                <span
                  className="uppercase text-[10px] tracking-[0.18em] font-medium"
                  style={{ color: GOLD }}
                >
                  {t(SESSION_JURY.modalEyebrow)}
                </span>
              </div>
              <h3
                className="text-[18px]"
                style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
              >
                {t(SESSION_JURY.addJuror)}
              </h3>
              <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>
                {t(SESSION_JURY.sectionHint)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              aria-label={t(SESSION_JURY.modalCancel)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </header>

          <ModeSwitch value={mode} onChange={setMode} modes={MODES} />

          {/* ── Mode 1 : existing ─────────────────────────────────────────── */}
          {mode === 'existing' && (
            <div className="space-y-3">
              {poolQ.isLoading && (
                <div className="py-4 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
                </div>
              )}
              {!poolQ.isLoading && poolOptions.length === 0 && (
                <p className="text-[12.5px] py-3" style={{ color: MUTED }}>
                  {t(SESSION_JURY.noPoolAvailable)}
                </p>
              )}
              {!poolQ.isLoading && poolOptions.length > 0 && (
                <>
                  <Field label={t(SESSION_JURY.modeExisting)} required>
                    {({ id, describedBy }) => (
                      <Select
                        id={id}
                        aria-describedby={describedBy}
                        placeholder={t(SESSION_JURY.pickJurorPlaceholder)}
                        options={poolOptions}
                        value={pickedJurorId}
                        onChange={(e) => setPickedJurorId(e.target.value)}
                        disabled={busy}
                      />
                    )}
                  </Field>
                  <Field label={t(SESSION_JURY.roleRegular) + ' / ' + t(SESSION_JURY.roleSpecial)} required>
                    {({ id, describedBy }) => (
                      <Select
                        id={id}
                        aria-describedby={describedBy}
                        options={roleSelectOptions}
                        value={pickedRole}
                        onChange={(e) => setPickedRole(e.target.value)}
                        disabled={busy}
                      />
                    )}
                  </Field>
                </>
              )}
            </div>
          )}

          {/* ── Mode 2 : create external juror ────────────────────────────── */}
          {mode === 'create' && (
            <div className="space-y-3">
              <Field label={t(SESSION_JURY.formQualite)} required>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    value={qualite}
                    onChange={(e) => setQualite(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
              <Field label={t(SESSION_JURY.formOrganisation)}>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
              <Field label={t(SESSION_JURY.formBio)}>
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
              <Field label={t(SESSION_JURY.formPhoto)}>
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    disabled={busy}
                    className="block w-full text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                    style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
                  />
                )}
              </Field>
            </div>
          )}

          {/* ── Mode 3 : invite by email ──────────────────────────────────── */}
          {mode === 'invite' && (
            <div className="space-y-3">
              <Field label={t(SESSION_JURY.formEmail)} required>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t(SESSION_JURY.formFirstName)}>
                  {({ id, describedBy }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>
                <Field label={t(SESSION_JURY.formLastName)}>
                  {({ id, describedBy }) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>
              </div>
              <Field label={t(SESSION_JURY.formQualite)} required>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    value={qualite}
                    onChange={(e) => setQualite(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
              <Field label={t(SESSION_JURY.formOrganisation)}>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    disabled={busy}
                  />
                )}
              </Field>
            </div>
          )}

          {error && (
            <p className="text-[12px] mt-3" style={{ color: DANGER }} role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 justify-end pt-4 mt-2"
            style={{ borderTop: `1px solid ${CREAM2}` }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(SESSION_JURY.modalCancel)}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                busy
                || (mode === 'existing' && (!pickedJurorId || poolOptions.length === 0))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {uploading ? t(SESSION_JURY.uploading) : t(SESSION_JURY.modalSubmit)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
