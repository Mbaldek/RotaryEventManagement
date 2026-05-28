// ClubEditView — vue plein-cockpit pour éditer un club existant (Master Cockpit V2.5+).
//
// Activée par MasterCockpit quand `?subview=edit-club&id={clubId}` est présent
// dans l'URL. Pas de modale : c'est la vue normale du cockpit qui prend toute
// la place. Le master_admin clique "← Clubs" pour revenir à la liste.
//
// 5 onglets :
//   1. Informations  — name / country / language (autosave 600 ms)
//   2. Représentant  — contactFirstName / contactLastName / contactEmail / contactPhone
//   3. Président     — presidentFirstName / presidentLastName / presidentEmail
//   4. Coordonnées   — clubEmail / clubPhone / clubAddress
//   5. Membres       — section MembersSection extraite de ClubEditor.jsx (inchangée),
//                     CRUD club_memberships + bouton "Inviter" wiré V2.5.
//
// Pas de delete pour un club (V2.5 — pas exposé UI). Les 4 premiers tabs réutilisent
// les composants partagés clubTabs/* (DRY avec ClubFunnel).

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  CREAM, CREAM2, NAVY, GOLD, INK, MUTED, SERIF,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, CLUBS } from './i18n';
import { useAllClubs } from './useMaster';
import useAutosaveClub from '../funnel/useAutosaveClub';
import { StatusIndicator } from '../funnel/FunnelEditorModal';
import InfoTab from './clubTabs/InfoTab';
import ContactTab from './clubTabs/ContactTab';
import PresidentTab from './clubTabs/PresidentTab';
import AddressTab from './clubTabs/AddressTab';
import { clubRowToForm } from './ClubForm';

// On réimporte volontairement MembersSection de ClubEditor — chemin "interne"
// par destructuring sur le default ne marche pas, on duplique donc juste la
// surface { membership CRUD + invite } depuis ClubEditor. La duplication est
// faible (~80 lignes) et garde ClubEditor.jsx intact pour la transition V2.5.
import MembersPanel from './clubTabs/MembersPanel';

const TAB_IDS = ['info', 'contact', 'president', 'address', 'members'];

function formatTitle(template, name) {
  return String(template || '').replace('{name}', name || '');
}

export default function ClubEditView({ clubId, onClose }) {
  const { t } = useLang();
  // On lit la liste clubs (cached) plutôt qu'un fetch dédié — listAll est
  // partagé avec ClubsTab. Une fois la query peuplée, on a la row complète.
  const list = useAllClubs();
  const club = useMemo(
    () => (list.data || []).find((c) => c.id === clubId) || null,
    [list.data, clubId],
  );

  const initialValues = useMemo(
    () => (club ? clubRowToForm(club) : {}),
    [club],
  );

  const auto = useAutosaveClub({
    clubId,
    initialValues,
    debounceMs: 600,
  });

  // Re-sync les valeurs locales quand la query "clubs" termine ou quand l'ID change.
  // (useAutosaveClub gère déjà setValues sur clubId change, mais initialValues
  //  arrive plus tard quand la query résoud — on push à ce moment-là.)
  // Intentionnel : on ne dépend pas de `auto`/`initialValues` pour éviter une
  // boucle de resync à chaque tick d'autosave.
  useEffect(() => {
    if (club && initialValues && Object.keys(initialValues).length > 0) {
      auto.setValues((prev) => ({ ...initialValues, ...prev }));
    }
  }, [club?.id, club?.updated_at]);

  const [activeTab, setActiveTab] = useState('info');

  if (!clubId) return null;

  if (list.isLoading && !club) {
    return (
      <div className="py-10 flex items-center justify-center" style={{ color: MUTED }}>
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-[13px]">{t(UI.loading)}</span>
      </div>
    );
  }

  if (list.isError) {
    return (
      <div className="py-6 text-[12.5px]" style={{ color: DANGER }}>
        {t(UI.loadError)}
      </div>
    );
  }

  if (!club) {
    return (
      <div
        className="rounded-[4px] p-5 mt-2"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      >
        <p className="text-[13px]" style={{ color: INK }}>
          {t({
            fr: 'Club introuvable.',
            en: 'Club not found.',
            de: 'Club nicht gefunden.',
          })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t(CLUBS.backToClubs)}
        </button>
      </div>
    );
  }

  const statusMessage = (() => {
    if (auto.status === 'saving') return t(CLUBS.statusSaving);
    if (auto.status === 'saved') return t(CLUBS.statusSaved);
    if (auto.status === 'error') return auto.statusMessage || t(CLUBS.statusError);
    return '';
  })();

  return (
    <section className="mb-8">
      {/* Header : breadcrumb + eyebrow + titre + status */}
      <header className="mb-5">
        <button
          type="button"
          onClick={async () => {
            try { await auto.flush(); } catch { /* swallow */ }
            onClose?.();
          }}
          className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] mb-3"
          style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t(CLUBS.backToClubs)}
        </button>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p
              className="uppercase tracking-[0.18em] text-[10.5px] font-medium mb-1"
              style={{ color: GOLD }}
            >
              {t(CLUBS.editViewEyebrow)}
            </p>
            <h2
              className="text-[24px] md:text-[28px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 400 }}
            >
              {formatTitle(t(CLUBS.editViewTitle), club.name)}
            </h2>
            <p className="text-[11.5px] mt-1 font-mono" style={{ color: MUTED }}>
              {club.id}
            </p>
          </div>

          <div className="shrink-0">
            <StatusIndicator status={auto.status} statusMessage={statusMessage} />
          </div>
        </div>
      </header>

      {/* Tab row pills */}
      <div
        className="rounded-[4px] px-3 py-2 mb-5 flex flex-wrap items-center gap-1.5"
        style={{ background: CREAM, border: `1px solid ${CREAM2}` }}
        role="tablist"
      >
        {TAB_IDS.map((id) => {
          const labels = {
            info:      t(CLUBS.tabInfo),
            contact:   t(CLUBS.tabContact),
            president: t(CLUBS.tabPresident),
            address:   t(CLUBS.tabAddress),
            members:   t(CLUBS.tabMembers),
          };
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              role="tab"
              aria-selected={active}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{
                background: active ? NAVY : 'white',
                color: active ? 'white' : INK,
                border: `1px solid ${active ? NAVY : CREAM2}`,
              }}
            >
              {labels[id]}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div
        className="rounded-[4px] p-5"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        role="tabpanel"
      >
        {activeTab === 'info' && (
          <InfoTab
            values={auto.values}
            onChange={auto.patch}
            mode="edit"
            clubId={club.id}
          />
        )}
        {activeTab === 'contact' && (
          <ContactTab
            values={auto.values}
            onChange={auto.patch}
          />
        )}
        {activeTab === 'president' && (
          <PresidentTab
            values={auto.values}
            onChange={auto.patch}
          />
        )}
        {activeTab === 'address' && (
          <AddressTab
            values={auto.values}
            onChange={auto.patch}
          />
        )}
        {activeTab === 'members' && (
          <MembersPanel club={club} />
        )}
      </div>
    </section>
  );
}
