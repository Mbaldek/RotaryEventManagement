// OperationalSpacesStrip — pont du cockpit de compétition vers les espaces
// OPÉRATIONNELS (réception des dossiers / sélection / jury), scopé à l'édition.
//
// Raison d'être : le CompetitionEditView est 100 % configuration (identité,
// clubs, règles, sessions…). Les dossiers candidats vivent sur les routes
// séparées /Selection et /Jury que la TopNav admin ne surface pas
// (computePrimaryNav ne rend qu'un item « Administration »). Ce strip comble ce
// trou : depuis le Pilotage, un clic mène droit au module dossiers déjà filtré
// sur la compétition courante.
//
// Compteurs : dossiers via Startup.summaryByStatus (staff_read RLS) ; jurés
// distincts via platform_jury_assignments joint aux sessions de l'édition.
// Lecture seule, 30s de staleTime (pas de polling).

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Gavel } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { GOLD_TEXT } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { Startup } from '@/lib/rsa/entities';
import { STATUS_FILTERS } from '@/components/rsa/selection/constants';

const T = {
  eyebrow: { fr: 'Espaces opérationnels', en: 'Operational spaces', de: 'Operative Bereiche' },
  intro: {
    fr: 'Réception des dossiers, sélection et jury — déjà filtrés sur cette compétition.',
    en: 'Dossier intake, selection and jury — already filtered to this competition.',
    de: 'Dossier-Eingang, Auswahl und Jury — bereits auf diesen Wettbewerb gefiltert.',
  },
  candidatures: { fr: 'Candidatures & sélection', en: 'Applications & selection', de: 'Bewerbungen & Auswahl' },
  candidaturesHint: {
    fr: 'Dossiers reçus, éligibilité, allocation de session',
    en: 'Received dossiers, eligibility, session allocation',
    de: 'Eingegangene Dossiers, Eignung, Session-Zuteilung',
  },
  jury: { fr: 'Jury & notation', en: 'Jury & scoring', de: 'Jury & Bewertung' },
  juryHint: {
    fr: 'Jurés assignés, pré-lecture, grilles de notation',
    en: 'Assigned jurors, pre-read, scoring grids',
    de: 'Zugewiesene Juroren, Vorabprüfung, Bewertungsraster',
  },
  dossiers: { fr: (n) => `${n} dossier${n > 1 ? 's' : ''}`, en: (n) => `${n} dossier${n > 1 ? 's' : ''}`, de: (n) => `${n} Dossier${n > 1 ? 's' : ''}` },
  toReview: { fr: (n) => `${n} à voir`, en: (n) => `${n} to review`, de: (n) => `${n} zu prüfen` },
  jurors: { fr: (n) => `${n} juré${n > 1 ? 's' : ''}`, en: (n) => `${n} juror${n > 1 ? 's' : ''}`, de: (n) => `${n} Juror${n > 1 ? 'en' : ''}` },
  none: { fr: 'aucun pour l’instant', en: 'none yet', de: 'noch keine' },
};

// Hook compteurs — dossiers (par statut) + jurés distincts de l'édition.
// Exporté : réutilisé par la coquille nav-flux (CompetitionShell) pour afficher
// les compteurs live dans les lignes de la phase Organisation.
export function useOperationalCounts(editionId) {
  return useQuery({
    queryKey: ['rsa', 'master', 'operational-counts', editionId],
    enabled: !!editionId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const summary = await Startup.summaryByStatus(editionId);
      const total = Object.values(summary).reduce((a, b) => a + b, 0);
      const toReview = STATUS_FILTERS.toReview.reduce((a, s) => a + (summary[s] || 0), 0);

      // Jurés distincts : sessions de l'édition → assignments. Best-effort (si la
      // table/colonne diverge, on retombe sur 0 sans casser le strip).
      let jurors = 0;
      try {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .eq('edition_id', editionId);
        const sessionIds = (sessions || []).map((s) => s.id);
        if (sessionIds.length > 0) {
          const { data: assignments } = await supabase
            .from('platform_jury_assignments')
            .select('jury_user_id')
            .in('session_id', sessionIds);
          jurors = new Set((assignments || []).map((a) => a.jury_user_id)).size;
        }
      } catch {
        jurors = 0;
      }

      return { total, toReview, jurors };
    },
  });
}

// Une ligne cliquable du strip (Link react-router déjà scopé sur l'édition).
function OpsRow({ to, icon: Icon, title, hint, metrics }) {
  return (
    <Link
      to={to}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] transition-colors hover:bg-white"
      style={{ borderTop: `1px solid ${CREAM2}` }}
    >
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        aria-hidden
      >
        <Icon className="w-4 h-4" style={{ color: GOLD }} />
      </span>
      <span className="min-w-0">
        <span
          className="block text-[14px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {title}
        </span>
        <span className="block text-[12px] mt-0.5 truncate" style={{ color: MUTED }}>
          {hint}
        </span>
      </span>
      <span className="flex items-center gap-3 shrink-0">
        <span className="text-[12.5px] tabular-nums text-right" style={{ color: INK }}>
          {metrics}
        </span>
        <ArrowRight
          className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
          style={{ color: NAVY }}
          aria-hidden
        />
      </span>
    </Link>
  );
}

export default function OperationalSpacesStrip({ editionId }) {
  const { t } = useLang();
  const { data, isLoading } = useOperationalCounts(editionId);

  const dossiersMetric = useMemo(() => {
    if (isLoading || !data) return '…';
    if (data.total === 0) return t(T.none);
    const parts = [t(T.dossiers)(data.total)];
    if (data.toReview > 0) parts.push(t(T.toReview)(data.toReview));
    return parts.join(' · ');
  }, [isLoading, data, t]);

  const juryMetric = useMemo(() => {
    if (isLoading || !data) return '…';
    return data.jurors > 0 ? t(T.jurors)(data.jurors) : t(T.none);
  }, [isLoading, data, t]);

  if (!editionId) return null;

  return (
    <section
      className="rounded-[4px] mb-6 overflow-hidden"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      aria-label={t(T.eyebrow)}
    >
      <header className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(T.eyebrow)}
          </span>
        </div>
        <p className="text-[12px] mt-1.5" style={{ color: INK }}>
          {t(T.intro)}
        </p>
      </header>

      <OpsRow
        to={`/Selection?edition=${encodeURIComponent(editionId)}`}
        icon={ClipboardList}
        title={t(T.candidatures)}
        hint={t(T.candidaturesHint)}
        metrics={dossiersMetric}
      />
      <OpsRow
        to={`/Jury?edition=${encodeURIComponent(editionId)}`}
        icon={Gavel}
        title={t(T.jury)}
        hint={t(T.juryHint)}
        metrics={juryMetric}
      />
    </section>
  );
}
