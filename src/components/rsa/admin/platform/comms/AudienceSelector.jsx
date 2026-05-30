// AudienceSelector — sélecteur de segmentations pré-construites (Module 9).
//
// Driven par le scope :
//   - clubId fourni : audiences club_* et session_* dispo, single_email aussi.
//   - clubId null (master) : all_finalists_edition + single_email.
//
// Le composant remonte au parent une valeur unifiée :
//   { audienceType: string, audienceFilter: object }
// Le parent (EmailComposer) la passe ensuite à send-bulk.
//
// Affichage du count attendu : useAudiencePreview() appelle dry-run send-bulk.
// On debounce (300ms) pour ne pas spam l'edge function quand l'utilisateur
// change les filtres rapidement.

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Users, AlertTriangle } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  COMMS_AUDIENCE,
  audienceTypesForScope,
} from './i18n';
import {
  useAudiencePreview,
  useSessionsForClub,
  useEditionsForComms,
} from './useComms';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

function labelForType(type, t) {
  switch (type) {
    case 'single_email':         return t(COMMS_AUDIENCE.singleEmail);
    case 'club_candidates':      return t(COMMS_AUDIENCE.clubCandidates);
    case 'club_finalists':       return t(COMMS_AUDIENCE.clubFinalists);
    case 'club_jurys':           return t(COMMS_AUDIENCE.clubJurys);
    case 'club_comite':          return t(COMMS_AUDIENCE.clubComite);
    case 'club_admins':          return t(COMMS_AUDIENCE.clubAdmins);
    case 'session_jurys':        return t(COMMS_AUDIENCE.sessionJurys);
    case 'session_candidates':   return t(COMMS_AUDIENCE.sessionCandidates);
    case 'all_finalists_edition':return t(COMMS_AUDIENCE.allFinalistsEdition);
    default: return type;
  }
}

