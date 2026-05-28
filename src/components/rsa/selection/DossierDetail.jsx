// DossierDetail — read-only render of the candidate's startup row.
// Two-column hairline layout grouping Contact / Société / Projet / Finances /
// Rattachement. Never editable from here.

import React from 'react';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { UI } from './i18n';
import { formatDateTime } from './constants';

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] uppercase tracking-[0.12em] font-medium"
        style={{ color: MUTED }}
      >
        {label}
      </span>
      <span className="text-[14px] leading-relaxed break-words" style={{ color: INK }}>
        {children}
      </span>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="mb-5">
      <h4
        className="text-[12px] uppercase tracking-[0.14em] font-medium pb-2 mb-3"
        style={{ color: MUTED, borderBottom: `1px solid ${CREAM2}` }}
      >
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </section>
  );
}

function formatEur(value, lang = 'fr') {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  const locale = lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DossierDetail({ startup }) {
  const { t, lang } = useLang();
  if (!startup) return null;

  const fallback = (
    <span style={{ color: MUTED, fontStyle: 'italic' }}>{t(UI.notProvided)}</span>
  );
  const v = (val) => (val == null || val === '' ? fallback : val);

  const sectors = Array.isArray(startup.sectors) ? startup.sectors : [];

  return (
    <div>
      <Group title={t(UI.contactGroup)}>
        <Row label={t(UI.contactGroup)}>{v(startup.contact_person)}</Row>
        <Row label="Email">{v(startup.email)}</Row>
        <Row label="Téléphone">{v(startup.phone)}</Row>
        <Row label="Site web">
          {startup.website ? (
            <a
              href={
                /^https?:\/\//i.test(startup.website)
                  ? startup.website
                  : `https://${startup.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: NAVY, textDecoration: 'underline' }}
            >
              {startup.website}
            </a>
          ) : (
            fallback
          )}
        </Row>
      </Group>

      <Group title={t(UI.companyGroup)}>
        <Row label="Pays">{v(startup.country)}</Row>
        <Row label="Date de création">{v(formatDateTime(startup.creation_date, lang))}</Row>
        <Row label="N° d'immatriculation">{v(startup.registration_number)}</Row>
        <Row label="Fondateurs majoritaires">
          {startup.founders_majority === true
            ? 'Oui'
            : startup.founders_majority === false
              ? 'Non'
              : fallback}
        </Row>
      </Group>

      <Group title={t(UI.projectGroup)}>
        <Row label="Proposition de valeur">{v(startup.value_proposition)}</Row>
        <Row label="Modèle économique">{v(startup.business_model)}</Row>
        <Row label="Roadmap">{v(startup.roadmap)}</Row>
        <Row label="Équipe">{v(startup.team)}</Row>
        <Row label="Traction">{v(startup.traction)}</Row>
        <Row label="Impact ESG">{v(startup.esg_impact)}</Row>
        <Row label="Secteurs">
          {sectors.length === 0
            ? fallback
            : sectors.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="inline-block px-2 py-0.5 rounded-full text-[12px] mr-1.5 mb-1"
                  style={{
                    background: '#fbf9f5',
                    border: `1px solid ${CREAM2}`,
                    color: INK,
                  }}
                >
                  {s}
                </span>
              ))}
        </Row>
      </Group>

      <Group title={t(UI.financeGroup)}>
        <Row label="Dernier CA">{v(formatEur(startup.last_revenue, lang))}</Row>
        <Row label="Montant levé">{v(formatEur(startup.amount_raised, lang))}</Row>
      </Group>

      <Group title={t(UI.rattachGroup)}>
        <Row label="Institution partenaire">{v(startup.partner_institution)}</Row>
        <Row label="Club Rotary">{v(startup.rotary_club)}</Row>
      </Group>

      <p
        className="text-[11px] mt-2"
        style={{ color: MUTED, fontFamily: SERIF, fontStyle: 'italic' }}
      >
        {t(UI.rulesNote)}
      </p>
    </div>
  );
}
