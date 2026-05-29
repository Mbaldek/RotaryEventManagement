// src/components/rsa/communicate/CommunicatePanel.jsx
// ---------------------------------------------------------------------------
// V3 Vague 2 — Feature B : CTA "Communiquer" pré-câblé.
//
// Panel éditorial Élysée affiché en haut de l'onglet Communications dans le
// ClubCockpit et le MasterCockpit. Deux cards d'action :
//   1. "Remercier les non-sélectionnés"
//   2. "Annoncer aux sélectionnés"
//
// Chaque card affiche le count en temps réel (via rsa_communicate_audience en
// dry-run) et ouvre la CommunicateModal au clic.
//
// Props :
//   editionId : string|null  — compétition courante (NULL = pas d'action possible)
//   clubId    : string|null  — NULL = scope master (toutes éditions), sinon scope club
//
// Dépendances :
//   - supabase rpc('rsa_communicate_audience') pour le count
//   - CommunicateModal pour le détail + envoi
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail, MailCheck, MailX, Users } from 'lucide-react';
import {
  GOLD, NAVY, INK, MUTED, CREAM2, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { COMMUNICATE_UI } from './i18n';
import CommunicateModal from './CommunicateModal';

// ── Hook utilitaire : audience count via RPC ──────────────────────────────
// On évite TanStack Query pour rester autonome (pas de queryClient requis
// côté arborescence) — un useEffect simple suffit.
function useAudienceCount({ editionId, clubId, kind, refreshKey }) {
  const [state, setState] = useState({
    loading: false,
    error:   null,
    count:   null,
    sample:  [],
  });

  useEffect(() => {
    let aborted = false;
    if (!editionId) {
      setState({ loading: false, error: null, count: null, sample: [] });
      return () => { aborted = true; };
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const { data, error } = await supabase.rpc('rsa_communicate_audience', {
          p_edition_id:    editionId,
          p_audience_kind: kind,
          p_dry_run:       true,
          p_club_id:       clubId || null,
        });
        if (aborted) return;
        if (error) {
          setState({ loading: false, error: error.message || 'rpc_error', count: null, sample: [] });
          return;
        }
        setState({
          loading: false,
          error:   null,
          count:   typeof data?.count === 'number' ? data.count : 0,
          sample:  Array.isArray(data?.sample) ? data.sample : [],
        });
      } catch (err) {
        if (aborted) return;
        setState({
          loading: false,
          error:   err instanceof Error ? err.message : String(err),
          count:   null,
          sample:  [],
        });
      }
    })();
    return () => { aborted = true; };
  }, [editionId, clubId, kind, refreshKey]);

  return state;
}

