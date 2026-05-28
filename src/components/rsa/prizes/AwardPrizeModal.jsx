// AwardPrizeModal — modale pour décerner un prix à une startup (V2.5).
//
// Affiché en overlay au-dessus de PrizesList. Présente la liste des startups
// candidates (filtrées par scope : édition entière en 'competition', club seul
// en 'club') et déclenche rsa_award_prize via le hook useAwardPrize.
//
// Props :
//   prize     : Prize  (la ligne à décerner)
//   startups  : Array<Startup>  (les startups éligibles ; le parent les fournit)
//   onAward   : ({ id, startupId }) => Promise
//   onClose   : () => void
//   busy      : bool

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { NAVY, INK, MUTED, GOLD, CREAM2, SERIF, EASE } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { Field, Select } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { AWARD_MODAL, PRIZES_UI } from './i18n';

export default function AwardPrizeModal({
  prize,
  startups = [],
  onAward,
  onClose,
  busy = false,
}) {
  const { t } = useLang();
  const [picked, setPicked] = useState('');
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setError(null);
    if (!picked) return;
    try {
      await onAward?.({ id: prize.id, startupId: picked });
      onClose?.();
    } catch (err) {
      setError(err?.message || String(err));
    }
  }

  const options = (startups || []).map((s) => ({
    value: s.id,
    label: s.name || s.id,
  }));

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: EASE }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15,31,61,0.45)' }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <motion.div
          key="card"
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="rounded-[4px] w-full max-w-[520px] p-5"
          style={{ background: 'white', border: `1px solid ${GOLD}` }}
        >
        <header className="mb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="h-[1.5px] w-6" style={{ background: GOLD }} aria-hidden />
              <span
                className="uppercase text-[10px] tracking-[0.18em] font-medium"
                style={{ color: GOLD }}
              >
                {t(AWARD_MODAL.title)}
              </span>
            </div>
            <h3
              className="text-[18px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {prize?.name}
            </h3>
            <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>
              {prize?.amount?.toLocaleString?.() || prize?.amount} {prize?.currency}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            aria-label={t(PRIZES_UI.close)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <p className="text-[13px] mb-4" style={{ color: INK }}>
          {t(AWARD_MODAL.lede)}
        </p>

        {options.length === 0 ? (
          <p className="text-[12.5px] py-2" style={{ color: MUTED }}>
            {t(AWARD_MODAL.noStartups)}
          </p>
        ) : (
          <Field label={t(AWARD_MODAL.startupLabel)} required>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                placeholder={t(AWARD_MODAL.startupPlaceholder)}
                options={options}
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                disabled={busy}
              />
            )}
          </Field>
        )}

        {error && (
          <p className="text-[12px] mt-3" style={{ color: DANGER }} role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(PRIZES_UI.cancel)}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !picked}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: NAVY, color: 'white' }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy ? t(AWARD_MODAL.awarding) : t(AWARD_MODAL.confirm)}
          </button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
