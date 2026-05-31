// JuryProfileDrawer — fiche profil d'un juré (drawer latéral droit).
//
// Ouvert au clic "Détails" dans JuryAssignmentsAdmin (vue "Attribution des jurés").
// Design lift éditorial (mockup docs/design/mockups/jury-admin-views.html, section
// drawer) — AUCUN emoji : marqueur de session = pastille ronde via getSessionAccent.
//
// Pattern overlay + scroll-lock + ESC + restore-focus inspiré de
// concours-dashboard/SessionDetailDrawer.jsx, allégé (pas de framer-motion ici :
// le mockup utilise une transition CSS simple + le drawer reste monté).
//
// Props : { open, onClose, juryUserId, email, fullName, editionId, sessions, assignedSessionIds }
//   sessions           = toutes les sessions de l'édition (déjà chargées par le
//                        parent) — résolution noms + accents, évite un refetch.
//   assignedSessionIds = ids des sessions où CE juré est assigné (dérivés de
//                        l'index assignments du parent). Pilote "Sessions assignées"
//                        + "Scores par session".

import React, { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { SUCCESS, WARNING } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { JURY_QUALITES } from '@/components/rsa/candidature/juryFunnel.i18n';
import { UI } from './i18n';
import { compareSessions } from './constants';
import { getSessionAccent } from './sessionMarker';
import {
  useJuryProfileCard,
  useJurorPhotoUrl,
  useJurorWishes,
  useJurorSessionScores,
} from './useJuryProfile';

function initialsOf(name, fallbackEmail) {
  const src = (name || fallbackEmail || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  return parts.map((s) => s[0]).join('').toUpperCase() || '?';
}

function qualiteLabel(value, t) {
  if (!value) return null;
  const q = JURY_QUALITES.find((x) => x.value === value);
  return q ? t(q.label) : value;
}

function fmtNote(n, lang) {
  if (n == null) return '—';
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
  return n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Petite pastille ronde (marqueur de session) — pas d'emoji.
function Dot({ color }) {
  return (
    <span
      className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
      style={{ background: color }}
      aria-hidden
    />
  );
}

function SessionPill({ session }) {
  const accent = getSessionAccent(session);
  return (
    <span
      className="inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-[2px] mr-1.5 mb-1.5"
      style={{ border: `1px solid ${CREAM2}`, color: NAVY }}
    >
      <Dot color={accent} />
      {session?.name || session?.theme || session?.id}
    </span>
  );
}

export default function JuryProfileDrawer({
  open,
  onClose,
  juryUserId,
  email,
  fullName,
  editionId,
  sessions,
  assignedSessionIds,
}) {
  const { t, lang } = useLang();
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const sessionList = useMemo(() => {
    const arr = Array.isArray(sessions) ? [...sessions] : [];
    return arr.sort(compareSessions);
  }, [sessions]);

  const sessionById = useMemo(() => {
    const m = new Map();
    for (const s of sessionList) m.set(s.id, s);
    return m;
  }, [sessionList]);

  const profile = useJuryProfileCard(open ? juryUserId : null);
  const photo = useJurorPhotoUrl(open ? profile.data?.photo_path : null);
  const wishes = useJurorWishes({ email: open ? email : null, editionId });

  // Sessions assignées = ids fournis par le parent (index des assignments),
  // résolus en objets session (ordre = compareSessions) pour la pastille + nom.
  const assignedSessions = useMemo(() => {
    const ids = Array.isArray(assignedSessionIds) ? assignedSessionIds : [];
    return ids
      .map((id) => sessionById.get(id))
      .filter(Boolean)
      .sort(compareSessions);
  }, [assignedSessionIds, sessionById]);

  const scores = useJurorSessionScores({
    juryUserId: open ? juryUserId : null,
    sessions: open ? assignedSessions : [],
  });

  // Scroll-lock + ESC + restore-focus.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    }
    window.addEventListener('keydown', onKey);
    // Focus le bouton fermer à l'ouverture (focus-trap léger).
    const tid = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(tid);
      document.body.style.overflow = prevOverflow;
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [open, onClose]);

  const displayName = fullName || email;
  const qLabel = qualiteLabel(profile.data?.qualite, t);
  const org = profile.data?.organisation;
  const subline = [qLabel, org].filter(Boolean).join(' · ');
  const photoUrl = photo.data;
  const initials = initialsOf(fullName, email);
  const isLoading = profile.isLoading;

  // Sessions souhaitées résolues -> objets session (pour la pastille + nom).
  const wishSessions = useMemo(
    () => (wishes.data || []).map((id) => sessionById.get(id)).filter(Boolean),
    [wishes.data, sessionById],
  );

  return (
    <div aria-hidden={!open}>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-200"
        style={{
          background: 'rgba(10,15,30,0.5)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jury-drawer-title"
        className="fixed top-0 right-0 h-full z-[61] overflow-y-auto"
        style={{
          width: 392,
          maxWidth: '92vw',
          background: '#fff',
          boxShadow: '-14px 0 44px rgba(15,31,61,0.18)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .26s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Header navy */}
        <div className="relative px-6 pt-7 pb-6" style={{ background: NAVY, color: '#fff' }}>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t(UI.drawerClose)}
            className="absolute top-4 right-4 p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[3px]"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            <X className="w-4 h-4" />
          </button>

          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName || ''}
              className="w-[66px] h-[66px] rounded-full object-cover mb-3.5 block"
              style={{ border: `1px solid ${GOLD}` }}
            />
          ) : (
            <div
              className="w-[66px] h-[66px] rounded-full flex items-center justify-center text-[21px] mb-3.5"
              style={{ background: 'rgba(255,255,255,0.08)', color: GOLD, fontWeight: 600 }}
              aria-hidden
            >
              {initials}
            </div>
          )}

          <div id="jury-drawer-title" className="text-[20px]" style={{ fontFamily: SERIF, fontWeight: 500 }}>
            {displayName || '—'}
          </div>
          {subline && (
            <div className="text-[12.5px] mt-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {subline}
            </div>
          )}
          {email && (
            <div className="text-[12px] mt-2" style={{ color: GOLD }}>
              {email}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {isLoading ? (
            <p className="text-[13px]" style={{ color: MUTED }}>
              {t(UI.drawerLoading)}
            </p>
          ) : (
            <>
              {/* Statut */}
              <section className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: MUTED }}>
                  {t(UI.drawerStatusLabel)}
                </div>
                <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: NAVY }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: SUCCESS }} aria-hidden />
                  {t(UI.drawerValidated)}
                </div>
              </section>

              {/* Sessions souhaitées */}
              <section className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: MUTED }}>
                  {t(UI.drawerWishes)}
                </div>
                {wishes.isLoading ? (
                  <p className="text-[12px]" style={{ color: MUTED }}>{t(UI.drawerLoading)}</p>
                ) : wishSessions.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: MUTED }}>{t(UI.drawerWishesEmpty)}</p>
                ) : (
                  <div className="flex flex-wrap">
                    {wishSessions.map((s) => (
                      <SessionPill key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </section>

              {/* Sessions assignées */}
              <section className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: MUTED }}>
                  {t(UI.drawerAssigned)}
                </div>
                {assignedSessions.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: MUTED }}>{t(UI.drawerAssignedEmpty)}</p>
                ) : (
                  <div className="flex flex-wrap">
                    {assignedSessions.map((s) => (
                      <SessionPill key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </section>

              {/* Scores par session */}
              <section className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: MUTED }}>
                  {t(UI.drawerScores)}
                </div>
                {assignedSessions.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: MUTED }}>{t(UI.drawerScoresEmpty)}</p>
                ) : scores.isLoading ? (
                  <p className="text-[12px]" style={{ color: MUTED }}>{t(UI.drawerLoading)}</p>
                ) : (
                  <div>
                    {assignedSessions.map((s) => {
                      const row = scores.byId[s.id];
                      const accent = getSessionAccent(s);
                      const total = row?.total ?? 0;
                      const rated = row?.rated ?? 0;
                      const hasOpened = row?.hasOpened ?? false;
                      const complete = total > 0 && rated >= total;
                      let progLabel;
                      let progColor;
                      if (!hasOpened) {
                        progLabel = t(UI.drawerScoreClosed);
                        progColor = MUTED;
                      } else if (complete) {
                        progLabel = t(UI.drawerScoreDone(rated, total));
                        progColor = SUCCESS;
                      } else {
                        progLabel = t(UI.drawerScoreLive(rated, total));
                        progColor = WARNING;
                      }
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 py-2.5"
                          style={{ borderTop: `1px solid ${CREAM2}` }}
                        >
                          <span
                            className="flex-1 min-w-0 text-[12.5px] flex items-center gap-2 truncate"
                            style={{ color: NAVY }}
                          >
                            <Dot color={accent} />
                            <span className="truncate">{s.name || s.theme || s.id}</span>
                          </span>
                          <span
                            className="text-[16px] tabular-nums"
                            style={{ fontFamily: SERIF, fontWeight: 500, color: NAVY }}
                          >
                            {row?.avg != null ? (
                              <>
                                {fmtNote(row.avg, lang)}
                                <small
                                  className="text-[11px] font-normal ml-0.5"
                                  style={{ color: MUTED, fontFamily: 'inherit' }}
                                >
                                  /5
                                </small>
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                          <span
                            className="text-[10.5px] tracking-[0.04em] text-right min-w-[80px]"
                            style={{ color: progColor }}
                          >
                            {progLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Bio */}
              <section className="mb-2">
                <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: MUTED }}>
                  {t(UI.drawerBio)}
                </div>
                {profile.data?.bio ? (
                  <p className="text-[13px] leading-relaxed" style={{ color: INK }}>
                    {profile.data.bio}
                  </p>
                ) : (
                  <p className="text-[12.5px]" style={{ color: MUTED }}>{t(UI.drawerBioEmpty)}</p>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 pb-7 pt-1">
          <a
            href={email ? `mailto:${email}` : undefined}
            className="flex-1 text-center text-[13px] py-3 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            style={{
              background: NAVY,
              color: '#fff',
              pointerEvents: email ? 'auto' : 'none',
              opacity: email ? 1 : 0.5,
            }}
          >
            {t(UI.drawerSendEmail)}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] py-3 px-5 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            style={{ border: `1px solid ${CREAM2}`, background: '#fff', color: INK }}
          >
            {t(UI.drawerClose)}
          </button>
        </div>
      </aside>
    </div>
  );
}
