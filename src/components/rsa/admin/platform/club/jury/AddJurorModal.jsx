// AddJurorModal — ajout manuel d'un juré (sans compte). Crée une candidature
// approved attachée à la session. Cf. blueprint Lot A §A.2.
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { NAVY, INK, MUTED, CREAM2, SERIF } from '@/components/design/tokens';
import { FOCUS_RING_CLASS } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { SESSION_JURY } from '@/components/rsa/admin/platform/master/i18n';
import { useAddManualJuror } from './useJury';

const QUALITES = ['investisseur', 'entrepreneur', 'expert', 'corporate', 'autre'];

export default function AddJurorModal({ sessionId, onClose }) {
  const { t } = useLang();
  const add = useAddManualJuror(sessionId);
  const [fullName, setFullName] = useState('');
  const [qualite, setQualite] = useState('expert');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { setError(t(SESSION_JURY.errNameRequired)); return; }
    setError(null);
    try {
      await add.mutateAsync({ fullName: fullName.trim(), qualite, email: email.trim() || null });
      onClose();
    } catch (err) {
      setError(err?.message || 'Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,31,61,0.45)' }} role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-[6px] p-5" style={{ background: 'white' }}>
        <div className="flex items-center mb-3">
          <h4 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>{t(SESSION_JURY.addJuror)}</h4>
          <button type="button" onClick={onClose} className={`ml-auto p-1 rounded-[3px] ${FOCUS_RING_CLASS}`} style={{ color: MUTED }} aria-label={t(SESSION_JURY.modalCancel)}>
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <label className="block text-[12px] mb-2" style={{ color: INK }}>
          {t(SESSION_JURY.formFullName)}
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus maxLength={120}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>

        <label className="block text-[12px] mb-2" style={{ color: INK }}>
          {t(SESSION_JURY.formQualite)}
          <select value={qualite} onChange={(e) => setQualite(e.target.value)}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-2 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }}>
            {QUALITES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>

        <label className="block text-[12px] mb-3" style={{ color: INK }}>
          {t(SESSION_JURY.formEmail)} <span style={{ color: MUTED }}>({t(SESSION_JURY.optional)})</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 w-full rounded-[4px] px-2.5 py-1.5 ${FOCUS_RING_CLASS}`} style={{ border: `1px solid ${CREAM2}`, color: NAVY }} />
        </label>

        {error && <p className="text-[12px] mb-2" role="alert" style={{ color: '#b00020' }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`} style={{ color: MUTED }}>{t(SESSION_JURY.modalCancel)}</button>
          <button type="submit" disabled={add.isPending} className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] ${FOCUS_RING_CLASS}`} style={{ background: NAVY, color: 'white' }}>
            {add.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />} {t(SESSION_JURY.modalSubmit)}
          </button>
        </div>
      </form>
    </div>
  );
}
