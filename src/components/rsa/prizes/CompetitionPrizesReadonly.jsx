// CompetitionPrizesReadonly — bloc LECTURE SEULE des prix décernés au niveau
// de la COMPÉTITION (prizes.club_id IS NULL), affiché AU-DESSUS des prix du
// club dans le Club Cockpit (onglet « Prix »).
//
// Le club n'édite PAS ces prix : ils sont gérés par l'organisation de la
// compétition (master / competition admin). Ici, on les expose en rappel pour
// éviter qu'un club ne les redéfinisse localement (modèle additif, cf.
// blueprint docs/blueprints/club-inheritance-rules-prizes.md §6).
//
// AUCUN bouton edit / delete / award — read-only strict. La source de données
// est le hook useEditionPrizes(editionId, { scope: 'competition' }) qui filtre
// déjà club_id IS NULL côté client.
//
// Strings co-localisées { fr, en, de } (club/i18n.js est édité par un autre
// agent en parallèle — on ne le touche pas).

import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  NAVY, INK, MUTED, GOLD, CREAM2, SERIF, TINT_BEIGE,
} from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useEditionPrizes } from './usePrizes';
import { CURRENCY_OPTIONS, PRIZE_FORM } from './i18n';

// ── i18n co-localisé ─────────────────────────────────────────────────────────
const UI = {
  eyebrow: {
    fr: 'Prix de la compétition',
    en: 'Competition prizes',
    de: 'Wettbewerbspreise',
  },
  readonlyBadge: {
    fr: 'Lecture seule',
    en: 'Read-only',
    de: 'Nur Lesen',
  },
  header: {
    fr: 'Les prix principaux sont décernés au niveau de la compétition ; votre club n’a pas à les redéfinir.',
    en: 'The main prizes are awarded at the competition level; your club does not need to redefine them.',
    de: 'Die Hauptpreise werden auf Wettbewerbsebene verliehen; Ihr Club muss sie nicht neu definieren.',
  },
  awardedLevel: {
    fr: 'décerné au niveau compétition',
    en: 'awarded at the competition level',
    de: 'auf Wettbewerbsebene verliehen',
  },
  empty: {
    fr: 'Aucun prix défini au niveau de la compétition pour l’instant.',
    en: 'No prize defined at the competition level yet.',
    de: 'Noch kein Preis auf Wettbewerbsebene definiert.',
  },
};

// ── Helpers d'affichage (montant + devise) — mêmes règles que PrizesList ─────
function currencySymbol(code) {
  const found = CURRENCY_OPTIONS.find((c) => c.code === code);
  return found ? found.symbol : (code || '');
}

function formatAmount(amount, currency) {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currencySymbol(currency);
  } catch {
    return `${amount} ${currencySymbol(currency)}`;
  }
}

// Badge kind read-only — calqué sur KindBadge de PrizesList.
function KindBadge({ kind }) {
  const { t } = useLang();
  const isGeneral = kind === 'general';
  const label = isGeneral ? t(PRIZE_FORM.kindGeneral) : t(PRIZE_FORM.kindSpecial);
  return (
    <span
      className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
      style={{
        background: isGeneral ? '#fdf6e8' : TINT_BEIGE,
        color: isGeneral ? NAVY : INK,
        border: `1px solid ${isGeneral ? GOLD : CREAM2}`,
      }}
    >
      {label}
    </span>
  );
}

export default function CompetitionPrizesReadonly({ editionId }) {
  const { t } = useLang();
  const prizesQ = useEditionPrizes(editionId, { scope: 'competition' });
  const prizes = prizesQ.data || [];

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      {/* En-tête éditorial : filet gold + eyebrow + badge lecture seule */}
      <header className="mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {t(UI.eyebrow)}
          </span>
          <span className="text-[12px]" style={{ color: MUTED }}>· {prizes.length}</span>
          <span
            className="ml-auto inline-flex items-center text-[10px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'white', color: MUTED, border: `1px solid ${CREAM2}` }}
          >
            {t(UI.readonlyBadge)}
          </span>
        </div>
        <p className="text-[12px]" style={{ color: MUTED }}>{t(UI.header)}</p>
      </header>

      {prizesQ.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!prizesQ.isLoading && prizes.length === 0 && (
        <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(UI.empty)}</p>
      )}

      {!prizesQ.isLoading && prizes.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-3">
          {prizes.map((p) => (
            <li
              key={p.id}
              className="rounded-[4px] p-4"
              style={{ background: 'white', border: `1px solid ${CREAM2}` }}
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-[16px] leading-tight"
                    style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
                  >
                    {p.name}
                  </h4>
                  <p className="text-[13px] mt-0.5 tabular-nums" style={{ color: INK }}>
                    {formatAmount(p.amount, p.currency)}
                  </p>
                  {p.description && (
                    <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: INK }}>
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <KindBadge kind={p.kind} />
                    <span className="text-[11.5px] italic" style={{ color: MUTED }}>
                      {t(UI.awardedLevel)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
