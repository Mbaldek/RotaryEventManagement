// FinaleSection — la climax : focal éditorial sobre (sans gradient ni trophée animé).
import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '@/components/design';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF } from '@/components/design/tokens';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/lib/platform/i18n';
import { UI, formatSessionDate } from './i18n';
import { createPageUrl } from '@/utils';
import { getSessionPalette } from './sessionTheme';

function FinalistName({ finalist }) {
  const p = finalist?.source_session_theme_color
    ? getSessionPalette(
        { id: finalist.source_session_id, config: { theme_color: finalist.source_session_theme_color } },
        0,
      )
    : { primary: MUTED };
  return (
    <span className="inline-flex items-center gap-2 text-[14px]" style={{ color: NAVY }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: p.primary }} />
      <span style={{ fontFamily: SERIF }}>{finalist.startup_name || finalist.name}</span>
    </span>
  );
}

export default function FinaleSection({ edition, finaleSession, finalists, totalFinalistsExpected }) {
  const { t, lang } = useLang();
  const finalistsList = Array.isArray(finalists) ? finalists : [];
  const dateLabel = formatSessionDate(finaleSession?.session_date, lang);
  const showRsvp =
    edition?.finale_rsvp_enabled || edition?.status === 'finale' || edition?.status === 'sessions';

  return (
    <section
      id={finaleSession ? `session-${finaleSession.id}` : undefined}
      className="mt-16 pt-12"
      style={{ borderTop: `2px solid ${CREAM2}` }}
    >
      <Eyebrow>{t(UI.finaleEyebrow)}{edition?.year ? ` · ${edition.year}` : ''}</Eyebrow>
      <h2 className="text-[28px] md:text-[36px] font-normal leading-tight" style={{ fontFamily: SERIF, color: NAVY }}>
        {t(UI.finaleTitle)}
      </h2>
      {(dateLabel || finaleSession?.notes) && (
        <p className="mt-2 italic text-[15px]" style={{ fontFamily: SERIF, color: INK }}>
          {[finaleSession?.notes, dateLabel].filter(Boolean).join(' · ')}
        </p>
      )}
      <span aria-hidden className="block h-[1.5px] w-7 mt-5" style={{ background: GOLD }} />

      {!finaleSession ? (
        <p className="mt-5 italic text-[14px]" style={{ color: MUTED }}>{t(UI.finaleNoData)}</p>
      ) : (
        <>
          <div className="mt-6 uppercase text-[10.5px] tracking-[0.16em] font-semibold" style={{ color: NAVY }}>
            {t(UI.finaleFinalistsLabel)(finalistsList.length, totalFinalistsExpected || 0)}
          </div>
          {finalistsList.length === 0 ? (
            <p className="mt-3 italic text-[13px]" style={{ color: MUTED }}>{t(UI.finaleNoFinalists)}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {finalistsList.map((f) => (
                <FinalistName key={f.id || f.startup_name || f.name} finalist={f} />
              ))}
            </div>
          )}
          {showRsvp && (
            <Link
              to={createPageUrl('RsaFinaleRsvp')}
              className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] text-[13.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
              style={{ background: NAVY, color: 'white' }}
            >
              {t(UI.finaleRsvpCta)} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}
