// DeckGenerator — form éditorial + export du deck HTML autonome de la session.
// Lit l'ordre de passage en SEULE LECTURE (réglé en Préparation). Cf. blueprint §6.

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { buildSessionDeckHtml } from '@/lib/rsa/presentation/buildSessionDeckHtml';
import { slugify } from '@/lib/rsa/presentation/runningOrder';
import { useSessionStartups } from '../useClub';
import { SESSION_PANELS } from './sessionPanels.i18n';

// 6 critères canoniques RSA + accroches par défaut (éditables). Cf. template
// docs/presentation/session_5_greentech.html (slide s-scoring).
const DEFAULT_CRITERIA = [
  { name: 'Value Proposition', tagline: 'Clear problem, real need.' },
  { name: 'Market & Traction', tagline: 'Size and momentum.' },
  { name: 'Business Model', tagline: 'Path to revenue.' },
  { name: 'Team', tagline: 'Right people for the problem.' },
  { name: 'Pitch Quality', tagline: 'Clarity and conviction.' },
  { name: 'Societal Impact', tagline: 'Tangible contribution.' },
];

export default function DeckGenerator({ session, onBack }) {
  const { t } = useLang();
  const startupsQ = useSessionStartups(session?.id);
  const startups = startupsQ.data || [];

  const [specialPrize, setSpecialPrize] = useState('');
  const [agenda, setAgenda] = useState('Welcome\nPitches\nDeliberation\nResults');
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);

  const cfg = session?.config || {};
  const model = useMemo(() => ({
    sessionName: session?.name || 'Session',
    theme: session?.theme || '',
    dateLabel: session?.session_date || '',
    timeLabel: cfg.start_time || '',
    specialPrize,
    agenda: agenda.split('\n').map((s) => s.trim()).filter(Boolean),
    criteria,
    jury: [], // jury affichage optionnel — non bloquant pour l'export.
    startups: startups
      .filter((s) => s.pitch_order != null)
      .map((s) => ({ name: s.name, founder: s.contact_person })),
  }), [session, cfg.start_time, specialPrize, agenda, criteria, startups]);

  const download = () => {
    const html = buildSessionDeckHtml(model);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${slugify(session?.name)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button type="button" onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}>
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.back)}
      </button>

      <h3 className="text-[20px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {t(SESSION_PANELS.deckTitle)}
      </h3>
      <p className="text-[12.5px] mb-4" style={{ color: INK }}>{t(SESSION_PANELS.deckIntro)}</p>

      <p className="text-[12px] mb-4" style={{ color: MUTED }}>
        {t(SESSION_PANELS.orderReadonly)} — {startups.filter((s) => s.pitch_order != null).length} startup(s).
      </p>

      <label className="block text-[12px] mb-3" style={{ color: INK }}>
        {t(SESSION_PANELS.specialPrize)}
        <input type="text" value={specialPrize} onChange={(e) => setSpecialPrize(e.target.value)}
          className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>

      <label className="block text-[12px] mb-3" style={{ color: INK }}>
        {t(SESSION_PANELS.agenda)}
        <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)}
          className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`}
          style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
      </label>

      <div className="text-[12px] mb-4" style={{ color: INK }}>
        {t(SESSION_PANELS.criteriaHint)}
        <div className="mt-2 flex flex-col gap-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={c.name}
                onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                className={`w-1/3 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
                style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
              <input type="text" value={c.tagline}
                onChange={(e) => setCriteria((p) => p.map((x, j) => j === i ? { ...x, tagline: e.target.value } : x))}
                className={`flex-1 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
                style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={download}
        className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
        style={{ background: NAVY, color: 'white' }}>
        <Download className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.download)}
      </button>
    </div>
  );
}
