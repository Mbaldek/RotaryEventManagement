// Orchestration pure des emails « ordre de passage » (un par startup ordonnée).
// Aucun accès réseau/DB — testable en node --test. L'appelant boucle ensuite sur
// la liste retournée et appelle sendTransactional pour chaque payload (séquentiel,
// pour respecter le rate-limit Resend).

import { ordinal, estimatedPitchTime } from './runningOrder.js';

// Construit la liste des envois (un par startup ordonnée) pour les emails d'ordre
// de passage. Lève si des startups n'ont pas d'ordre (garde-fou) — l'appelant doit
// régler l'ordre en Préparation d'abord.
// Retourne un tableau de payloads { recipientEmail, recipientName, lang, data }.
export function buildRunningOrderSends(session, startups) {
  const missing = (startups || []).filter((s) => s.pitch_order == null);
  if (missing.length > 0) {
    const err = new Error('running_order_incomplete');
    err.missingCount = missing.length;
    throw err;
  }
  const startTime = session?.config?.start_time || null;
  const clubId = session?.club_id || null;
  return (startups || [])
    .filter((s) => s.email)
    .slice()
    .sort((a, b) => a.pitch_order - b.pitch_order)
    .map((s) => {
      const lang = s.preferred_lang || 'fr';
      return {
        recipientEmail: s.email,
        recipientName: s.contact_person || s.name,
        lang,
        data: {
          running_order: ordinal(s.pitch_order, lang),
          estimated_time: estimatedPitchTime(startTime, s.pitch_order) || '—',
          session_name: session?.name || '',
          session_date: session?.session_date || '',
          club_id: clubId,
        },
      };
    });
}
