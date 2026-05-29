// RolesManager — gestion app_user_roles (Module 4a, SETUP).
//
// * Liste : lit via rsa_list_app_user_roles (RPC admin-only).
// * Provisionnement : form (email, multi-checkbox roles) → rsa_assign_role.
// * Inline edit : on relit la même row, on toggle les rôles, on resoumet (UPSERT).
// * Last-admin protection : côté serveur (l'erreur P0001 'last_admin_protection' est
//   propagée et affichée à l'admin).

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { CREAM2, NAVY, MUTED, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, SETUP, ROLE_OPTIONS } from './i18n';
import { useAssignRole, useRolesAdmin } from './useAdmin';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

function RoleCheckboxes({ value, onChange, idPrefix }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {ROLE_OPTIONS.map((role) => (
        <label key={role} htmlFor={`${idPrefix}-${role}`} className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: NAVY }}>
          <input
            id={`${idPrefix}-${role}`}
            type="checkbox"
            checked={value.includes(role)}
            onChange={(e) => {
              if (e.target.checked) onChange([...new Set([...value, role])]);
              else onChange(value.filter((r) => r !== role));
            }}
          />
          {role}
        </label>
      ))}
    </div>
  );
}

function InlineRoleEditor({ row, onSubmit, busy }) {
  const { t } = useLang();
  const [roles, setRoles] = useState(row.roles || []);
  const [error, setError] = useState(null);

  async function onSave() {
    setError(null);
    try {
      await onSubmit({ email: row.email, roles });
    } catch (err) {
      if (err?.code === 'P0001' || /last_admin_protection/.test(err?.message || '')) {
        setError(t(SETUP.lastAdmin));
      } else {
        setError(err?.message || 'Error');
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <RoleCheckboxes value={roles} onChange={setRoles} idPrefix={`row-${row.email}`} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[4px] font-medium disabled:opacity-50"
          style={{ background: NAVY, color: 'white' }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {t(UI.save)}
        </button>
        {error && (
          <span className="text-[11.5px]" style={{ color: DANGER }}>{error}</span>
        )}
      </div>
    </div>
  );
}

export default function RolesManager() {
  const { t } = useLang();
  const rolesQ  = useRolesAdmin();
  const assign  = useAssignRole();

  const [newEmail, setNewEmail] = useState('');
  const [newRoles, setNewRoles] = useState([]);
  const [createError, setCreateError] = useState(null);

  const rows = useMemo(
    () => (rolesQ.data || []).slice().sort((a, b) => (a.email || '').localeCompare(b.email || '')),
    [rolesQ.data],
  );

  async function onAssignNew() {
    setCreateError(null);
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setCreateError('email requis');
      return;
    }
    try {
      await assign.mutateAsync({ email, roles: newRoles });
      setNewEmail('');
      setNewRoles([]);
    } catch (err) {
      if (err?.code === 'P0001' || /last_admin_protection/.test(err?.message || '')) {
        setCreateError(t(SETUP.lastAdmin));
      } else {
        setCreateError(err?.message || 'Error');
      }
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(SETUP.sectionRoles)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {rows.length}</span>
      </header>

      {/* Provisionnement nouveau email */}
      <div
        className="rounded-[4px] p-4 mb-5"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
      >
        <h4 className="text-[13px] font-medium mb-3" style={{ color: NAVY }}>
          {t(SETUP.assignRole)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="new-role-email">{t(UI.email)}</FieldLabel>
            <input
              id="new-role-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t(SETUP.emailPlaceholder)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            />
          </div>
          <div>
            <FieldLabel>{t(UI.roles)}</FieldLabel>
            <RoleCheckboxes value={newRoles} onChange={setNewRoles} idPrefix="new-role" />
          </div>
        </div>

        <p className="text-[11.5px] mt-2" style={{ color: MUTED }}>{t(SETUP.rolesHint)}</p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onAssignNew}
            disabled={assign.isPending || !newEmail.trim()}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t(UI.add)}
          </button>
          {createError && (
            <span className="text-[12px]" style={{ color: DANGER }}>{createError}</span>
          )}
        </div>
      </div>

      {/* Liste existante */}
      {rolesQ.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {rolesQ.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(UI.loadError)}</p>
      )}

      {!rolesQ.isLoading && !rolesQ.isError && rows.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(SETUP.noRoles)}</p>
      )}

      {!rolesQ.isLoading && rows.length > 0 && (
        <ul className="divide-y" style={{ borderColor: CREAM2 }}>
          {rows.map((row) => (
            <li key={row.email} className="py-3 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-[13px] font-medium" style={{ color: NAVY }}>{row.email}</p>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                  {row.granted_at && (<>{t(SETUP.grantedAt)} {String(row.granted_at).slice(0, 10)}</>)}
                  {row.granted_by && (
                    <> · <span style={{ color: GOLD }}>{t(SETUP.grantedBy)} {row.granted_by.slice(0, 8)}</span></>
                  )}
                </p>
              </div>
              <InlineRoleEditor
                row={row}
                busy={assign.isPending}
                onSubmit={(vars) => assign.mutateAsync(vars)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
