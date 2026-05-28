// ClubFunnel — modal funnel de création d'un club (Master Cockpit V2.5+).
//
// UX :
//   - Modal backdrop-blur (FunnelEditorModal — contrat partagé avec
//     CompetitionFunnel, livré en parallèle par l'autre agent ; fallback stub si
//     non disponible au runtime).
//   - 4 onglets : Informations / Représentant / Président / Coordonnées.
//   - Étape 1 (Informations) : nom + pays + langue requis pour pouvoir créer.
//     Les 3 autres onglets sont visibles mais désactivés tant que la création
//     n'est pas faite (helper "Disponible après la création").
//   - Étape 2 : bouton "Créer le club" → Club.createClub(...) → récupère l'ID.
//   - Étape 3 : on bascule en mode autosave (useAutosaveClub) — chaque change
//     dans n'importe quel onglet est persisté 600ms après la dernière frappe.
//   - Le user peut fermer la modale à tout moment (flush en sortie + toast).
//
// Notes archi :
//   - L'onglet "Informations" reste éditable après création (le SQL permet à un
//     master_admin de renommer un club, l'ID lui reste figé).
//   - Le toast "Club créé" est émis une seule fois, juste après l'INSERT.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { NAVY, CREAM2, INK, MUTED } from '@/components/design';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS, COUNTRY_OPTIONS, LANGUAGE_OPTIONS, EMAIL_REGEX } from './i18n';
import { useCreateClub } from './useMaster';
import useAutosaveClub from '../funnel/useAutosaveClub';
import FunnelEditorModal from '../funnel/FunnelEditorModal';
import InfoTab from './clubTabs/InfoTab';
import ContactTab from './clubTabs/ContactTab';
import PresidentTab from './clubTabs/PresidentTab';
import AddressTab from './clubTabs/AddressTab';

const EMPTY_VALUES = {
  name: '',
  country: '',
  language: 'fr',
  contactFirstName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  presidentFirstName: '',
  presidentLastName: '',
  presidentEmail: '',
  clubEmail: '',
  clubPhone: '',
  clubAddress: '',
};

function validateCreate(values, t) {
  const errors = {};
  if (!values.name || values.name.trim().length < 2) {
    errors.name = t(CLUBS.errNameTooShort);
  }
  if (!values.country || !COUNTRY_OPTIONS.some((c) => c.code === values.country)) {
    errors.country = t(CLUBS.errCountryRequired);
  }
  if (!values.language || !LANGUAGE_OPTIONS.some((l) => l.code === values.language)) {
    errors.language = t(CLUBS.errLanguageRequired);
  }
  return errors;
}