// ── Card individuelle ─────────────────────────────────────────────────────
function ActionCard({
  kind,
  icon: Icon,
  title,
  description,
  ctaLabel,
  count,
  loading,
  error,
  recipientsLabel,
  countError,
  disabled,
  onOpen,
  t,
}) {
  const cardPalette = kind === 'selected'
    ? { tint: '#ecf1e5', accent: '#1d6b4f' } // sage / live green
    : { tint: '#fdf6e8', accent: GOLD };     // warm cream / gold

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="rounded-[4px] p-5 flex flex-col gap-3"
      style={{
        background: 'white',
        border: `1px solid ${CREAM2}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-9 h-9 rounded-[4px] shrink-0"
          style={{ background: cardPalette.tint, color: cardPalette.accent, border: `1px solid ${CREAM2}` }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h3
            className="text-[16px] leading-snug"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {title}
          </h3>
          <p className="text-[12.5px] mt-1" style={{ color: INK }}>
            {description}
          </p>
        </div>
      </div>

      {/* Count line */}
      <div
        className="rounded-[4px] px-3 py-2 flex items-center gap-2 text-[12.5px]"
        style={{
          background: error ? '#f6e7e3' : cardPalette.tint,
          border:    `1px solid ${CREAM2}`,
          color:     error ? DANGER : NAVY,
        }}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: MUTED }} />
            <span style={{ color: MUTED }}>{t(COMMUNICATE_UI.estimating)}</span>
          </>
        ) : error ? (
          <>
            <MailX className="w-3.5 h-3.5" />
            <span>{countError}</span>
          </>
        ) : (
          <>
            <Users className="w-3.5 h-3.5" style={{ color: cardPalette.accent }} />
            <strong className="tabular-nums">{count ?? 0}</strong>
            <span style={{ color: INK }}>{recipientsLabel}</span>
          </>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled || loading || !!error}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[4px] text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: NAVY,
          color: 'white',
          border: `1px solid ${NAVY}`,
        }}
      >
        <Mail className="w-3.5 h-3.5" aria-hidden />
        {ctaLabel}
      </button>
    </motion.div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────
export default function CommunicatePanel({ editionId = null, clubId = null }) {
  const { t } = useLang();

  // openKind ∈ { null, 'unselected', 'selected' } — pilote la modale.
  const [openKind, setOpenKind] = useState(null);

  // refreshKey : bumped après un envoi réussi pour re-charger les counts.
  const [refreshKey, setRefreshKey] = useState(0);

  const unselected = useAudienceCount({ editionId, clubId, kind: 'unselected', refreshKey });
  const selected   = useAudienceCount({ editionId, clubId, kind: 'selected',   refreshKey });

  const handleClose = useCallback((sent) => {
    setOpenKind(null);
    if (sent) {
      // Re-fetch les compteurs : un envoi ne change pas les statuts, mais on
      // veut s'assurer que l'UX est cohérente en cas de mutation parallèle.
      setRefreshKey((k) => k + 1);
    }
  }, []);

  const scopeNote = clubId
    ? t(COMMUNICATE_UI.scopeClub)
    : t(COMMUNICATE_UI.scopeMaster);

  return (
    <section className="mb-6">
      {/* En-tête éditorial */}
      <header className="mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(COMMUNICATE_UI.eyebrow)}
          </span>
        </div>
        <h2
          className="text-[22px] leading-tight mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMUNICATE_UI.title)}
        </h2>
        <p className="text-[13px] max-w-2xl" style={{ color: INK }}>
          {t(COMMUNICATE_UI.subtitle)}
        </p>
        <p className="text-[11.5px] mt-1" style={{ color: MUTED }}>
          {scopeNote}
        </p>
      </header>

      {/* Cards */}
      {!editionId ? (
        <div
          className="rounded-[4px] px-4 py-3 text-[12.5px]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: MUTED }}
        >
          {t(COMMUNICATE_UI.noEdition)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ActionCard
            kind="unselected"
            icon={MailX}
            title={t(COMMUNICATE_UI.thanksTitle)}
            description={t(COMMUNICATE_UI.thanksDescription)}
            ctaLabel={t(COMMUNICATE_UI.openAction)}
            count={unselected.count}
            loading={unselected.loading}
            error={unselected.error}
            recipientsLabel={t(COMMUNICATE_UI.recipientsLabel)}
            countError={t(COMMUNICATE_UI.countError)}
            disabled={!editionId}
            onOpen={() => setOpenKind('unselected')}
            t={t}
          />
          <ActionCard
            kind="selected"
            icon={MailCheck}
            title={t(COMMUNICATE_UI.announceTitle)}
            description={t(COMMUNICATE_UI.announceDescription)}
            ctaLabel={t(COMMUNICATE_UI.openAction)}
            count={selected.count}
            loading={selected.loading}
            error={selected.error}
            recipientsLabel={t(COMMUNICATE_UI.recipientsLabel)}
            countError={t(COMMUNICATE_UI.countError)}
            disabled={!editionId}
            onOpen={() => setOpenKind('selected')}
            t={t}
          />
        </div>
      )}

      {/* Modale */}
      <CommunicateModal
        open={!!openKind}
        kind={openKind || 'unselected'}
        editionId={editionId}
        clubId={clubId}
        onClose={handleClose}
      />
    </section>
  );
}
