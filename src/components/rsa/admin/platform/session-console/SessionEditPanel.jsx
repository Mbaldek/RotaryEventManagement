// SessionEditPanel — onglet « Vue / Édition » de la SessionConsole.
//
// Trois zones :
//   1. Paramètres : vue lecture, bascule « Modifier » → form (édition DRAFT-ONLY
//      via rsa_update_session). Gel + bandeau quand status <> 'draft'.
//   2. Cycle de vie : Passer LIVE / Repasser draft / Verrouiller / Publier.
//   3. Zone danger : suppression (3-step typed-confirm « SUPPRIMER » → rsa_delete_session),
//      disponible seulement en draft (sinon message d'indisponibilité).
//
// Blueprint : docs/blueprints/session-admin-console.md §5.1.

import React, { useMemo, useState } from 'react';
import { Loader2, Pencil, Trash2, AlertTriangle, Radio, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { CREAM2, NAVY, GOLD, MUTED, INK, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  useUpdateSession, useDeleteSession,
  useSetSessionLive, useSetSessionDraft, useLockSession, usePublishSession,
} from '../useAdmin';

const COPY = {
  params:       { fr: 'Paramètres', en: 'Settings', de: 'Parameter' },
  edit:         { fr: 'Modifier', en: 'Edit', de: 'Bearbeiten' },
  save:         { fr: 'Enregistrer', en: 'Save', de: 'Speichern' },
  cancel:       { fr: 'Annuler', en: 'Cancel', de: 'Abbrechen' },
  frozen:       {
    fr: 'Session LIVE — paramètres gelés. Repassez en draft pour éditer (impossible une fois des scores enregistrés).',
    en: 'Session LIVE — settings frozen. Switch back to draft to edit (impossible once scores exist).',
    de: 'Session LIVE — Parameter eingefroren. Zurück auf Entwurf, um zu bearbeiten (unmöglich sobald Bewertungen existieren).',
  },
  lifecycle:    { fr: 'Cycle de vie', en: 'Lifecycle', de: 'Lebenszyklus' },
  goLive:       { fr: 'Passer LIVE', en: 'Go LIVE', de: 'LIVE schalten' },
  backDraft:    { fr: 'Repasser draft', en: 'Back to draft', de: 'Zurück auf Entwurf' },
  lock:         { fr: 'Verrouiller', en: 'Lock', de: 'Sperren' },
  publish:      { fr: 'Publier les résultats', en: 'Publish results', de: 'Ergebnisse veröffentlichen' },
  fName:        { fr: 'Nom', en: 'Name', de: 'Name' },
  fTheme:       { fr: 'Thème', en: 'Theme', de: 'Thema' },
  fKind:        { fr: 'Type', en: 'Kind', de: 'Typ' },
  fDate:        { fr: 'Date', en: 'Date', de: 'Datum' },
  fStart:       { fr: 'Heure début', en: 'Start time', de: 'Startzeit' },
  fEnd:         { fr: 'Heure fin', en: 'End time', de: 'Endzeit' },
  fPos:         { fr: 'Position', en: 'Position', de: 'Position' },
  fTeams:       { fr: 'Lien Teams', en: 'Teams link', de: 'Teams-Link' },
  fNotes:       { fr: 'Notes', en: 'Notes', de: 'Notizen' },
  fClub:        { fr: 'Club', en: 'Club', de: 'Club' },
  immutable:    { fr: 'immuable', en: 'immutable', de: 'unveränderlich' },
  kindQual:     { fr: 'Qualificative', en: 'Qualifying', de: 'Qualifikation' },
  kindFinale:   { fr: 'Finale', en: 'Finale', de: 'Finale' },
  dangerTitle:  { fr: 'Zone danger — supprimer la session', en: 'Danger zone — delete session', de: 'Gefahrenzone — Session löschen' },
  dangerBody:   {
    fr: 'Possible tant que la session est en draft, sans juré assigné ni startup affectée.',
    en: 'Possible while the session is draft, with no jury assigned and no startup attached.',
    de: 'Möglich solange die Session Entwurf ist, ohne zugewiesene Jury und ohne Startup.',
  },
  dangerNA:     { fr: 'Suppression indisponible (session non-draft).', en: 'Deletion unavailable (non-draft session).', de: 'Löschen nicht verfügbar (kein Entwurf).' },
  deleteBtn:    { fr: 'Supprimer…', en: 'Delete…', de: 'Löschen…' },
  deleteGo:     { fr: 'Supprimer définitivement', en: 'Delete permanently', de: 'Endgültig löschen' },
  typePrompt:   { fr: 'Tapez SUPPRIMER', en: 'Type DELETE', de: 'DELETE eingeben' },
  typeWord:     { fr: 'SUPPRIMER', en: 'DELETE', de: 'DELETE' },
};

function FieldLabel({ children }) {
  return (
    <span className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5" style={{ color: MUTED }}>
      {children}
    </span>
  );
}

const inputCls = 'w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]';
const inputStyle = { background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY };

function KV({ label, children }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 py-2" style={{ borderBottom: `1px solid #f1ece3` }}>
      <span className="text-[11.5px] uppercase tracking-[0.06em] self-center" style={{ color: MUTED }}>{label}</span>
      <span className="text-[13px]" style={{ color: NAVY }}>{children}</span>
    </div>
  );
}

