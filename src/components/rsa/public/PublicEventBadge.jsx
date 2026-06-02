// PublicEventBadge — bandeau visuel "VOUS CANDIDATEZ POUR" affiché en tête des
// pages publiques (DevenirJury, Candidater) quand l'URL contient ?edition=X.
//
// But : un candidat qui ouvre le lien partagé doit IMMÉDIATEMENT comprendre à
// quel événement (compétition) il candidate, sans devoir lire le formulaire en
// bas. On affiche : nom de la compétition + année + nom du club si fourni.
//
// Auto-fetch via Supabase (lecture publique sur editions / clubs). Fallback
// silencieux : si la query échoue, on n'affiche rien (jamais bloquant).
//
// API : <PublicEventBadge editionId="rsa2026" clubId="rotary-paris" /> — les 2
// props peuvent être null ; le composant rend null si pas de editionId.
//
// Props optionnelles (candidature ciblée) : `criteria` (string[]) +
// `criteriaTitle` (string) + `closeLabel` (string) enrichissent le badge avec un
// rappel des critères clés et de la date de clôture — affichés sous un filet.

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { CREAM2, GOLD, INK, MUTED, NAVY, SERIF, TINT_ADMIN } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';

const COPY = {
  jury: {
    fr: 'Vous candidatez au jury pour',
    en: 'You are applying as a jury member for',
    de: 'Sie bewerben sich als Jurymitglied für',
  },
  startup: {
    fr: 'Vous candidatez pour',
    en: 'You are applying for',
    de: 'Sie bewerben sich für',
  },
  inClub: {
    fr: 'au sein du club',
    en: 'with the club',
    de: 'beim Club',
  },
};

export default function PublicEventBadge({
  editionId,
  clubId,
  kind = 'startup',
  className = '',
  criteria = null,
  criteriaTitle = null,
  closeLabel = null,
}) {
  const { t } = useLang();
  const [edition, setEdition] = useState(null);
  const [club, setClub] = useState(null);

  useEffect(() => {
    if (!editionId) return undefined;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('editions')
          .select('id, name, year')
          .eq('id', editionId)
          .maybeSingle();
        if (active) setEdition(data || null);
      } catch {
        if (active) setEdition(null);
      }
    })();
    return () => { active = false; };
  }, [editionId]);

  useEffect(() => {
    if (!clubId) { setClub(null); return undefined; }
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('clubs')
          .select('id, name')
          .eq('id', clubId)
          .maybeSingle();
        if (active) setClub(data || null);
      } catch {
        if (active) setClub(null);
      }
    })();
    return () => { active = false; };
  }, [clubId]);

  if (!editionId) return null;

  const eventName = edition?.name || editionId;
  const eventYear = edition?.year || null;
  const clubName = club?.name || null;
  const hasCriteria = Array.isArray(criteria) && criteria.length > 0;

  return (
    <aside
      className={`rounded-[4px] p-4 mb-6 flex items-start gap-3 ${className}`}
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
      role="note"
      aria-label="Event context"
    >
      <Calendar className="w-4 h-4 mt-1 shrink-0" style={{ color: GOLD }} aria-hidden />
      <div className="flex-1 min-w-0">
        <p
          className="uppercase text-[10.5px] tracking-[0.16em] font-medium mb-1"
          style={{ color: GOLD }}
        >
          {t(COPY[kind] || COPY.startup)}
        </p>
        <p
          className="text-[16px] md:text-[18px] leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {eventName}
          {eventYear && (
            <span style={{ color: MUTED, fontWeight: 400 }}> · {eventYear}</span>
          )}
        </p>
        {clubName && (
          <p className="text-[12.5px] mt-1" style={{ color: INK }}>
            {t(COPY.inClub)} <strong>{clubName}</strong>
          </p>
        )}

        {(hasCriteria || closeLabel) && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${CREAM2}` }}>
            {hasCriteria && (
              <>
                {criteriaTitle && (
                  <p
                    className="uppercase text-[10px] tracking-[0.14em] font-medium mb-1.5"
                    style={{ color: MUTED }}
                  >
                    {criteriaTitle}
                  </p>
                )}
                <ul className="space-y-1 list-none m-0 p-0">
                  {criteria.map((c, i) => (
                    <li key={i} className="text-[12.5px] flex items-start gap-2" style={{ color: INK }}>
                      <span
                        className="inline-block w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{ background: GOLD }}
                        aria-hidden
                      />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {closeLabel && (
              <p className={`text-[11.5px] inline-flex items-center gap-1.5 ${hasCriteria ? 'mt-2' : ''}`} style={{ color: MUTED }}>
                <Calendar className="w-3 h-3 shrink-0" aria-hidden />
                {closeLabel}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
