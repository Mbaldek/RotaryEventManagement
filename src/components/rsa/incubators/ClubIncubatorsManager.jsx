// ClubIncubatorsManager — éditeur d'opt-in incubateurs + contact relais, scopé
// (compétition, club). Réutilisé par :
//   * l'onglet compétition « Incubateurs » en MONOCLUB (club unique résolu),
//   * l'onglet « Incubateurs » du Cockpit Club en MULTI-CLUB (club courant).
//
// Modèle : club_incubators (cf. 20260608_rsa_club_incubators.sql). L'opt-in ET le
// contact (personne + email à qui envoyer le kit) vivent sur la ligne club×incubateur.
// La base globale (nom/pays/langue/site) reste gérée via IncubatorEditModal :
//   - création autorisée à tout staff (RLS incubators_insert),
//   - édition/suppression réservées au master (canEditBase).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '@/lib/platform/i18n';
import {
  useAllIncubators,
  useClubIncubators,
  useSetClubIncubators,
  useDeleteIncubator,
} from '@/components/rsa/hooks/useIncubators';
import IncubatorEditModal from '@/components/rsa/admin/platform/master/competition-tabs/IncubatorEditModal';
import { SectionNote } from '@/components/rsa/admin/platform/master/competition-tabs/fields';

const NAVY = '#0a1f44';
const CREAM2 = '#e7e1d6';
const MUTED = '#7a7367';

function ContactInput({ id, type = 'text', placeholder, value, onChange }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
      style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
    />
  );
}

export default function ClubIncubatorsManager({
  editionId,
  clubId,
  canEditBase = true,
}) {
  const { t } = useLang();
  const { data: all = [] } = useAllIncubators();
  const { data: opted = [] } = useClubIncubators(editionId, clubId);
  const setClub = useSetClubIncubators(editionId, clubId);
  const del = useDeleteIncubator();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Liste éditable locale (opt-in ordonné + contact). Seed une fois par (édition, club).
  const [list, setList] = useState([]);
  const seedKey = `${editionId}::${clubId}`;
  const seededFor = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;
    setList(
      (opted || []).map((o) => ({
        id: o.id,
        name: o.name,
        country: o.country,
        contact_name: o.contact_name ?? '',
        contact_email: o.contact_email ?? '',
      })),
    );
  }, [seedKey, opted]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const optedIds = useMemo(() => new Set(list.map((r) => r.id)), [list]);
  const rest = useMemo(() => all.filter((i) => !optedIds.has(i.id)), [all, optedIds]);
  const allById = useMemo(() => Object.fromEntries(all.map((i) => [i.id, i])), [all]);

  const toPayload = (rows) =>
    rows.map((r) => ({
      incubator_id: r.id,
      contact_name: r.contact_name?.trim() || null,
      contact_email: r.contact_email?.trim() || null,
    }));

  const persistNow = (rows) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setClub.mutate(toPayload(rows));
  };
  const persistDebounced = (rows) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setClub.mutate(toPayload(rows)), 600);
  };

  const addIncubator = (inc) => {
    const next = [...list, { id: inc.id, name: inc.name, country: inc.country, contact_name: '', contact_email: '' }];
    setList(next);
    persistNow(next);
  };
  const removeIncubator = (id) => {
    const next = list.filter((r) => r.id !== id);
    setList(next);
    persistNow(next);
  };
  const move = (id, dir) => {
    const i = list.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    persistNow(next);
  };
  const editContact = (id, field, val) => {
    const next = list.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    setList(next);
    persistDebounced(next);
  };

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
          {t({ fr: 'Liste proposée au candidat', en: 'List shown to applicants', de: 'Den Bewerbern angezeigte Liste' })}
        </h3>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: NAVY, color: NAVY }}
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          + {t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' })}
        </button>
      </div>
      <p className="mb-3 text-[12px]" style={{ color: MUTED }}>
        {t({
          fr: 'Cochez les incubateurs à proposer, puis renseignez le contact relais (personne + email à qui envoyer le kit).',
          en: 'Tick the incubators to offer, then fill the relay contact (person + email to send the kit to).',
          de: 'Wählen Sie die Inkubatoren aus und tragen Sie den Relais-Kontakt ein (Person + E-Mail für den Versand des Kits).',
        })}
      </p>

      {all.length === 0 ? (
        <SectionNote>
          {t({
            fr: 'Aucun incubateur dans la base. Créez-en un.',
            en: 'No incubators yet. Create one.',
            de: 'Noch keine Inkubatoren. Erstellen Sie einen.',
          })}
        </SectionNote>
      ) : (
        <ul className="space-y-2">
          {list.map((r, idx) => (
            <li key={r.id} className="rounded-xl border bg-white" style={{ borderColor: CREAM2 }}>
              <div className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  checked
                  onChange={() => removeIncubator(r.id)}
                  aria-label={`opt-out ${r.name}`}
                />
                <span className="flex-1 text-sm">
                  {r.name}{' '}
                  {r.country ? <em className="text-xs" style={{ color: MUTED }}>· {r.country}</em> : null}
                </span>
                <button type="button" className="px-1 disabled:opacity-30" style={{ color: MUTED }}
                  disabled={idx === 0} onClick={() => move(r.id, -1)} aria-label="up">↑</button>
                <button type="button" className="px-1 disabled:opacity-30" style={{ color: MUTED }}
                  disabled={idx === list.length - 1} onClick={() => move(r.id, 1)} aria-label="down">↓</button>
                {canEditBase && (
                  <button type="button" className="px-1 text-xs" style={{ color: MUTED }}
                    onClick={() => { setEditing(allById[r.id]); setModalOpen(true); }} aria-label={`edit ${r.name}`}>✎</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 sm:grid-cols-2">
                <ContactInput
                  id={`inc-contact-name-${r.id}`}
                  placeholder={t({ fr: 'Contact — personne', en: 'Contact — person', de: 'Kontakt — Person' })}
                  value={r.contact_name}
                  onChange={(val) => editContact(r.id, 'contact_name', val)}
                />
                <ContactInput
                  id={`inc-contact-email-${r.id}`}
                  type="email"
                  placeholder={t({ fr: 'Contact — email', en: 'Contact — email', de: 'Kontakt — E-Mail' })}
                  value={r.contact_email}
                  onChange={(val) => editContact(r.id, 'contact_email', val)}
                />
              </div>
            </li>
          ))}

          {rest.map((inc) => (
            <li key={inc.id} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 opacity-70">
              <input
                type="checkbox"
                checked={false}
                onChange={() => addIncubator(inc)}
                aria-label={`opt-in ${inc.name}`}
              />
              <span className="flex-1 text-sm">
                {inc.name}{' '}
                {inc.country ? <em className="text-xs" style={{ color: MUTED }}>· {inc.country}</em> : null}
              </span>
              {canEditBase && (
                <>
                  <button type="button" className="px-1 text-xs" style={{ color: MUTED }}
                    onClick={() => { setEditing(inc); setModalOpen(true); }} aria-label={`edit ${inc.name}`}>✎</button>
                  <button type="button" className="px-1 text-xs text-red-700" aria-label={`delete ${inc.name}`}
                    onClick={() => {
                      if (confirm(t({
                        fr: 'Supprimer cet incubateur de la base globale ?',
                        en: 'Delete this incubator from the global base?',
                        de: 'Diesen Inkubator löschen?',
                      }))) del.mutate(inc.id);
                    }}>🗑</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <IncubatorEditModal open={modalOpen} onClose={() => setModalOpen(false)} incubator={editing} />
    </section>
  );
}
