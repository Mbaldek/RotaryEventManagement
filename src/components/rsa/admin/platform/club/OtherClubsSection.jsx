// OtherClubsSection — bloc lecture seule "Autres clubs de cette compétition"
// affiché en bas de l'onglet Setup du Club Cockpit pour les club_admin.
//
// Affichage : index éditorial à filets — une ligne par club (nom Playfair +
// méta pays + stats en sous-ligne séparées par « · »). Tokens Élysée.
// Pas de boîtes/cards.
//
// Données : useOtherClubsOfEdition (RPC rsa_list_clubs_for_edition_with_counts).
// Masqué (composant renvoie null) si :
//   * pas d'editionId,
//   * RPC encore non déployée (erreur 42883 — fonction inconnue) — fail-soft.
//
// A11y : role="region" + aria-labelledby + heading h3 numéroté localement.

import React from 'react';
import { Loader2, Users, Mail, MapPin } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { DANGER, TINT_DANGER, GOLD_TEXT, FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { CLUB_OTHERS } from './i18n';
import { useOtherClubsOfEdition } from './useOtherClubsOfEdition';

function ClubRow({ row, t }) {
  const contactLabel = row.contact_name || t(CLUB_OTHERS.contactNoName);
  const apps = Number(row.startups_count ?? row.applications_count ?? 0);
  const sessions = Number(row.sessions_count ?? 0);
  const finalists = Number(row.finalists_count ?? 0);

  return (
    <li style={{ borderBottom: `1px solid ${CREAM2}` }}>
      <div className="grid grid-cols-[1fr_auto] items-start gap-4 py-4">
        {/* Left: name + meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[15px] leading-tight"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {row.name || row.id}
            </span>
            {(row.country || row.region) && (
              <span
                className="inline-flex items-center gap-1 text-[11.5px]"
                style={{ color: MUTED }}
              >
                <MapPin className="w-3 h-3" aria-hidden />
                {row.country || row.region}
              </span>
            )}
          </div>

          {/* Sub-line: stats · contact */}
          <p className="text-[12px] mt-1 flex flex-wrap items-center gap-x-1.5" style={{ color: MUTED }}>
            <span className="tabular-nums">
              <span style={{ color: NAVY, fontWeight: 500 }}>{apps}</span>
              {' '}{t(CLUB_OTHERS.metaApplications)}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              <span style={{ color: NAVY, fontWeight: 500 }}>{sessions}</span>
              {' '}{t(CLUB_OTHERS.metaSessions)}
            </span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              <span style={{ color: NAVY, fontWeight: 500 }}>{finalists}</span>
              {' '}{t(CLUB_OTHERS.metaFinalists)}
            </span>
            {row.contact_email && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" style={{ color: GOLD }} aria-hidden />
                  <a
                    href={`mailto:${row.contact_email}`}
                    className={`underline decoration-1 underline-offset-2 rounded-[2px] ${FOCUS_RING_CLASS}`}
                    style={{ color: INK }}
                  >
                    {contactLabel}
                  </a>
                </span>
              </>
            )}
            {!row.contact_email && (
              <>
                <span aria-hidden>·</span>
                <span>{t(CLUB_OTHERS.noContact)}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </li>
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
      <header className="mb-4">
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
        <p className="py-5 text-[13px] italic" style={{ color: MUTED }}>
          {t(CLUB_OTHERS.empty)}
        </p>
      )}

      {!isLoading && !isError && otherClubs.length > 0 && (
        <ul
          className="list-none m-0 p-0"
          style={{ borderTop: `1px solid ${CREAM2}` }}
        >
          {otherClubs.map((row) => (
            <ClubRow key={row.id} row={row} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
