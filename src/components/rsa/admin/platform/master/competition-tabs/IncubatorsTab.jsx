import React, { useMemo, useState } from 'react';
import { useLang } from '@/lib/platform/i18n';
import { SectionNote } from './fields';
import IncubatorEditModal from './IncubatorEditModal';
import {
  useAllIncubators,
  useEditionIncubators,
  useSetEditionIncubators,
  useDeleteIncubator,
} from '@/components/rsa/hooks/useIncubators';

export default function IncubatorsTab({ competition, mode = 'edit' }) {
  const { t } = useLang();
  const editionId = competition?.id;

  // ALL hooks must be called unconditionally before any early return.
  const { data: all = [] } = useAllIncubators();
  const { data: optedRaw = [] } = useEditionIncubators(editionId);
  const setOptIn = useSetEditionIncubators(editionId);
  const del = useDeleteIncubator();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const ordered = useMemo(() => {
    const optedIds = optedRaw.map((o) => o.id);
    const optedSet = new Set(optedIds);
    const rest = all.filter((i) => !optedSet.has(i.id));
    return { optedIds, optedSet, rest };
  }, [all, optedRaw]);

  const allById = useMemo(
    () => Object.fromEntries(all.map((i) => [i.id, i])),
    [all],
  );

  // Early return AFTER all hooks.
  if (mode === 'create' || !editionId) {
    return (
      <SectionNote>
        {t({
          fr: 'Disponible après la création de la compétition.',
          en: 'Available after the competition is created.',
          de: 'Nach Erstellung des Wettbewerbs verfügbar.',
        })}
      </SectionNote>
    );
  }

  const persist = (ids) => setOptIn.mutate(ids);

  const toggle = (id, checked) => {
    const ids = ordered.optedIds.slice();
    if (checked && !ids.includes(id)) ids.push(id);
    if (!checked) {
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1);
    }
    persist(ids);
  };

  const move = (id, dir) => {
    const ids = ordered.optedIds.slice();
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    persist(ids);
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
            {t({
              fr: 'Liste proposée au candidat',
              en: 'List shown to applicants',
              de: 'Den Bewerbern angezeigte Liste',
            })}
          </h3>
          <button
            type="button"
            className="rounded-lg border border-[#0a1f44] px-3 py-1.5 text-sm text-[#0a1f44]"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + {t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' })}
          </button>
        </div>

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
            {ordered.optedIds.map((id, idx) => {
              const inc = allById[id];
              if (!inc) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-xl border border-[#e7e1d6] bg-white px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggle(id, false)}
                    aria-label={`opt-out ${inc.name}`}
                  />
                  <span className="flex-1 text-sm">
                    {inc.name}{' '}
                    {inc.country ? (
                      <em className="text-xs text-[#7a7367]">· {inc.country}</em>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="px-1 text-[#7a7367] disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => move(id, -1)}
                    aria-label="up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1 text-[#7a7367] disabled:opacity-30"
                    disabled={idx === ordered.optedIds.length - 1}
                    onClick={() => move(id, 1)}
                    aria-label="down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="px-1 text-xs text-[#7a7367]"
                    onClick={() => {
                      setEditing(inc);
                      setModalOpen(true);
                    }}
                    aria-label={`edit ${inc.name}`}
                  >
                    ✎
                  </button>
                </li>
              );
            })}
            {ordered.rest.map((inc) => (
              <li
                key={inc.id}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 opacity-70"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggle(inc.id, true)}
                  aria-label={`opt-in ${inc.name}`}
                />
                <span className="flex-1 text-sm">
                  {inc.name}{' '}
                  {inc.country ? (
                    <em className="text-xs text-[#7a7367]">· {inc.country}</em>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="px-1 text-xs text-[#7a7367]"
                  onClick={() => {
                    setEditing(inc);
                    setModalOpen(true);
                  }}
                  aria-label={`edit ${inc.name}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="px-1 text-xs text-red-700"
                  aria-label={`delete ${inc.name}`}
                  onClick={() => {
                    if (
                      confirm(
                        t({
                          fr: 'Supprimer cet incubateur de la base globale ?',
                          en: 'Delete this incubator from the global base?',
                          de: 'Diesen Inkubator löschen?',
                        }),
                      )
                    ) {
                      del.mutate(inc.id);
                    }
                  }}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <IncubatorEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        incubator={editing}
      />
    </div>
  );
}
