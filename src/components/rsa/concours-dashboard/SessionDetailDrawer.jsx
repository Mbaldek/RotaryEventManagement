// SessionDetailDrawer v2 — drawer enrichi avec QR scoring + lauréat + photos jurés.
//
// Refonte v3 — la legacy version était une liste sèche. Le drawer v2 :
//   - HEADER coloré avec la palette thématique (light tint background + emoji)
//   - LIVE → QR code vers /RsaScore?s=… + lien copy + aide juré
//   - PUBLISHED → lauréat banner gradient gold + classement final compact
//   - Always → liste startups avec deck/exec download buttons
//   - Always → grille jurés en avatars circulaires (photo si dispo, initiales sinon)
//   - Lien pack jury en download si jury_pack_path existe
//
// Sidepanel à droite (560px desktop, full mobile), fond blanc, motion lente
// (ease-out-quart), overlay 0.45 navy. Esc pour fermer.

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Calendar, Download, FileText, Copy, ExternalLink, Trophy,
} from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM, CREAM2, SERIF, EASE } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';
import { useSessionDetail } from './useConcours';
import { getSessionPalette } from './sessionTheme';
import { supabase } from '@/lib/supabase';

function storageUrl(path) {
  if (!path) return null;
  try {
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function JurorAvatar({ juror, palette }) {
  const name = juror?.full_name || juror?.qualite || '—';
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  const photoUrl = storageUrl(juror?.photo_path);
  return (
    <div
      className="flex flex-col items-center text-center min-w-[88px] max-w-[100px]"
      title={name}
    >
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[12px] font-semibold mb-1.5 shrink-0"
        style={{
          background: photoUrl ? `url(${photoUrl}) center/cover` : NAVY,
          color: photoUrl ? 'transparent' : GOLD,
          border: `2px solid ${palette.light}`,
          boxShadow: `0 0 0 1px ${palette.border}`,
        }}
        aria-hidden
      >
        {!photoUrl && initials}
      </div>
      <div
        className="text-[11.5px] font-medium leading-tight truncate w-full"
        style={{ color: NAVY }}
      >
        {name}
      </div>
      {(juror?.qualite || juror?.organisation) && (
        <div
          className="text-[10px] leading-tight mt-0.5 line-clamp-2"
          style={{ color: MUTED }}
        >
          {[juror.qualite, juror.organisation].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}

function StartupRow({ startup, t, palette }) {
  const deckUrl = storageUrl(startup?.pitch_deck_path);
  const execUrl = storageUrl(startup?.exec_summary_path);
  return (
    <li
      className="flex items-start justify-between gap-3 py-3"
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[13.5px] font-medium leading-tight"
          style={{ color: NAVY, fontFamily: SERIF }}
        >
          {startup?.name || '—'}
        </div>
        {Array.isArray(startup?.sectors) && startup.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {startup.sectors.slice(0, 3).map((sec) => (
              <span
                key={sec}
                className="text-[9.5px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-[3px]"
                style={{
                  background: palette.light,
                  color: palette.primary,
                  border: `1px solid ${palette.border}`,
                }}
              >
                {sec}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {deckUrl ? (
          <a
            href={deckUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px] hover:bg-[#f3eee5] transition-colors"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <Download className="w-3 h-3" />
            {t(UI.drawerDeck)}
          </a>
        ) : (
          <span className="text-[10.5px]" style={{ color: MUTED }}>
            — {t(UI.drawerDeck)}
          </span>
        )}
        {execUrl && (
          <a
            href={execUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-[4px] hover:bg-[#f3eee5] transition-colors"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <FileText className="w-3 h-3" />
            {t(UI.drawerExec)}
          </a>
        )}
      </div>
    </li>
  );
}

function WinnerBanner({ winner, t }) {
  if (!winner) return null;
  return (
    <div
      className="rounded-[8px] p-4 flex items-center gap-3 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.20), rgba(201,168,76,0.04))',
        border: `1px solid ${GOLD}88`,
      }}
    >
      <Trophy className="w-6 h-6 shrink-0" style={{ color: '#9a6400' }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div
          className="uppercase text-[9.5px] tracking-[0.18em] font-semibold"
          style={{ color: '#9a6400' }}
        >
          {t(UI.drawerWinnerLabel)}
        </div>
        <div
          className="text-[18px] font-medium leading-tight mt-0.5 truncate"
          style={{ color: NAVY, fontFamily: SERIF }}
        >
          {winner.startup_name}
        </div>
      </div>
      {typeof winner.final_score === 'number' && (
        <div className="shrink-0 text-right">
          <div
            className="text-[22px] font-medium leading-none tabular-nums"
            style={{ color: '#9a6400', fontFamily: SERIF }}
          >
            {winner.final_score.toFixed(2)}
          </div>
          <div className="text-[9px] uppercase tracking-[0.12em] mt-0.5" style={{ color: MUTED }}>
            /5{winner.juror_count ? ` · ${winner.juror_count}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function FinalRankingTable({ ranking, t }) {
  if (!Array.isArray(ranking) || ranking.length === 0) return null;
  return (
    <div>
      <h3
        className="uppercase text-[10.5px] tracking-[0.14em] font-semibold mb-3"
        style={{ color: NAVY }}
      >
        {t(UI.drawerRankingTitle)}
      </h3>
      <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${CREAM2}` }}>
            <th
              className="text-left font-medium py-2"
              style={{ color: MUTED, width: 28 }}
            >
              #
            </th>
            <th className="text-left font-medium py-2" style={{ color: MUTED }}>
              {t({ fr: 'Startup', en: 'Startup', de: 'Startup' })}
            </th>
            <th
              className="text-right font-medium py-2"
              style={{ color: MUTED, width: 70 }}
            >
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r) => {
            const isWinner = r.final_rank === 1;
            return (
              <tr
                key={r.startup_name + r.final_rank}
                style={{
                  borderBottom: `1px solid ${CREAM2}`,
                  background: isWinner ? 'rgba(201,168,76,0.06)' : 'transparent',
                }}
              >
                <td
                  className="py-2 tabular-nums"
                  style={{
                    color: isWinner ? '#9a6400' : MUTED,
                    fontWeight: isWinner ? 600 : 500,
                  }}
                >
                  {isWinner ? '🏆' : r.final_rank}
                </td>
                <td
                  className="py-2"
                  style={{
                    color: NAVY,
                    fontFamily: isWinner ? SERIF : undefined,
                    fontWeight: isWinner ? 500 : 400,
                  }}
                >
                  {r.startup_name}
                </td>
                <td
                  className="py-2 text-right tabular-nums font-medium"
                  style={{ color: NAVY }}
                >
                  {typeof r.final_score === 'number' ? r.final_score.toFixed(2) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JuryScoringBlock({ session, palette, t }) {
  const scoringUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/RsaScore?s=${session.id}`
    : '';
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!scoringUrl) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(scoringUrl).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        },
        () => {},
      );
    }
  }

  return (
    <div
      className="rounded-[8px] p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start mb-5"
      style={{ background: palette.light, border: `1px solid ${palette.border}` }}
    >
      <div
        className="bg-white rounded-[6px] p-2 shrink-0"
        style={{ border: `1px solid ${palette.border}` }}
      >
        <QRCodeSVG
          value={scoringUrl}
          size={120}
          level="M"
          fgColor={NAVY}
          bgColor="white"
          marginSize={0}
        />
      </div>
      <div className="flex-1 min-w-0 w-full">
        <div
          className="uppercase text-[9.5px] tracking-[0.18em] font-semibold mb-1.5"
          style={{ color: palette.primary }}
        >
          {t(UI.drawerScoringLabel)}
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-[4px] bg-white mb-2"
          style={{ border: `1px solid ${palette.border}` }}
        >
          <code
            className="flex-1 text-[11.5px] truncate font-mono"
            style={{ color: NAVY }}
          >
            {scoringUrl}
          </code>
          <button
            type="button"
            onClick={copy}
            className="p-1 rounded-[3px] hover:bg-[#f3eee5] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            aria-label={t(UI.drawerCopy)}
            title={copied ? t(UI.drawerCopied) : t(UI.drawerCopy)}
            style={{ color: palette.primary }}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <a
            href={scoringUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded-[3px] hover:bg-[#f3eee5] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            aria-label={t(UI.drawerOpenScoring)}
            style={{ color: palette.primary }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: INK }}>
          {t(UI.drawerScoringHelp)}
        </p>
      </div>
    </div>
  );
}

export default function SessionDetailDrawer({ sessionId, onClose }) {
  const { t, lang } = useLang();
  const { data, isLoading, isError } = useSessionDetail(sessionId, !!sessionId);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    if (sessionId) {
      window.addEventListener('keydown', onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [sessionId, onClose]);

  const session = data?.session;
  const config = data?.config;
  const startups = data?.startups || [];
  const jurors = data?.jurors || [];
  const status = config?.status || 'draft';
  const isLive = status === 'live';
  const isPublished = status === 'published';
  const cd = computeCountdown(session?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const dateLabel = formatSessionDate(session?.session_date, lang);
  const palette = session
    ? getSessionPalette({ ...session, config }, 0)
    : { primary: NAVY, light: CREAM, border: CREAM2 };
  const juryPackUrl = storageUrl(config?.jury_pack_path);

  // Winner derived from final_ranking (only when published — gated by RPC v2).
  const ranking = Array.isArray(config?.final_ranking) ? config.final_ranking : [];
  const winner = isPublished
    ? ranking.find((r) => r.final_rank === 1) || ranking[0] || null
    : null;

  return (
    <AnimatePresence>
      {sessionId && (
        <div
          className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-end md:justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="concours-drawer-title"
        >
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-0"
            style={{ background: 'rgba(15,31,61,0.45)' }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="relative w-full md:w-[600px] h-full overflow-y-auto"
            style={{ background: 'white', borderLeft: `1px solid ${CREAM2}` }}
          >
            {/* Colored header — palette light background, primary rail top */}
            <div
              aria-hidden
              className="h-[3px]"
              style={{ background: palette.primary }}
            />
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
              style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
            >
              <div
                className="uppercase text-[10px] tracking-[0.18em] font-semibold"
                style={{ color: palette.primary }}
              >
                {t(UI.drawerSection)}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(UI.drawerClose)}
                className="p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2]"
                style={{ color: NAVY }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6">
              {isLoading && (
                <div className="text-[13px]" style={{ color: MUTED }}>
                  {t(UI.loading)}
                </div>
              )}
              {isError && (
                <div className="text-[13px]" style={{ color: '#b91c1c' }}>
                  {t(UI.loadError)}
                </div>
              )}

              {session && (
                <>
                  {/* Title block */}
                  <div className="mb-5">
                    {session.theme && (
                      <div
                        className="uppercase text-[10.5px] tracking-[0.16em] font-semibold mb-1.5"
                        style={{ color: palette.primary }}
                      >
                        {session.theme}
                      </div>
                    )}
                    <h2
                      id="concours-drawer-title"
                      className="text-[24px] font-normal leading-tight"
                      style={{ fontFamily: SERIF, color: NAVY }}
                    >
                      {session.name || session.theme || session.id}
                    </h2>
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      {dateLabel && (
                        <span
                          className="text-[12px] inline-flex items-center gap-1.5"
                          style={{ color: INK }}
                        >
                          <Calendar className="w-3 h-3" />
                          {dateLabel}
                        </span>
                      )}
                      <ConcoursStatusPill
                        status={status}
                        days={days}
                        T={UI}
                        t={t}
                        tintBg={palette.light}
                        tintBorder={palette.border}
                        tintFg={palette.primary}
                      />
                    </div>
                  </div>

                  {/* Published → winner banner + ranking */}
                  {isPublished && winner && <WinnerBanner winner={winner} t={t} />}

                  {/* Live → QR scoring block */}
                  {isLive && <JuryScoringBlock session={session} palette={palette} t={t} />}

                  {/* Jury pack download (always when available) */}
                  {juryPackUrl && (
                    <div className="mb-6">
                      <a
                        href={juryPackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-[12.5px] font-medium hover:opacity-90 transition-opacity"
                        style={{ background: NAVY, color: 'white' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t(UI.drawerJuryPack)}
                      </a>
                    </div>
                  )}

                  {/* Final ranking (published only) */}
                  {isPublished && ranking.length > 0 && (
                    <section className="mb-7">
                      <FinalRankingTable ranking={ranking} t={t} />
                    </section>
                  )}

                  {/* Startups */}
                  <section className="mb-7">
                    <h3
                      className="uppercase text-[10.5px] tracking-[0.14em] font-semibold mb-3 flex items-center gap-2"
                      style={{ color: NAVY }}
                    >
                      {t(UI.drawerStartups)}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums"
                        style={{
                          background: palette.light,
                          color: palette.primary,
                          border: `1px solid ${palette.border}`,
                        }}
                      >
                        {startups.length}
                      </span>
                    </h3>
                    {startups.length === 0 ? (
                      <div className="text-[12.5px] italic" style={{ color: MUTED }}>
                        {t(UI.drawerEmpty)}
                      </div>
                    ) : (
                      <ul className="m-0 p-0 list-none">
                        {startups.map((s) => (
                          <StartupRow key={s.id} startup={s} t={t} palette={palette} />
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Jurors — grille avatars */}
                  <section className="mb-2">
                    <h3
                      className="uppercase text-[10.5px] tracking-[0.14em] font-semibold mb-3 flex items-center gap-2"
                      style={{ color: NAVY }}
                    >
                      {t(UI.drawerJurors)}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums"
                        style={{
                          background: palette.light,
                          color: palette.primary,
                          border: `1px solid ${palette.border}`,
                        }}
                      >
                        {jurors.length}
                      </span>
                    </h3>
                    {jurors.length === 0 ? (
                      <div className="text-[12.5px] italic" style={{ color: MUTED }}>
                        {t(UI.drawerEmpty)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {jurors.map((j) => (
                          <JurorAvatar key={j.user_id} juror={j} palette={palette} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