export default function ClubFunnel({ open, onClose, onCreated }) {
  const { t } = useLang();
  const create = useCreateClub();

  // Avant création — état local "pré-funnel".
  const [draft, setDraft] = useState(EMPTY_VALUES);
  const [activeTab, setActiveTab] = useState('info');
  const [createError, setCreateError] = useState(null);
  const [createErrors, setCreateErrors] = useState({});
  const [createdClubId, setCreatedClubId] = useState(null);
  const [createdToastShown, setCreatedToastShown] = useState(false);

  // Reset complet quand on ferme/réouvre.
  useEffect(() => {
    if (!open) {
      // Reset différé pour ne pas voir le contenu disparaître pendant l'animation exit.
      const t1 = setTimeout(() => {
        setDraft(EMPTY_VALUES);
        setActiveTab('info');
        setCreateError(null);
        setCreateErrors({});
        setCreatedClubId(null);
        setCreatedToastShown(false);
      }, 300);
      return () => clearTimeout(t1);
    }
    return undefined;
  }, [open]);

  // Après création : on bascule en mode autosave sur le club fraîchement créé.
  const auto = useAutosaveClub({
    clubId: createdClubId,
    initialValues: draft,
    debounceMs: 600,
  });

  // Valeurs et patch : si pas encore créé → state local ; sinon → hook autosave.
  const values = createdClubId ? auto.values : draft;
  const patchValues = (partial) => {
    if (createdClubId) {
      auto.patch(partial);
    } else {
      setDraft((p) => ({ ...p, ...partial }));
    }
  };

  // Création du club.
  async function handleCreate() {
    setCreateError(null);
    const errs = validateCreate(draft, t);
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) {
      setActiveTab('info');
      return;
    }
    try {
      const payload = Object.fromEntries(
        Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
      );
      const row = await create.mutateAsync(payload);
      if (row?.id) {
        setCreatedClubId(row.id);
        // Sync auto.values avec ce qu'on vient d'envoyer (le serveur a peut-être normalisé)
        auto.setValues({ ...EMPTY_VALUES, ...draft, ...row, ...payload });
        if (!createdToastShown) {
          toast.success(t(CLUBS.clubCreatedToast));
          setCreatedToastShown(true);
        }
        onCreated?.(row);
      }
    } catch (err) {
      setCreateError(err?.message || 'Error');
    }
  }

  async function handleClose() {
    // Flush l'autosave en attente (si on est en mode édition) puis fermeture.
    if (createdClubId) {
      try { await auto.flush(); } catch { /* swallow */ }
    }
    onClose?.();
  }

  // Status à passer au modal (autosave) — uniquement pertinent après création.
  const status = createdClubId ? auto.status : (create.isPending ? 'saving' : 'idle');
  const statusMessage = useMemo(() => {
    if (createdClubId) {
      if (auto.status === 'saving') return t(CLUBS.statusSaving);
      if (auto.status === 'saved') return t(CLUBS.statusSaved);
      if (auto.status === 'error') return auto.statusMessage || t(CLUBS.statusError);
      return '';
    }
    if (create.isPending) return t(UI.saving);
    return '';
  }, [createdClubId, auto.status, auto.statusMessage, create.isPending, t]);

  // Tabs : Info toujours, autres lockés si pas créé.
  const lockedAfter = !createdClubId;
  const tabs = useMemo(() => [
    {
      id: 'info',
      label: t(CLUBS.tabInfo),
      render: () => (
        <div className="space-y-5">
          {!createdClubId && (
            <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
              {t(CLUBS.funnelCreateIntro)}
            </p>
          )}
          <InfoTab
            values={values}
            onChange={patchValues}
            errors={createdClubId ? {} : createErrors}
            mode={createdClubId ? 'edit' : 'create'}
            clubId={createdClubId}
            disabled={create.isPending}
          />

          {!createdClubId && (
            <div
              className="flex items-center gap-3 pt-4 mt-2"
              style={{ borderTop: `1px solid ${CREAM2}` }}
            >
              <button
                type="button"
                onClick={handleCreate}
                disabled={create.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[13px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
                style={{ background: NAVY, color: 'white' }}
              >
                {create.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {create.isPending ? t(UI.saving) : t(CLUBS.funnelCreateButton)}
              </button>
              {createError && (
                <span
                  className="text-[12.5px] px-3 py-1.5 rounded-[4px]"
                  style={{
                    color: DANGER,
                    background: TINT_DANGER,
                    border: `1px solid ${CREAM2}`,
                  }}
                  role="alert"
                >
                  {createError}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'contact',
      label: t(CLUBS.tabContact),
      disabled: lockedAfter,
      render: () => (
        <div className="space-y-4">
          {lockedAfter && <LockedHint t={t} />}
          <ContactTab
            values={values}
            onChange={patchValues}
            disabled={lockedAfter}
          />
        </div>
      ),
    },
    {
      id: 'president',
      label: t(CLUBS.tabPresident),
      disabled: lockedAfter,
      render: () => (
        <div className="space-y-4">
          {lockedAfter && <LockedHint t={t} />}
          <PresidentTab
            values={values}
            onChange={patchValues}
            errors={
              !lockedAfter && values.presidentEmail && !EMAIL_REGEX.test(values.presidentEmail)
                ? { presidentEmail: t(CLUBS.errEmailFormat) }
                : {}
            }
            disabled={lockedAfter}
          />
        </div>
      ),
    },
    {
      id: 'address',
      label: t(CLUBS.tabAddress),
      disabled: lockedAfter,
      render: () => (
        <div className="space-y-4">
          {lockedAfter && <LockedHint t={t} />}
          <AddressTab
            values={values}
            onChange={patchValues}
            errors={
              !lockedAfter && values.clubEmail && !EMAIL_REGEX.test(values.clubEmail)
                ? { clubEmail: t(CLUBS.errEmailFormat) }
                : {}
            }
            disabled={lockedAfter}
          />
        </div>
      ),
    },
  ], [values, createdClubId, createErrors, createError, lockedAfter, create.isPending, t]);

  return (
    <FunnelEditorModal
      open={open}
      onClose={handleClose}
      eyebrow={t(CLUBS.funnelEyebrowCreate)}
      title={t(CLUBS.funnelTitleCreate)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => {
        const found = tabs.find((tab) => tab.id === id);
        if (!found || found.disabled) return;
        setActiveTab(id);
      }}
      status={status}
      statusMessage={statusMessage}
    />
  );
}

function LockedHint({ t }) {
  return (
    <p
      className="text-[12.5px] px-3 py-2 rounded-[4px]"
      style={{ color: MUTED, background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
    >
      {t(CLUBS.funnelTabLockedHint)}
    </p>
  );
}
