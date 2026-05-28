// FederatedFinaleSection — bloc dédié à la Grande Finale fédérée (V2.5).
//
// Pattern : inspiré du FinaleCard de RsaJuryHub V1, mais repensé en gold/cream
// éditorial (pas de gradient or vif type "trophy"). Si l'édition n'a pas
// encore de session kind='finale' AND club_id IS NULL, on rend un état
// d'attente ("Date à confirmer").

import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '@/components/design';
import { NAVY, INK, MUTED, GOLD, SERIF } from '@/components/design/tokens';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { computeCountdown } from '@/components/rsa/jury/constants';
import ConcoursStatusPill from './ConcoursStatusPill';
import { UI, formatSessionDate } from './i18n';
import { createPageUrl } from '@/utils';

export default function FederatedFinaleSection({
  edition,
  finaleSession,
  finalists,
  totalFinalistsExpected,
}) {
  const { t, lang } = useLang();
  const hasFinale = !!finaleSession;
  const status = finaleSession?.config?.status || 'draft';
  const cd = computeCountdown(finaleSession?.session_date);
  const days = cd ? (cd.kind === 'past' || cd.kind === 'yesterday' ? -cd.days : cd.days) : null;
  const dateLabel = formatSessionDate(finaleSession?.session_date, lang);

  return (
    <section className="mb-12">
      <header className="mb-5">
        <Eyebrow>{t(UI.finaleEyebrow)}</Eyebrow>
        <h2
          className="text-[28px] font-normal leading-tight"
          style={{ fontFamily: SERIF, color: NAVY }}
        >
          {t(UI.finaleTitle)}
        </h2>
        <div
          aria-hidden
          className="h-[1.5px] mt-4"
          style={{ background: GOLD, width: 36 }}
        />
      </header>

      <div
        className="rounded-[10px] p-6 md:p-7"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.10), rgba(250,247,242,1))',
          border: `1px solid ${GOLD}55`,
        }}
      >
        {!hasFinale ? (
          <p className="text-[14px] italic" style={{ color: MUTED }}>
            {t(UI.finaleNoData)}
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div className="min-w-0">
                <h3
                  className="text-[22px] font-normal leading-tight"
                  style={{ fontFamily: SERIF, color: NAVY }}
                >
                  {finaleSession.name || finaleSession.theme || finaleSession.id}
                </h3>
                <div
                  className="text-[12.5px] mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"
                  style={{ color: INK }}
                >
                  {dateLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      {dateLabel}
                    </span>
                  )}
                  {finaleSession.notes && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      {finaleSession.notes}
                    </span>
                  )}
                </div>
              </div>
              <ConcoursStatusPill status={status} days={days} T={UI} t={t} />
            </div>

            {/* Finalists */}
            <div className="mb-5">
              <div
                className="uppercase text-[10px] tracking-[0.16em] font-medium mb-2"
                style={{ color: NAVY }}
              >
                {t(UI.finaleFinalistsLabel)(finalists?.length || 0, totalFinalistsExpected || 0)}
              </div>
              {(!finalists || finalists.length === 0) ? (
                <div className="text-[13px] italic" style={{ color: MUTED }}>
                  {t(UI.finaleNoFinalists)}
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {finalists.map((f) => (
                    <li
                      key={f.id || f.startup_name}
                      className="bg-white rounded-full px-3 py-1.5 text-[12.5px]"
                      style={{ border: `1px solid ${GOLD}55`, color: NAVY }}
                    >
                      <span className="font-medium">{f.startup_name || f.name}</span>
                      {f.source_session_name && (
                        <span style={{ color: MUTED }}> · {t(UI.finaleFromSession)} {f.source_session_name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* RSVP CTA — only if the edition has an RSVP flow enabled (graceful: link toward /RsaFinaleRsvp / /Finale if exists). */}
            {(edition?.finale_rsvp_enabled || edition?.status === 'finale' || edition?.status === 'sessions') && (
              <Link
                to={createPageUrl('RsaFinaleRsvp')}
                className="inline-flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-medium"
                style={{ background: NAVY, color: 'white' }}
              >
                {t(UI.finaleRsvpCta)}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}
