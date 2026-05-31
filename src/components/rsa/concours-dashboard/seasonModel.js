// seasonModel.js — modèle pur : aplatit l'overview RPC en une saison chronologique.
//
// Entrée (forme RPC rsa_concours_edition_overview) :
//   overview.sessions_by_club : { [clubId]: Session[] }   (qualifying)
//   overview.finale_sessions  : Session[]                 (kind='finale')
//   overview.clubs            : { id, name }[]
// Sortie : { flat, months, single, nextId }
//   flat   : sessions qualifying enrichies, triées par date croissante
//   months : [{ key, label, sessions }] (vide si single)
//   single : true si <= 1 mois distinct (pas de chapitrage)
//   nextId : session live, sinon prochaine non publiée (countdown), sinon null

import { getSessionPalette } from './sessionTheme';
import { computeCountdown } from '@/components/rsa/jury/constants';

const LOCALE = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE' };

function enrich(session, clubName, indexInClub) {
  const status = session?.config?.status || 'draft';
  const cd = computeCountdown(session?.session_date);
  const ts = session?.session_date ? Date.parse(session.session_date) : null;
  return {
    ...session,
    clubName: clubName || null,
    palette: getSessionPalette(session, indexInClub),
    status,
    countdown: cd,
    ts: Number.isNaN(ts) ? null : ts,
  };
}

export function buildSeason(overview, lang = 'fr') {
  if (!overview) return { flat: [], months: [], single: true, nextId: null };

  const clubName = Object.fromEntries((overview.clubs || []).map((c) => [c.id, c.name]));

  const flat = [];
  Object.entries(overview.sessions_by_club || {}).forEach(([clubId, sessions]) => {
    (sessions || []).forEach((s, i) => flat.push(enrich(s, clubName[clubId], i)));
  });
  flat.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const live = flat.find((s) => s.status === 'live');
  const upcoming = flat
    .filter(
      (s) =>
        s.status !== 'published' &&
        s.countdown &&
        ['today', 'tomorrow', 'in'].includes(s.countdown.kind),
    )
    .sort((a, b) => (a.countdown.days ?? 0) - (b.countdown.days ?? 0));
  const nextId = live?.id || upcoming[0]?.id || null;

  const monthKey = (ts) => {
    if (!ts) return 'na';
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };
  const distinct = new Set(flat.map((s) => monthKey(s.ts)));
  const single = distinct.size <= 1;

  const months = [];
  if (!single) {
    const fmt = new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.fr, { month: 'long' });
    const byKey = new Map();
    for (const s of flat) {
      const k = monthKey(s.ts);
      if (!byKey.has(k)) {
        const label = s.ts ? fmt.format(new Date(s.ts)) : '—';
        const group = { key: k, label, sessions: [] };
        byKey.set(k, group);
        months.push(group);
      }
      byKey.get(k).sessions.push(s);
    }
  }

  return { flat, months, single, nextId };
}
