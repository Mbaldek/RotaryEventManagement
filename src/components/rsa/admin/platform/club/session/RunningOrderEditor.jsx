// RunningOrderEditor — édite l'ordre de passage des startups d'une session.
// SEUL endroit où pitch_order est écrit (deck + emails le lisent). Cf. blueprint §5.
// Réordonnancement par flèches ↑↓ (zéro dépendance, a11y simple).

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { GOLD, NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { estimatedPitchTime, PITCH_SLOT_MINUTES } from '@/lib/rsa/presentation/runningOrder';
import { useSessionStartups, useSetRunningOrder } from '../useClub';
import { SESSION_PANELS } from './sessionPanels.i18n';

export default function RunningOrderEditor({ session, onBack }) {
  const { t } = useLang();
  const startupsQ = useSessionStartups(session?.id);
  const saveMut = useSetRunningOrder(session?.id);

  const [order, setOrder] = useState([]);
  const [startTime, setStartTime] = useState(session?.config?.start_time || '18:00');
  const [slot, setSlot] = useState(PITCH_SLOT_MINUTES);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (startupsQ.data && order.length === 0) setOrder(startupsQ.data);
  }, [startupsQ.data, order.length]);

  const move = (idx, dir) => {
    setSavedFlag(false);
    setOrder((prev) => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const save = async () => {
    await saveMut.mutateAsync(order.map((s) => s.id));
    setSavedFlag(true);
  };

  return (
    <div>
      <button type="button" onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-[12px] mb-4 rounded-[2px] ${FOCUS_RING_CLASS}`}
        style={{ color: MUTED }}>
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.back)}
      </button>

      <h3 className="text-[20px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
        {t(SESSION_PANELS.orderTitle)}
      </h3>
      <p className="text-[12.5px] mb-4" style={{ color: INK }}>{t(SESSION_PANELS.orderIntro)}</p>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="text-[12px]" style={{ color: INK }}>
          {t(SESSION_PANELS.startTime)}{' '}
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className={`ml-1 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
            style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>
        <label className="text-[12px]" style={{ color: INK }}>
          {t(SESSION_PANELS.slotMinutes)}{' '}
          <input type="number" min={1} value={slot} onChange={(e) => setSlot(Number(e.target.value) || PITCH_SLOT_MINUTES)}
            className={`ml-1 w-16 rounded-[4px] px-2 py-1 ${FOCUS_RING_CLASS}`}
            style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>
      </div>

      {order.length === 0 && (
        <p className="text-[12.5px] py-6 text-center" style={{ color: MUTED }}>
          {t(SESSION_PANELS.emptyStartups)}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {order.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 rounded-[4px] px-3 py-2"
            style={{ border: `1px solid ${CREAM2}`, background: 'white' }}>
            <span className="text-[13px] w-12" style={{ color: GOLD, fontFamily: SERIF }}>
              #{i + 1} · {estimatedPitchTime(startTime, i + 1, slot) || '—'}
            </span>
            <span className="flex-1 text-[13px]" style={{ color: NAVY }}>
              {s.name}{s.contact_person ? ` · ${s.contact_person}` : ''}
            </span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
              aria-label={t(SESSION_PANELS.moveUp)}
              className={`p-1 rounded-[3px] disabled:opacity-30 ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>
              <ArrowUp className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}
              aria-label={t(SESSION_PANELS.moveDown)}
              className={`p-1 rounded-[3px] disabled:opacity-30 ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>
              <ArrowDown className="w-4 h-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {order.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={save} disabled={saveMut.isPending}
            className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`}
            style={{ background: NAVY, color: 'white' }}>
            {t(SESSION_PANELS.save)}
          </button>
          {savedFlag && (
            <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: GOLD }}>
              <Check className="w-3.5 h-3.5" aria-hidden /> {t(SESSION_PANELS.saved)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
