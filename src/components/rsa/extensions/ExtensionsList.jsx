// ExtensionsList — section "Extensions" autonome (V3.0).
//
// Intégrable dans :
//   * MasterCockpit (onglet Extensions) avec scope='master'
//   * ClubCockpit   (onglet Extensions) avec scope='club'  + clubId
//   * (V4 : édition cockpit avec scope='edition' + editionId)
//
// Props :
//   scope     : 'master' | 'club' | 'edition'
//   clubId    : string? (requis si scope='club' OR 'edition')
//   editionId : string? (requis si scope='edition')
//
// Layout : filter pills par kind + cards Élysée hairline, une par extension.
// Chaque card affiche name (serif) + badges kind/scope + toggle active +
// boutons Éditer / Supprimer.

import React, { useMemo, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import {
  NAVY, INK, MUTED, GOLD, CREAM2, SERIF,
  TINT_BEIGE, TINT_BLUE, TINT_SAGE,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  useExtensions,
  useCreateExtension,
  useUpdateExtension,
  useDeleteExtension,
  useActivateExtension,
} from './useExtensions';
import { EXT_UI, EXT_KIND_LABELS, EXT_SCOPE_LABELS } from './i18n';
import { EXTENSION_KINDS } from '@/lib/rsa/extensions';
import ExtensionForm from './ExtensionForm';

// ── Badges ─────────────────────────────────────────────────────────────────

function KindBadge({ kind }) {
  const { t } = useLang();
  const label = t(EXT_KIND_LABELS[kind] || { fr: kind, en: kind, de: kind });
  // Tints rotatives par kind pour distinguer visuellement
  const styleByKind = {
    funnel_step:    { bg: '#fdf6e8',  color: NAVY },
    cockpit_tab:    { bg: TINT_BLUE,  color: INK },
    email_template: { bg: TINT_SAGE,  color: NAVY },
    webhook:        { bg: TINT_BEIGE, color: INK },
  };
  const s = styleByKind[kind] || { bg: 'white', color: INK };
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${CREAM2}` }}
    >
      {label}
    </span>
  );
}

function ScopeBadge({ scope }) {
  const { t } = useLang();
  const label = t(EXT_SCOPE_LABELS[scope] || { fr: scope, en: scope, de: scope });
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{ background: 'white', color: MUTED, border: `1px solid ${CREAM2}` }}
    >
      {label}
    </span>
  );
}

function ActivePill({ active, onToggle, busy }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-50"
      style={{
        background: active ? '#fdf6e8' : 'white',
        color: active ? NAVY : MUTED,
        border: `1px solid ${active ? GOLD : CREAM2}`,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: active ? GOLD : MUTED }}
        aria-hidden
      />
      {active ? t(EXT_UI.active) : t(EXT_UI.inactive)}
    </button>
  );
}

// ── Confirm suppression inline ─────────────────────────────────────────────

function DeleteConfirm({ extension, onConfirm, onCancel, busy }) {
  const { t } = useLang();
  return (
    <div
      className="rounded-[4px] p-3 mt-2 w-full"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px]" style={{ color: NAVY }}>
            <strong>{t(EXT_UI.removeConfirmTitle)} — {extension.name}.</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {t(EXT_UI.removeConfirmBody)}
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t(EXT_UI.remove)}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              <X className="w-3 h-3" />
              {t(EXT_UI.cancel)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card extension ─────────────────────────────────────────────────────────

function ExtensionCard({
  extension,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  deleteForm,
  busyActivate,
}) {
  const { t } = useLang();
  return (
    <li
      className="group rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h4
            className="text-[17px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {extension.name}
          </h4>
          {extension.description && (
            <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: INK }}>
              {extension.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <KindBadge kind={extension.kind} />
            <ScopeBadge scope={extension.scope} />
            <ActivePill
              active={!!extension.active}
              onToggle={onToggleActive}
              busy={busyActivate}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            title={t(EXT_UI.edit)}
          >
            <Pencil className="w-3.5 h-3.5" />
            {t(EXT_UI.edit)}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: 'white' }}
            title={t(EXT_UI.remove)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t(EXT_UI.remove)}
          </button>
        </div>
      </div>

      {isDeleting && deleteForm}
    </li>
  );
}

// ── Filtre par kind (pills) ────────────────────────────────────────────────

function KindFilter({ value, onChange }) {
  const { t } = useLang();
  const pills = [
    { id: 'all', label: t(EXT_UI.filterAll) },
    ...EXTENSION_KINDS.map((k) => ({ id: k, label: t(EXT_KIND_LABELS[k]) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t(EXT_UI.filterByKind)}>
      {pills.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            role="tab"
            aria-selected={active}
            className="px-3 py-1 rounded-full text-[11.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors"
            style={{
              background: active ? NAVY : 'white',
              color: active ? 'white' : INK,
              border: `1px solid ${active ? NAVY : CREAM2}`,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function ExtensionsList({ scope, clubId = null, editionId = null }) {
  const { t } = useLang();

  // Query (toutes les extensions du scope ; filtre kind côté client)
  const queryArgs = useMemo(() => {
    if (scope === 'master')  return { scope: 'master' };
    if (scope === 'club')    return { scope: 'club',    clubId };
    if (scope === 'edition') return { scope: 'edition', editionId };
    return {};
  }, [scope, clubId, editionId]);

  const extensionsQ = useExtensions(queryArgs);
  const createMut   = useCreateExtension();
  const updateMut   = useUpdateExtension();
  const deleteMut   = useDeleteExtension();
  const activateMut = useActivateExtension();

  const [kindFilter, setKindFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editingExt, setEditingExt] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activatingId, setActivatingId] = useState(null);

  const extensions = extensionsQ.data || [];
  const filtered = useMemo(
    () => (kindFilter === 'all' ? extensions : extensions.filter((e) => e.kind === kindFilter)),
    [extensions, kindFilter],
  );

  const sectionTitle = useMemo(() => {
    if (scope === 'club')    return t(EXT_UI.sectionTitleClub);
    if (scope === 'edition') return t(EXT_UI.sectionTitleEdition);
    return t(EXT_UI.sectionTitleMaster);
  }, [scope, t]);

  const sectionHint = useMemo(() => {
    if (scope === 'club' || scope === 'edition') return t(EXT_UI.sectionHintClub);
    return t(EXT_UI.sectionHintMaster);
  }, [scope, t]);

  // Handlers
  async function handleCreate(payload) {
    await createMut.mutateAsync(payload);
  }
  async function handleUpdate(payload) {
    await updateMut.mutateAsync(payload);
  }
  async function handleDelete(id) {
    await deleteMut.mutateAsync(id);
    setDeletingId(null);
  }
  async function handleToggleActive(extension) {
    setActivatingId(extension.id);
    try {
      await activateMut.mutateAsync({ id: extension.id, active: !extension.active });
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {sectionTitle}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {extensions.length}</span>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditingExt(null); setDeletingId(null); }}
          disabled={creating}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          {t(EXT_UI.newExtension)}
        </button>
      </header>

      <p className="text-[12px] mb-4" style={{ color: MUTED }}>
        {sectionHint}
      </p>

      <div className="mb-4">
        <KindFilter value={kindFilter} onChange={setKindFilter} />
      </div>

      {extensionsQ.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!extensionsQ.isLoading && filtered.length === 0 && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(EXT_UI.empty)}</p>
      )}

      {!extensionsQ.isLoading && filtered.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-3">
          {filtered.map((ext) => (
            <ExtensionCard
              key={ext.id}
              extension={ext}
              onEdit={() => { setEditingExt(ext); setDeletingId(null); setCreating(false); }}
              onDelete={() => { setDeletingId(ext.id); setEditingExt(null); setCreating(false); }}
              onToggleActive={() => handleToggleActive(ext)}
              isDeleting={deletingId === ext.id}
              busyActivate={activatingId === ext.id && activateMut.isPending}
              deleteForm={(
                <DeleteConfirm
                  extension={ext}
                  onConfirm={() => handleDelete(ext.id)}
                  onCancel={() => setDeletingId(null)}
                  busy={deleteMut.isPending}
                />
              )}
            />
          ))}
        </ul>
      )}

      {/* Modale création */}
      {creating && (
        <ExtensionForm
          open={creating}
          onClose={() => setCreating(false)}
          scope={scope}
          clubId={clubId}
          editionId={editionId}
          initial={null}
          onSubmit={handleCreate}
        />
      )}

      {/* Modale édition */}
      {editingExt && (
        <ExtensionForm
          open={!!editingExt}
          onClose={() => setEditingExt(null)}
          scope={editingExt.scope}
          clubId={editingExt.club_id}
          editionId={editingExt.edition_id}
          initial={editingExt}
          onSubmit={handleUpdate}
        />
      )}
    </section>
  );
}
