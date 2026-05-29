// TemplatesLibrary — CRUD des templates emails (Module 9).
//
// - Liste les templates accessibles : globaux (master) + ceux du club scope
//   actuel (résolu serveur via rsa_list_email_templates).
// - Bouton "Insérer dans le composer" remonte au parent un draft initial pour
//   l'EmailComposer (subject + body + audience_type + lang).
// - Création/édition d'un template via un form inline (collapsible).
// - Suppression typée confirm.
//
// Convention M9 : le champ `body_html` stocke le MARKDOWN light brut tel qu'il
// est saisi dans le composer (la conversion en HTML bulletproof se fait à
// l'envoi). Permet l'édition simple — l'utilisateur ne devrait jamais avoir à
// éditer du <table> à la main.

import React, { useState } from 'react';
import { Loader2, Plus, Trash2, AlertTriangle, ChevronRight, X, FileText } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { COMMS_TEMPLATES, COMMS_UI, AUDIENCE_TYPES } from './i18n';
import { useEmailTemplates, useSaveTemplate, useDeleteTemplate } from './useComms';

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

function emptyForm() {
  return {
    id: null,
    name: '',
    subject: '',
    bodyHtml: '',
    audienceType: 'club_jurys',
    lang: 'fr',
  };
}

function TemplateRow({ tpl, clubId, onInsert, onEdit, onDelete }) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const isGlobal = tpl.club_id === null;

  return (
    <li
      className="rounded-[4px] p-3"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="text-[15px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {tpl.name}
            </h4>
            <span
              className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{
                background: isGlobal ? '#fdf6e8' : '#eff1f6',
                color: NAVY,
                border: `1px solid ${CREAM2}`,
              }}
            >
              {isGlobal ? t(COMMS_TEMPLATES.scopeGlobal) : t(COMMS_TEMPLATES.scopeClub)}
            </span>
            <span className="text-[11px]" style={{ color: MUTED }}>· {tpl.lang}</span>
          </div>
          <p className="text-[12.5px] mt-1" style={{ color: INK }}>{tpl.subject}</p>
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>
            {tpl.audience_type}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onInsert(tpl)}
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] font-medium"
            style={{ background: NAVY, color: 'white' }}
          >
            <ChevronRight className="w-3.5 h-3.5" /> {t(COMMS_UI.insert)}
          </button>
          {(isGlobal || tpl.club_id === clubId) && (
            <button
              type="button"
              onClick={() => onEdit(tpl)}
              className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px]"
              style={{ color: INK, border: `1px solid ${CREAM2}` }}
            >
              {t(COMMS_UI.edit)}
            </button>
          )}
          {(isGlobal || tpl.club_id === clubId) && (
            !confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px]"
                style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
              >
                <Trash2 className="w-3.5 h-3.5" /> {t(COMMS_UI.delete)}
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[11.5px]" style={{ color: DANGER }}>
                  {t(COMMS_TEMPLATES.confirmDelete)}
                </span>
                <button
                  type="button"
                  onClick={() => { onDelete(tpl.id); setConfirming(false); }}
                  className="inline-flex items-center text-[11.5px] px-2 py-1 rounded-[4px] font-medium"
                  style={{ background: DANGER, color: 'white' }}
                >
                  {t(COMMS_UI.delete)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-[11.5px] px-2 py-1 rounded-[4px]"
                  style={{ color: INK, border: `1px solid ${CREAM2}` }}
                >
                  {t(COMMS_UI.cancel)}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </li>
  );
}