export default function SessionEditPanel({ session, onDeleted }) {
  const { t } = useLang();
  const status = session?.config?.status || 'draft';
  const isDraft = status === 'draft';

  const update = useUpdateSession();
  const del = useDeleteSession();
  const setLive = useSetSessionLive();
  const setDraft = useSetSessionDraft();
  const lock = useLockSession();
  const publish = usePublishSession();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  const [armed, setArmed] = useState(false);
  const [typed, setTyped] = useState('');
  const [delError, setDelError] = useState(null);

  const initial = useMemo(() => ({
    name: session?.name || '',
    theme: session?.theme || '',
    kind: session?.kind || 'qualifying',
    session_date: session?.session_date || '',
    position: session?.position ?? 0,
    start_time: session?.config?.start_time || '',
    end_time: session?.config?.end_time || '',
    teams_link: session?.config?.teams_link || '',
    notes: session?.config?.notes || '',
  }), [session]);

  function openEdit() {
    setForm({ ...initial });
    setError(null);
    setEditing(true);
  }

  async function onSave() {
    setError(null);
    const patch = {
      name: form.name?.trim(),
      theme: form.theme?.trim() || '',
      kind: form.kind,
      session_date: form.session_date || '',
      position: String(form.position ?? 0),
      start_time: form.start_time || '',
      end_time: form.end_time || '',
      teams_link: form.teams_link?.trim() || '',
      notes: form.notes?.trim() || '',
    };
    try {
      await update.mutateAsync({ sessionId: session.id, patch });
      setEditing(false);
    } catch (err) {
      setError(err?.message || 'Error');
    }
  }

  async function onConfirmDelete() {
    if (typed !== t(COPY.typeWord)) return;
    setDelError(null);
    try {
      await del.mutateAsync(session.id);
      onDeleted?.();
    } catch (err) {
      setDelError(err?.message || 'Error');
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      {/* Cycle de vie */}
      <div className="flex items-center gap-2.5 flex-wrap mb-5 pb-4" style={{ borderBottom: `1px solid ${CREAM2}` }}>
        <span className="text-[10.5px] uppercase tracking-[0.14em] mr-1" style={{ color: MUTED }}>{t(COPY.lifecycle)}</span>
        {isDraft && (
          <button
            type="button" onClick={() => setLive.mutate(session.id)} disabled={setLive.isPending}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] disabled:opacity-50"
            style={{ background: NAVY, color: 'white' }}
          >
            {setLive.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
            {t(COPY.goLive)}
          </button>
        )}
        {!isDraft && (
          <>
            <button type="button" onClick={() => setDraft.mutate(session.id)} disabled={setDraft.isPending}
              className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}>
              <RotateCcw className="w-3.5 h-3.5" /> {t(COPY.backDraft)}
            </button>
            <button type="button" onClick={() => lock.mutate(session.id)} disabled={lock.isPending}
              className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
              style={{ color: GOLD, border: `1px solid ${GOLD}`, background: 'white' }}>
              <Lock className="w-3.5 h-3.5" /> {t(COPY.lock)}
            </button>
            <button type="button" onClick={() => publish.mutate(session.id)} disabled={publish.isPending}
              className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
              style={{ color: GOLD, border: `1px solid ${GOLD}`, background: 'white' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {t(COPY.publish)}
            </button>
          </>
        )}
      </div>

      {/* Gel banner */}
      {!isDraft && (
        <div className="flex gap-2.5 items-start rounded-[5px] px-3.5 py-3 mb-5" style={{ background: '#fbf3e2', border: '1px solid #ecd9a8' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#9a6400' }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: INK }}>{t(COPY.frozen)}</p>
        </div>
      )}

      {/* Paramètres */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] uppercase tracking-[0.16em] font-semibold" style={{ color: '#8a6f1f' }}>{t(COPY.params)}</span>
        {isDraft && !editing && (
          <button type="button" onClick={openEdit}
            className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[4px]"
            style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}>
            <Pencil className="w-3.5 h-3.5" style={{ color: GOLD }} /> {t(COPY.edit)}
          </button>
        )}
      </div>

      {!editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-7">
          <div>
            <KV label={t(COPY.fName)}><span style={{ fontFamily: SERIF }}>{session.name}</span></KV>
            <KV label={t(COPY.fTheme)}>{session.theme || '—'}</KV>
            <KV label={t(COPY.fKind)}>{session.kind === 'finale' ? t(COPY.kindFinale) : t(COPY.kindQual)}</KV>
            <KV label={t(COPY.fClub)}>{session.club_id || '—'}</KV>
            <KV label={t(COPY.fNotes)}>{session.config?.notes || '—'}</KV>
          </div>
          <div>
            <KV label={t(COPY.fDate)}>{session.session_date || '—'}</KV>
            <KV label={`${t(COPY.fStart)} / ${t(COPY.fEnd)}`}>
              {(session.config?.start_time || '—')} → {(session.config?.end_time || '—')}
            </KV>
            <KV label={t(COPY.fPos)}>{session.position ?? 0}</KV>
            <KV label={t(COPY.fTeams)}>
              {session.config?.teams_link
                ? <a href={session.config.teams_link} target="_blank" rel="noreferrer noopener" className="underline break-all" style={{ color: NAVY }}>{session.config.teams_link}</a>
                : '—'}
            </KV>
            <KV label="ID"><span className="font-mono text-[11.5px]" style={{ color: MUTED }}>{session.id} · {t(COPY.immutable)}</span></KV>
          </div>
        </div>
      )}

      {editing && form && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <label><FieldLabel>{t(COPY.fName)}</FieldLabel><input className={inputCls} style={inputStyle} value={form.name} onChange={set('name')} /></label>
          <label><FieldLabel>{t(COPY.fTheme)}</FieldLabel><input className={inputCls} style={inputStyle} value={form.theme} onChange={set('theme')} /></label>
          <label><FieldLabel>{t(COPY.fKind)}</FieldLabel>
            <select className={inputCls} style={inputStyle} value={form.kind} onChange={set('kind')}>
              <option value="qualifying">{t(COPY.kindQual)}</option>
              <option value="finale">{t(COPY.kindFinale)}</option>
            </select>
          </label>
          <label><FieldLabel>{t(COPY.fDate)}</FieldLabel><input type="date" className={inputCls} style={inputStyle} value={form.session_date} onChange={set('session_date')} /></label>
          <label><FieldLabel>{t(COPY.fStart)}</FieldLabel><input type="time" className={inputCls} style={inputStyle} value={form.start_time} onChange={set('start_time')} /></label>
          <label><FieldLabel>{t(COPY.fEnd)}</FieldLabel><input type="time" className={inputCls} style={inputStyle} value={form.end_time} onChange={set('end_time')} /></label>
          <label><FieldLabel>{t(COPY.fPos)}</FieldLabel><input type="number" className={inputCls} style={inputStyle} value={form.position} onChange={set('position')} /></label>
          <label className="md:col-span-2"><FieldLabel>{t(COPY.fTeams)}</FieldLabel><input type="url" className={inputCls} style={inputStyle} value={form.teams_link} onChange={set('teams_link')} /></label>
          <label className="md:col-span-2"><FieldLabel>{t(COPY.fNotes)}</FieldLabel><textarea rows={2} className={inputCls} style={inputStyle} value={form.notes} onChange={set('notes')} /></label>

          <div className="md:col-span-2 flex items-center gap-3 mt-1 pt-3" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <button type="button" onClick={onSave} disabled={update.isPending || !form.name?.trim()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}>
              {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />} {t(COPY.save)}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-[4px] text-[12.5px]" style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}>
              {t(COPY.cancel)}
            </button>
            {error && <span className="text-[12px]" style={{ color: DANGER }}>{error}</span>}
          </div>
        </div>
      )}

      {/* Zone danger */}
      <div className="mt-6 rounded-[6px] px-4 py-3.5" style={{ background: TINT_DANGER, border: '1px solid #eccfc8' }}>
        <p className="text-[13px] font-medium mb-0.5" style={{ color: NAVY }}>{t(COPY.dangerTitle)}</p>
        {!isDraft && <p className="text-[12px]" style={{ color: DANGER }}>{t(COPY.dangerNA)}</p>}
        {isDraft && (
          <>
            <p className="text-[12px] mb-2.5" style={{ color: INK }}>{t(COPY.dangerBody)}</p>
            {!armed && (
              <button type="button" onClick={() => setArmed(true)}
                className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-[4px]"
                style={{ color: DANGER, border: `1px solid ${DANGER}`, background: 'white' }}>
                <Trash2 className="w-3.5 h-3.5" /> {t(COPY.deleteBtn)}
              </button>
            )}
            {armed && (
              <div className="flex items-center gap-2 flex-wrap">
                <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t(COPY.typePrompt)}
                  className="text-[12.5px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
                  style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY, width: 170 }} />
                <button type="button" onClick={onConfirmDelete} disabled={typed !== t(COPY.typeWord) || del.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
                  style={{ background: DANGER, color: 'white' }}>
                  {del.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {t(COPY.deleteGo)}
                </button>
                <button type="button" onClick={() => { setArmed(false); setTyped(''); setDelError(null); }}
                  className="px-3 py-1.5 rounded-[4px] text-[12.5px]" style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}>
                  {t(COPY.cancel)}
                </button>
                {delError && <span className="text-[12px]" style={{ color: DANGER }}>{delError}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
