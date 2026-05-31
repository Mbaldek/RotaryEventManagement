// SessionsManager — gestion des sessions d'une édition (Module 4a, SETUP).
//
// * Liste des sessions ordonnées par position + StatusPill (kind=jury) sur le lifecycle.
// * Bouton « Créer une session » : ouvre un mini-form inline (id, name, theme, kind,
//   session_date, position, notes) qui appelle rsa_create_session (RPC SECURITY DEFINER).
// * Bouton « Réinitialiser » par session : confirm typé "RESET" + appel
//   rsa_reset_session_template (refuse si la session est sortie de 'draft' ou si jurés
//   assignés ou startups affectées).
//
// Pas d'édition des champs de session ici (le SQL n'expose pas encore d'RPC d'update
// — sortie de scope M4a, l'admin réinit + recrée si besoin pendant qu'une session est
// encore 'draft').

import React, { useState } from 'react';
import { Loader2, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { CREAM2, NAVY, MUTED, INK, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { StatusPill } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI, SETUP, SESSION_KINDS } from './i18n';
import { useCreateSession, useResetSessionTemplate } from './useAdmin';
// V3 — Composition jury par session (équipe jurys par session). N'est rendu que
// sur le scope club (clubId fourni) : depuis le Master Cockpit ou la finale,
// la gestion du jury passe par d'autres écrans.
import SessionJurorsList from './club/jury/SessionJurorsList';
import SessionConsole from './session-console/SessionConsole';

const EMPTY_PAYLOAD = {
  id: '',
  name: '',
  theme: '',
  kind: 'qualifying',
  session_date: '',
  position: 0,
  notes: '',
  teams_link: '',
  // club_id : prérempli depuis la prop clubId ci-dessous quand fournie ; resté '' sinon
  // (Master Cockpit pour finale : laissé vide -> club_id NULL côté DB).
  club_id: '',
};

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

function ResetButton({ sessionId, sessionName, onReset }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    if (typed !== 'RESET') {
      setError(t(SETUP.resetTypePrompt));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReset(sessionId);
      setOpen(false);
      setTyped('');
    } catch (err) {
      setError(err?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ color: DANGER, border: `1px solid ${CREAM2}` }}
        title={t(SETUP.resetSessionTitle)}
      >
        <RotateCcw className="w-3 h-3" /> {t(SETUP.resetSession)}
      </button>
    );
  }

  return (
    <div
      className="rounded-[4px] p-3 mt-2"
      style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: DANGER }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px]" style={{ color: NAVY }}>
            <strong>{t(SETUP.resetSessionTitle)} — {sessionName}.</strong>
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>{t(SETUP.resetSessionBody)}</p>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t(SETUP.resetTypePrompt)}
              className="flex-1 text-[12.5px] rounded-[4px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            <button
              type="button"
              onClick={onConfirm}
              disabled={typed !== 'RESET' || busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: DANGER, color: 'white' }}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t(SETUP.resetSession)}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setTyped(''); setError(null); }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(UI.cancel)}
            </button>
          </div>
          {error && (
            <p className="text-[12px] mt-2" style={{ color: DANGER }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionsManager({
  editionId,
  sessions,
  isLoading,
  onSelectSession,
  // V2 multi-club : si fourni, la liste est filtrée par club_id et la création
  // injecte automatiquement ce club_id dans le payload (verrouillé dans le form).
  clubId = null,
  // Mode conjoint (compétition session_model='joint') : sessions sans club
  // (club_id NULL), un flux unique au niveau compétition. Masque le picker club
  // et ne liste que les sessions club_id NULL (hors finale fédérée).
  jointMode = false,
}) {
  const { t } = useLang();
  const createSession = useCreateSession();
  const resetSession  = useResetSessionTemplate();

  const [showForm, setShowForm] = useState(false);
  const [payload, setPayload] = useState(() => ({ ...EMPTY_PAYLOAD, club_id: clubId || '' }));
  const [createError, setCreateError] = useState(null);
  // Session Admin Console — id de session ouverte en console plein-panneau (null = liste).
  const [consoleSessionId, setConsoleSessionId] = useState(null);

  // Si on change de club_id (navigation entre Club Cockpits), reset les défauts.
  React.useEffect(() => {
    setPayload((p) => ({ ...p, club_id: clubId || '' }));
  }, [clubId]);

  // Filtrage club-scoped : Club Cockpit ne montre QUE les sessions de son club.
  // Master Cockpit (clubId=null) montre tout. AdminShell legacy idem.
  const visibleSessions = React.useMemo(() => {
    if (clubId) return (sessions || []).filter((s) => s.club_id === clubId);
    // Mode conjoint : uniquement les sessions sans club (hors finale fédérée).
    if (jointMode) return (sessions || []).filter((s) => !s.club_id && s.kind !== 'finale');
    return sessions || [];
  }, [sessions, clubId, jointMode]);

  async function onCreate() {
    setCreateError(null);
    if (!editionId) return;
    const id = payload.id?.trim();
    const name = payload.name?.trim();
    if (!id || !name) {
      setCreateError('id + name requis');
      return;
    }
    try {
      await createSession.mutateAsync({
        editionId,
        payload: {
          id,
          name,
          theme: payload.theme?.trim() || null,
          kind: payload.kind,
          session_date: payload.session_date || null,
          position: Number(payload.position) || 0,
          notes: payload.notes?.trim() || null,
          // V2 multi-club : passe teams_link (session_config) + club_id (sessions).
          // Le RPC rsa_create_session normalise vides → NULL côté SQL.
          teams_link: payload.teams_link?.trim() || null,
          club_id: (clubId || payload.club_id?.trim() || null),
        },
      });
      setShowForm(false);
      setPayload({ ...EMPTY_PAYLOAD, club_id: clubId || '' });
    } catch (err) {
      setCreateError(err?.message || 'Error');
    }
  }

  // Console plein-panneau : remplace la liste tant qu'une session est ouverte.
  const consoleSession = visibleSessions.find((s) => s.id === consoleSessionId) || null;
  if (consoleSession) {
    return (
      <SessionConsole
        session={consoleSession}
        editionId={editionId}
        clubId={clubId}
        sessions={visibleSessions}
        onSelectSession={onSelectSession}
        onClose={() => setConsoleSessionId(null)}
      />
    );
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(SETUP.sectionSessions)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>·</span>
        <span className="text-[12px]" style={{ color: INK }}>
          {visibleSessions.length} session(s)
        </span>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(SETUP.createSession)}
        </button>
      </header>

      {showForm && (
        <div
          className="rounded-[4px] p-4 mb-4"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="new-id">{t(SETUP.newSessionId)}</FieldLabel>
              <input
                id="new-id"
                type="text"
                value={payload.id}
                onChange={(e) => setPayload((p) => ({ ...p, id: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-name">{t(SETUP.newSessionName)}</FieldLabel>
              <input
                id="new-name"
                type="text"
                value={payload.name}
                onChange={(e) => setPayload((p) => ({ ...p, name: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-theme">{t(SETUP.newSessionTheme)}</FieldLabel>
              <input
                id="new-theme"
                type="text"
                value={payload.theme}
                onChange={(e) => setPayload((p) => ({ ...p, theme: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-kind">{t(SETUP.newSessionKind)}</FieldLabel>
              <select
                id="new-kind"
                value={payload.kind}
                onChange={(e) => setPayload((p) => ({ ...p, kind: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              >
                {SESSION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'qualifying' ? t(SETUP.kindQualifying) : t(SETUP.kindFinale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="new-date">{t(SETUP.newSessionDate)}</FieldLabel>
              <input
                id="new-date"
                type="date"
                value={payload.session_date}
                onChange={(e) => setPayload((p) => ({ ...p, session_date: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-pos">{t(SETUP.newSessionPos)}</FieldLabel>
              <input
                id="new-pos"
                type="number"
                value={payload.position}
                onChange={(e) => setPayload((p) => ({ ...p, position: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="new-teams">{t(SETUP.newSessionTeams)}</FieldLabel>
              <input
                id="new-teams"
                type="url"
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={payload.teams_link}
                onChange={(e) => setPayload((p) => ({ ...p, teams_link: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
              <p className="text-[11px] mt-1" style={{ color: MUTED }}>{t(SETUP.newSessionTeamsHint)}</p>
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="new-notes">{t(SETUP.newSessionNotes)}</FieldLabel>
              <textarea
                id="new-notes"
                rows={2}
                value={payload.notes}
                onChange={(e) => setPayload((p) => ({ ...p, notes: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            {/* Club picker (visible uniquement quand on N'est PAS dans un Club Cockpit).
                Dans le Club Cockpit, le club_id est verrouillé via la prop clubId. */}
            {!clubId && !jointMode && (
              <div className="md:col-span-2">
                <FieldLabel htmlFor="new-club">{t(SETUP.newSessionClub)}</FieldLabel>
                <input
                  id="new-club"
                  type="text"
                  placeholder={t(SETUP.newSessionClubHint)}
                  value={payload.club_id}
                  onChange={(e) => setPayload((p) => ({ ...p, club_id: e.target.value }))}
                  className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                  style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
                />
              </div>
            )}
            {clubId && (
              <div className="md:col-span-2">
                <FieldLabel>{t(SETUP.newSessionClub)}</FieldLabel>
                <p className="text-[12.5px] px-2.5 py-1.5 rounded-[4px]" style={{
                  background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: NAVY,
                }}>
                  {clubId}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onCreate}
              disabled={createSession.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t(UI.create)}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setPayload({ ...EMPTY_PAYLOAD, club_id: clubId || '' }); setCreateError(null); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(UI.cancel)}
            </button>
            {createError && (
              <span className="text-[12px]" style={{ color: DANGER }}>{createError}</span>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!isLoading && visibleSessions.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(SETUP.noSessions)}</p>
      )}

      {!isLoading && visibleSessions.length > 0 && (
        <ul className="divide-y" style={{ borderColor: CREAM2 }}>
          {visibleSessions.map((s) => {
            const status = s.config?.status || 'draft';
            return (
              <li key={s.id} className="py-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] tabular-nums"
                    style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
                  >
                    {s.position ?? 0}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium" style={{ color: NAVY }}>{s.name}</span>
                      <StatusPill status={status} kind="jury" />
                      <span className="text-[11.5px]" style={{ color: MUTED }}>· {s.kind}</span>
                      {s.session_date && (
                        <span className="text-[11.5px]" style={{ color: MUTED }}>· {s.session_date}</span>
                      )}
                    </div>
                    {s.theme && (
                      <p className="text-[12px] mt-0.5" style={{ color: INK }}>{s.theme}</p>
                    )}
                    <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>
                      {s.id}
                      {s.club_id && (<span> · {s.club_id}</span>)}
                    </p>
                    {s.config?.teams_link && (
                      <a
                        href={s.config.teams_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[11.5px] underline decoration-1 underline-offset-2 break-all"
                        style={{ color: NAVY }}
                      >
                        {t(SETUP.teamsLinkOpen)}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConsoleSessionId(s.id)}
                      className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px] font-medium"
                      style={{ color: NAVY, background: 'white', border: `1px solid ${CREAM2}` }}
                    >
                      Ouvrir la console →
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectSession?.(s.id)}
                      className="text-[11px] underline decoration-1 underline-offset-2"
                      style={{ color: MUTED }}
                    >
                      LIVE →
                    </button>
                  </div>
                </div>
                {/* Composition jury — uniquement scope club (clubId fourni).
                    Pour le Master Cockpit (finale), la gestion du jury passe
                    par un autre écran (out-of-scope ici). */}
                {clubId && (
                  <SessionJurorsList sessionId={s.id} clubId={clubId} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