export default function AudienceSelector({
  clubId,
  isMasterAdmin = false,
  editionId,
  value,
  onChange,
}) {
  const { t } = useLang();

  // value = { audienceType, audienceFilter }
  const audienceType = value?.audienceType || '';
  const audienceFilter = value?.audienceFilter || {};

  const types = useMemo(
    () => audienceTypesForScope({ clubId, isMasterAdmin }),
    [clubId, isMasterAdmin],
  );

  // Bootstrap : on choisit un type par défaut sensé (single_email pour le master,
  // club_jurys pour un club_admin — usage le plus fréquent en pratique).
  useEffect(() => {
    if (!audienceType && types.length) {
      const def = clubId ? 'club_jurys' : 'single_email';
      const next = types.includes(def) ? def : types[0];
      onChange({ audienceType: next, audienceFilter: clubId ? { club_id: clubId } : {} });
    }
     
  }, [types.length]);

  // Quand on change de type, on rebuild filter de base (club_id automatique).
  function setType(next) {
    const base = {};
    if (clubId && next.startsWith('club_')) base.club_id = clubId;
    if (clubId && next.startsWith('session_')) base.club_id = clubId;
    if (editionId && (next === 'club_candidates' || next === 'club_finalists' || next === 'all_finalists_edition')) {
      base.edition_id = editionId;
    }
    onChange({ audienceType: next, audienceFilter: base });
  }

  function setFilterField(key, val) {
    onChange({
      audienceType,
      audienceFilter: { ...audienceFilter, [key]: val },
    });
  }

  // Sessions disponibles pour le club courant (filtré par édition si dispo)
  const sessionsQ = useSessionsForClub(
    audienceType?.startsWith('session_') ? clubId : null,
    editionId,
  );

  // Éditions disponibles pour le master (all_finalists_edition)
  const editionsQ = useEditionsForComms();

  // Email simple (single_email) : on stocke dans audienceFilter.email
  // Filter has-input ? On considère l'audience "complète" pour appel preview.
  const ready = useMemo(() => {
    if (!audienceType) return false;
    if (audienceType === 'single_email') {
      const e = String(audienceFilter.email || '').trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    }
    if (audienceType.startsWith('club_')) return !!audienceFilter.club_id;
    if (audienceType.startsWith('session_')) return !!audienceFilter.session_id;
    if (audienceType === 'all_finalists_edition') return !!audienceFilter.edition_id;
    return true;
  }, [audienceType, audienceFilter]);

  // Debounce le preview pour ne pas spammer l'edge function pendant la frappe
  // (single_email surtout — l'utilisateur tape lettre par lettre).
  const [debounced, setDebounced] = useState({ audienceType, audienceFilter });
  useEffect(() => {
    const id = setTimeout(() => setDebounced({ audienceType, audienceFilter }), 300);
    return () => clearTimeout(id);
  }, [audienceType, audienceFilter]);

  const preview = useAudiencePreview({
    clubId,
    audienceType: debounced.audienceType,
    audienceFilter: debounced.audienceFilter,
    enabled: ready && !!debounced.audienceType,
  });

  return (
    <div className="space-y-3">
      {/* Type */}
      <div>
        <FieldLabel htmlFor="audience-type">{t(COMMS_AUDIENCE.pickType)}</FieldLabel>
        <select
          id="audience-type"
          value={audienceType}
          onChange={(e) => setType(e.target.value)}
          className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          {types.map((tp) => (
            <option key={tp} value={tp}>{labelForType(tp, t)}</option>
          ))}
        </select>
        {clubId && (
          <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
            {t(COMMS_AUDIENCE.scopeNote)}
          </p>
        )}
      </div>

      {/* single_email → input email */}
      {audienceType === 'single_email' && (
        <div>
          <FieldLabel htmlFor="audience-email">{t(COMMS_AUDIENCE.emailLabel)}</FieldLabel>
          <input
            id="audience-email"
            type="email"
            value={audienceFilter.email || ''}
            onChange={(e) => setFilterField('email', e.target.value)}
            placeholder="contact@exemple.org"
            className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
          />
        </div>
      )}

      {/* session_* → session picker */}
      {audienceType?.startsWith('session_') && (
        <div>
          <FieldLabel htmlFor="audience-session">{t(COMMS_AUDIENCE.pickSession)}</FieldLabel>
          {sessionsQ.isLoading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>…</span>
            </div>
          ) : (
            <select
              id="audience-session"
              value={audienceFilter.session_id || ''}
              onChange={(e) => setFilterField('session_id', e.target.value)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              <option value="">—</option>
              {(sessionsQ.data || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.kind}{s.session_date ? ` · ${s.session_date}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* all_finalists_edition → edition picker */}
      {audienceType === 'all_finalists_edition' && (
        <div>
          <FieldLabel htmlFor="audience-edition">{t(COMMS_AUDIENCE.pickEdition)}</FieldLabel>
          {editionsQ.isLoading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>…</span>
            </div>
          ) : (
            <select
              id="audience-edition"
              value={audienceFilter.edition_id || ''}
              onChange={(e) => setFilterField('edition_id', e.target.value)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              <option value="">—</option>
              {(editionsQ.data || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.year} · {e.model}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Estimated count line */}
      <div
        className="rounded-[4px] px-3 py-2 flex items-center gap-2 text-[12.5px]"
        style={{
          background: preview.isError ? '#f6e7e3' : '#fdf6e8',
          border: `1px solid ${CREAM2}`,
          color: preview.isError ? DANGER : NAVY,
        }}
      >
        {preview.isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: MUTED }} />
            <span style={{ color: MUTED }}>…</span>
          </>
        ) : preview.isError ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t(COMMS_AUDIENCE.resolveError)}</span>
          </>
        ) : !ready ? (
          <>
            <Users className="w-3.5 h-3.5" style={{ color: MUTED }} />
            <span style={{ color: MUTED }}>—</span>
          </>
        ) : (
          <>
            <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <strong className="tabular-nums">{preview.data?.count ?? 0}</strong>
            <span style={{ color: INK }}>{t(COMMS_AUDIENCE.estimatedCount)}</span>
          </>
        )}
      </div>
    </div>
  );
}