export default function TemplatesLibrary({ clubId, onInsertTemplate }) {
  const { t } = useLang();
  const templatesQ = useEmailTemplates(clubId);
  const saveTemplate = useSaveTemplate(clubId);
  const deleteTemplate = useDeleteTemplate(clubId);

  const [editing, setEditing] = useState(null); // null = closed ; {} = creating ; {id, ...} = editing existing
  const [formError, setFormError] = useState(null);

  function startCreate() {
    setEditing(emptyForm());
    setFormError(null);
  }

  function startEdit(tpl) {
    setEditing({
      id: tpl.id,
      name: tpl.name,
      subject: tpl.subject,
      bodyHtml: tpl.body_html, // markdown stored as body_html
      audienceType: tpl.audience_type,
      lang: tpl.lang,
    });
    setFormError(null);
  }

  async function onSave() {
    if (!editing) return;
    setFormError(null);
    if (!editing.name.trim() || !editing.subject.trim() || !editing.bodyHtml.trim() || !editing.audienceType) {
      setFormError('name + subject + body + audience required');
      return;
    }
    try {
      await saveTemplate.mutateAsync({
        id: editing.id,
        name: editing.name,
        subject: editing.subject,
        bodyHtml: editing.bodyHtml,
        audienceType: editing.audienceType,
        lang: editing.lang,
      });
      setEditing(null);
    } catch (err) {
      setFormError(err?.message || String(err));
    }
  }

  async function onDelete(id) {
    try {
      await deleteTemplate.mutateAsync(id);
    } catch (err) {
      // affichage minimal — l'erreur RLS le plus probable est "non autorisé"
      // sur un template global qu'on n'a pas créé.
      console.error('[TemplatesLibrary] delete failed', err);
    }
  }

  function onInsert(tpl) {
    onInsertTemplate?.({
      subject: tpl.subject,
      body: tpl.body_html, // markdown
      audienceType: tpl.audience_type,
      audienceFilter: clubId ? { club_id: clubId } : {},
      lang: tpl.lang,
    });
  }

  const templates = templatesQ.data || [];

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMMS_TEMPLATES.sectionTitle)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {templates.length}</span>
        <button
          type="button"
          onClick={startCreate}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(COMMS_UI.newTemplate)}
        </button>
      </header>

      {editing && (
        <div
          className="rounded-[4px] p-4 space-y-3"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[14px] font-medium" style={{ color: NAVY }}>
              {editing.id ? t(COMMS_UI.edit) : t(COMMS_UI.newTemplate)}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              <X className="w-3.5 h-3.5" /> {t(COMMS_UI.close)}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="tpl-name">{t(COMMS_TEMPLATES.formName)}</FieldLabel>
              <input
                id="tpl-name"
                type="text"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="tpl-audience">{t(COMMS_TEMPLATES.formAudience)}</FieldLabel>
              <select
                id="tpl-audience"
                value={editing.audienceType}
                onChange={(e) => setEditing((p) => ({ ...p, audienceType: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                {AUDIENCE_TYPES.map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="tpl-lang">{t(COMMS_TEMPLATES.formLang)}</FieldLabel>
              <select
                id="tpl-lang"
                value={editing.lang}
                onChange={(e) => setEditing((p) => ({ ...p, lang: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="tpl-subject">{t(COMMS_TEMPLATES.formSubject)}</FieldLabel>
              <input
                id="tpl-subject"
                type="text"
                value={editing.subject}
                onChange={(e) => setEditing((p) => ({ ...p, subject: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="tpl-body">{t(COMMS_TEMPLATES.formBody)}</FieldLabel>
              <textarea
                id="tpl-body"
                value={editing.bodyHtml}
                onChange={(e) => setEditing((p) => ({ ...p, bodyHtml: e.target.value }))}
                rows={10}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] font-mono leading-relaxed"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: INK }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saveTemplate.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {saveTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t(COMMS_UI.save)}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(COMMS_UI.cancel)}
            </button>
            {formError && (
              <span className="text-[12px]" style={{ color: DANGER }}>
                <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />
                {formError}
              </span>
            )}
          </div>
        </div>
      )}

      {templatesQ.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {templatesQ.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(COMMS_UI.loadError)}</p>
      )}

      {!templatesQ.isLoading && !templatesQ.isError && templates.length === 0 && !editing && (
        <div
          className="rounded-[4px] p-6 text-center"
          style={{ background: TINT_ADMIN, border: `1px dashed ${CREAM2}` }}
        >
          <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: GOLD }} />
          <p className="text-[13px]" style={{ color: INK }}>
            {t(COMMS_TEMPLATES.noTemplates)}
          </p>
        </div>
      )}

      {!templatesQ.isLoading && templates.length > 0 && (
        <ul className="space-y-2">
          {templates.map((tpl) => (
            <TemplateRow
              key={tpl.id}
              tpl={tpl}
              clubId={clubId}
              onInsert={onInsert}
              onEdit={startEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

    </section>
  );
}
