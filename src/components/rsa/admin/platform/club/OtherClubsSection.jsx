// OtherClubsSection — bloc lecture seule "Autres clubs de cette compétition"
// affiché en bas de l'onglet Setup du Club Cockpit pour les club_admin.
//
// Affichage : grille hairline 2-3 cards (selon largeur) — nom du club + pays +
// contact public + 3 KPIs (candidatures / sessions / finalistes). Tokens Élysée.
//
// Données : useOtherClubsOfEdition (RPC rsa_list_clubs_for_edition_with_counts).
// Masqué (composant renvoie null) si :
//   * pas d'editionId,
//   * RPC encore non déployée (erreur 42883 — fonction inconnue) — fail-soft.
//
// A11y : role="region" + aria-labelledby + heading h3 numéroté localement, KPI
// en text "tabular-nums".

import React from 'react';
import { Loader2, Users, Mail, MapPin } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { DANGER, TINT_DANGER, GOLD_TEXT, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_OTHERS } from './i18n';
import { useOtherClubsOfEdition } from './useOtherClubsOfEdition';

function ClubCard({ row, t }) {
  const contactLabel = row.contact_name || t(CLUB_OTHERS.contactNoName);
  return (
    <article
      className="rounded-[4px] p-4 flex flex-col gap-3"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
    >
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4
            className="text-[15px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {row.name || row.id}
          </h4>
          {(row.country || row.region) && (
            <p
              className="text-[11.5px] mt-1 inline-flex items-center gap-1"
              style={{ color: MUTED }}
            >
              <MapPin className="w-3 h-3" aria-hidden />
              {row.country || row.region}
            </p>
          )}
        </div>
      </header>

      <div className="text-[12px] flex items-center gap-1.5" style={{ color: INK }}>
        <Mail className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
        {row.contact_email ? (
          <a
            href={`mailto:${row.contact_email}`}
            className={`underline decoration-1 underline-offset-2 rounded-[2px] ${FOCUS_RING_CLASS}`}
            style={{ color: NAVY }}
          >
            {contactLabel}
          </a>
        ) : (
          <span style={{ color: MUTED }}>{t(CLUB_OTHERS.noContact)}</span>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2 mt-1" style={{ borderTop: `1px solid ${CREAM2}`, paddingTop: 10 }}>
        <div>
          <dd
            className="text-[16px] tabular-nums leading-none"
            style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
          >
            {Number(row.startups_count ?? row.applications_count ?? 0)}
          </dd>
          <dt className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: MUTED }}>
            {t(CLUB_OTHERS.metaApplications)}
          </dt>
        </div>
        <div>
          <dd
            className="text-[16px] tabular-nums leading-none"
            style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
          >
            {Number(row.sessions_count ?? 0)}
          </dd>
          <dt className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: MUTED }}>
            {t(CLUB_OTHERS.metaSessions)}
          </dt>
        </div>
        <div>
          <dd
            className="text-[16px] tabular-nums leading-none"
            style={{ color: NAVY, fontFamily: SERIF, fontWeight: 500 }}
          >
            {Number(row.finalists_count ?? 0)}
          </dd>
          <dt className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: MUTED }}>
            {t(CLUB_OTHERS.metaFinalists)}
          </dt>
        </div>
      </dl>
    </article>
  );
}

/**
 * Props :
 *   editionId : string — édition courante (depuis ClubCockpit).
 *   clubId    : string — club courant (exclu de la liste).
 */
export default function OtherClubsSection({ editionId, clubId }) {
  const { t } = useLang();
  const sectionTitleId = 'club-other-clubs-title';
  const { otherClubs, isLoading, isError, error } = useOtherClubsOfEdition({ editionId, clubId });

  // Fail-soft : si la RPC n'existe pas encore (équipe A pas mergée), on cache
  // simplement la section pour ne pas bloquer le rendu du Setup tab.
  if (isError) {
    const code = String(error?.code || error?.message || '').toLowerCase();
    if (code.includes('42883') || code.includes('does not exist') || code.includes('function')) {
      return null;
    }
  }

  if (!editionId) return null;

  return (
    <section
      role="region"
      aria-labelledby={sectionTitleId}
      className="mt-8"
    >
      <header className="mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
            style={{ color: GOLD_TEXT }}
          >
            {t(CLUB_OTHERS.sectionEyebrow)}
          </span>
        </div>
        <h3
          id={sectionTitleId}
          className="text-[18px] leading-tight inline-flex items-center gap-2"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          <Users className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
          {t(CLUB_OTHERS.sectionTitle)}
        </h3>
        <p className="text-[12.5px] mt-1.5" style={{ color: INK }}>
          {t(CLUB_OTHERS.sectionHint)}
        </p>
      </header>

      {isLoading && (
        <div className="py-5 flex items-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} aria-hidden />
          {t(CLUB_OTHERS.loading)}
        </div>
      )}

      {!isLoading && isError && (
        <p
          className="text-[13px] rounded-[4px] px-3 py-2"
          role="alert"
          style={{ background: TINT_DANGER, border: `1px solid ${CREAM2}`, color: DANGER }}
        >
          {t(CLUB_OTHERS.loadError)}
        </p>
      )}

      {!isLoading && !isError && otherClubs.length === 0 && (
        <div
          className="rounded-[4px] p-5 text-center"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <p className="text-[13px]" style={{ color: MUTED }}>{t(CLUB_OTHERS.empty)}</p>
        </div>
      )}

      {!isLoading && !isError && otherClubs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {otherClubs.map((row) => (
            <ClubCard key={row.id} row={row} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}
