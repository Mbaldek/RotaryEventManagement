// Club Cockpit › Incubateurs (mode Préparation).
//
// Chaque club gère SA liste d'incubateurs relais (opt-in depuis la base globale)
// et SON contact (personne + email) pour cette compétition. La base globale
// (création) reste partagée ; édition/suppression réservées au master, donc on
// passe canEditBase={false} (le club ne renomme/supprime pas l'incubateur d'un
// autre club). Données : club_incubators (cf. 20260608_rsa_club_incubators.sql).

import React from 'react';
import { useLang } from '@/lib/platform/i18n';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import ClubIncubatorsManager from '@/components/rsa/incubators/ClubIncubatorsManager';
import { useSourcingStats, useClubIncubators } from '@/components/rsa/hooks/useIncubators';

export default function ClubIncubatorsTab({ edition, clubId }) {
  const { t } = useLang();
  const editionId = edition?.id;

  if (!editionId) {
    return (
      <p className="text-[13px]" style={{ color: MUTED }}>
        {t({
          fr: 'Choisissez une compétition pour gérer vos incubateurs relais.',
          en: 'Pick a competition to manage your relay incubators.',
          de: 'Wählen Sie einen Wettbewerb, um Ihre Relais-Inkubatoren zu verwalten.',
        })}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span className="uppercase text-[10px] tracking-[0.18em] font-medium" style={{ color: GOLD }}>
            {t({ fr: 'Sourcing', en: 'Sourcing', de: 'Sourcing' })}
          </span>
        </div>
        <h3 className="text-[18px] leading-tight mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t({ fr: 'Vos incubateurs relais', en: 'Your relay incubators', de: 'Ihre Relais-Inkubatoren' })}
        </h3>
        <p className="text-[13px]" style={{ color: INK }}>
          {t({
            fr: 'Choisissez les incubateurs qui relaieront le concours auprès de vos startups, et renseignez le contact à qui envoyer le kit.',
            en: 'Pick the incubators that will relay the competition to your startups, and add the contact to send the kit to.',
            de: 'Wählen Sie die Inkubatoren, die den Wettbewerb an Ihre Startups weiterleiten, und tragen Sie den Kontakt für den Kit-Versand ein.',
          })}
        </p>
      </header>

      <ClubIncubatorsManager editionId={editionId} clubId={clubId} canEditBase={false} />

      <section className="border-t pt-6" style={{ borderColor: CREAM2 }}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
          {t({ fr: 'Provenance de vos candidats', en: 'Your applicant sourcing', de: 'Herkunft Ihrer Bewerber' })}
        </h3>
        <ClubSourcing editionId={editionId} clubId={clubId} t={t} />
      </section>
    </div>
  );
}

function ClubSourcing({ editionId, clubId, t }) {
  const { data } = useSourcingStats(editionId, clubId);
  const { data: opted = [] } = useClubIncubators(editionId, clubId);
  const nameById = Object.fromEntries(opted.map((o) => [o.id, o.name]));

  if (!data || data.total === 0) {
    return (
      <p className="text-[12.5px]" style={{ color: MUTED }}>
        {t({ fr: 'Aucune candidature soumise pour le moment.', en: 'No submitted applications yet.', de: 'Noch keine eingereichten Bewerbungen.' })}
      </p>
    );
  }
  const rows = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="space-y-1 text-sm">
      {rows.map(([id, n]) => (
        <li key={id} className="flex justify-between"><span>{nameById[id] || id}</span><span className="font-semibold">{n}</span></li>
      ))}
      {data.other > 0 && (
        <li className="flex justify-between" style={{ color: MUTED }}><span>{t({ fr: 'Autre', en: 'Other', de: 'Andere' })}</span><span>{data.other}</span></li>
      )}
      {data.none > 0 && (
        <li className="flex justify-between" style={{ color: MUTED }}><span>{t({ fr: 'Non renseigné', en: 'Not specified', de: 'Nicht angegeben' })}</span><span>{data.none}</span></li>
      )}
    </ul>
  );
}
