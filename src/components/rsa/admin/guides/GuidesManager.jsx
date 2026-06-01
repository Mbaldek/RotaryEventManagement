// GuidesManager — CRUD des guides pour un espace + une portée (global/édition).
// Drag-reorder via @hello-pangea/dnd. Édition inline via GuideEditor.

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { NAVY, GOLD, MUTED, CREAM, CREAM2 } from '@/components/design/tokens';
import { useLang, pickLang } from '@/lib/platform/i18n';
import { GUIDE_SPACES, GUIDE_SPACE_LABEL } from '@/components/rsa/guides/i18n';
import { useGuidesAdmin, useGuideMutations } from '@/components/rsa/guides/useGuides';
import GuideEditor from './GuideEditor';

const emptyArticle = (space, editionId) => ({
  space,
  edition_id: editionId,
  title: {},
  body_md: {},
  is_published: false,
  sort_order: 0,
});

export default function GuidesManager({ editions = [] }) {
  const { t, lang } = useLang();
  const [space, setSpace] = useState('admin');
  const [editionId, setEditionId] = useState(null); // null = global
  const [editing, setEditing] = useState(null); // article en cours d'édition (ou null)

  const listQ = useGuidesAdmin(space, editionId);
  const { save, remove, reorder } = useGuideMutations(space, editionId);
  const rows = listQ.data || [];

  function onDragEnd(result) {
    if (!result.destination) return;
    const next = [...rows];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    reorder.mutate(next.map((r) => r.id));
  }

  async function handleSave() {
    await save.mutateAsync({ ...editing, space, edition_id: editionId });
    setEditing(null);
  }

  return (
    <div>
      {/* Pickers espace + portée */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={space}
          onChange={(e) => { setSpace(e.target.value); setEditing(null); }}
          className="text-[13px] rounded-[4px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          {GUIDE_SPACES.map((s) => (
            <option key={s} value={s}>{t(GUIDE_SPACE_LABEL[s])}</option>
          ))}
        </select>

        <select
          value={editionId ?? '__global__'}
          onChange={(e) => { const v = e.target.value; setEditionId(v === '__global__' ? null : v); setEditing(null); }}
          className="text-[13px] rounded-[4px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          <option value="__global__">{t({ fr: 'Portée : Global', en: 'Scope: Global', de: 'Geltung: Global' })}</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>{ed.name || ed.id}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setEditing(emptyArticle(space, editionId))}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {t({ fr: 'Nouvel article', en: 'New article', de: 'Neuer Artikel' })}
        </button>
      </div>

      {/* Éditeur (création ou édition) */}
      {editing && (
        <div className="mb-5">
          <GuideEditor
            value={editing}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={save.isPending}
          />
        </div>
      )}

      {/* Liste réordonnable */}
      {listQ.isLoading ? (
        <div className="text-[13px]" style={{ color: MUTED }}>{t({ fr: 'Chargement…', en: 'Loading…', de: 'Laden…' })}</div>
      ) : rows.length === 0 ? (
        <div className="text-[13px] italic" style={{ color: MUTED }}>
          {t({ fr: 'Aucun article pour cette portée.', en: 'No article for this scope.', de: 'Kein Artikel für diese Geltung.' })}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="guides-list">
            {(provided) => (
              <ul className="m-0 p-0 list-none" ref={provided.innerRef} {...provided.droppableProps}>
                {rows.map((r, idx) => (
                  <Draggable key={r.id} draggableId={r.id} index={idx}>
                    {(prov) => (
                      <li
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className="flex items-center gap-3 py-2.5 px-3 mb-1.5 rounded-[4px]"
                        style={{ background: CREAM, border: `1px solid ${CREAM2}`, ...prov.draggableProps.style }}
                      >
                        <span {...prov.dragHandleProps} className="cursor-grab" aria-label="Réordonner">
                          <GripVertical className="w-4 h-4" style={{ color: MUTED }} />
                        </span>
                        <span className="flex-1 min-w-0 truncate text-[13.5px]" style={{ color: NAVY }}>
                          {pickLang(r.title, lang) || '—'}
                        </span>
                        <span
                          className="text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                          style={{
                            background: r.is_published ? 'rgba(201,168,76,0.15)' : '#f1f1f4',
                            color: r.is_published ? '#9a6400' : MUTED,
                          }}
                        >
                          {r.is_published
                            ? t({ fr: 'Publié', en: 'Published', de: 'Veröffentlicht' })
                            : t({ fr: 'Brouillon', en: 'Draft', de: 'Entwurf' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="p-1.5 rounded-[4px] hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                          aria-label={t({ fr: 'Éditer', en: 'Edit', de: 'Bearbeiten' })}
                          style={{ color: NAVY }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (window.confirm(t({ fr: 'Supprimer cet article ?', en: 'Delete this article?', de: 'Diesen Artikel löschen?' }))) remove.mutate(r.id); }}
                          className="p-1.5 rounded-[4px] hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                          aria-label={t({ fr: 'Supprimer', en: 'Delete', de: 'Löschen' })}
                          style={{ color: '#b91c1c' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
