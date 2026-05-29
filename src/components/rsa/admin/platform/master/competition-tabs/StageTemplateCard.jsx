// StageTemplateCard — carte d'un modèle d'email lié à une étape du funnel.
// ---------------------------------------------------------------------------
// Affichée à l'intérieur d'une section "Stage" du CommunicationTabRefonte.
// Composition (suivant le designbook Élysée — hairline gold + serif title) :
//   - eyebrow contextuel (icon + label phase)
//   - titre Playfair du modèle + preview courte (max 140 chars du body localisé)
//   - badge "Auto" (template transactionnel auto-triggered) ou "Manuel"
//   - compteur audience live (X destinataires) via previewAudience()
//   - boutons : "Préparer l'envoi" (NAVY primary) | "Voir le modèle" (ghost) | "Dupliquer"
//
// Quand le template n'a PAS de structured audienceType (ex. press kit press release),
// le compteur affiche un message générique et le bouton "Préparer" passe quand
// même la modale pour permettre l'édition + push vers Email Studio.
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Send, Eye, Copy, Users, CheckCircle2, AlertTriangle, Sparkles, Lock,
} from 'lucide-react';
import {
  GOLD, NAVY, INK, MUTED, CREAM2, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { previewAudience } from '@/lib/platform/bulk';
import { COMMUNICATION_REFONTE } from '../i18n';

// ── helpers ────────────────────────────────────────────────────────────────
function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_m, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}

function resolveLang(dict, lang) {
  if (!dict) return '';
  if (typeof dict === 'string') return dict;
  return dict[lang] || dict.fr || dict.en || '';
}

function plainTextPreview(markdown, max = 140) {
  if (!markdown) return '';
  const stripped = String(markdown)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > max ? `${stripped.slice(0, max)}…` : stripped;
}

// ── Audience count micro-hook ──────────────────────────────────────────────
function useAudienceCount({ audienceType, audienceFilter, clubId, enabled }) {
  const [state, setState] = useState({ loading: false, error: null, count: null });
  const filterKey = JSON.stringify(audienceFilter || {});

  useEffect(() => {
    if (!enabled || !audienceType) {
      setState({ loading: false, error: null, count: null });
      return undefined;
    }
    let aborted = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const res = await previewAudience({
          clubId: clubId ?? null,
          audienceType,
          audienceFilter: audienceFilter || {},
        });
        if (aborted) return;
        if (!res || res.ok === false) {
          setState({ loading: false, error: res?.error || 'error', count: null });
          return;
        }
        setState({
          loading: false,
          error: null,
          count: typeof res.count === 'number' ? res.count : 0,
        });
      } catch (err) {
        if (aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          count: null,
        });
      }
    })();
    return () => { aborted = true; };
  }, [audienceType, filterKey, clubId, enabled]);

  return state;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function StageTemplateCard({
  stage,         // { id, eyebrow, icon: Icon }  — pour le hairline contextuel
  template,      // { id, audienceType, audienceFilter, statuses, subject, body, manualOnly, autoTrigger }
  clubId = null,
  editionId,
  onPrepare,     // (template) => void
  onPreview,     // (template) => void  (optional)
  onDuplicate,   // (template) => void  (optional)
  disabled = false,
}) {
  const { t, lang } = useLang();

  // Merge filter with editionId/clubId by default.
  const audienceFilter = {
    ...(template?.audienceFilter || {}),
    ...(editionId ? { edition_id: editionId } : {}),
    ...(clubId ? { club_id: clubId } : {}),
  };

  const audience = useAudienceCount({
    audienceType: template?.audienceType,
    audienceFilter,
    clubId,
    enabled: !!template?.audienceType && !template?.autoTrigger,
  });

  const StageIcon = stage?.icon || Sparkles;
  const isAuto = !!template?.autoTrigger;
  const noAudience = !template?.audienceType;

  const subject = resolveLang(template?.subject, lang);
  const body = resolveLang(template?.body, lang);
  const preview = plainTextPreview(body);

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="rounded-[4px] p-4 flex flex-col gap-3"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      aria-labelledby={`tpl-title-${template?.id}`}
    >
      {/* Eyebrow contextuel : phase tag */}
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em]">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-6 h-6 rounded-[3px]"
          style={{ background: '#fdf6e8', color: GOLD, border: `1px solid ${CREAM2}` }}
        >
          <StageIcon className="w-3 h-3" />
        </span>
        <span className="font-medium" style={{ color: GOLD }}>{stage?.eyebrow || ''}</span>
        <span className="ml-auto inline-flex items-center gap-1">
          {isAuto ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium"
              style={{ background: '#ecf1e5', color: '#1d6b4f', border: `1px solid ${CREAM2}` }}
              title={t(COMMUNICATION_REFONTE.cardAutoTriggerTitle)}
            >
              <Lock className="w-2.5 h-2.5" />
              {t(COMMUNICATION_REFONTE.cardAutoTriggerBadge)}
            </span>
          ) : (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px]"
              style={{ background: '#eff1f6', color: NAVY, border: `1px solid ${CREAM2}` }}
            >
              {t(COMMUNICATION_REFONTE.cardManualBadge)}
            </span>
          )}
        </span>
      </div>

      {/* Title + preview */}
      <div>
        <h4
          id={`tpl-title-${template?.id}`}
          className="text-[16px] leading-snug mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {resolveLang(template?.titleDict || {}, lang) || subject}
        </h4>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {resolveLang(template?.description || {}, lang) || preview}
        </p>
      </div>

      {/* Audience count line */}
      <div
        className="rounded-[4px] px-3 py-2 flex items-center gap-2 text-[12px]"
        style={{
          background: audience.error ? '#f6e7e3' : isAuto ? '#ecf1e5' : '#fdf6e8',
          border: `1px solid ${CREAM2}`,
          color: audience.error ? DANGER : NAVY,
        }}
        aria-live="polite"
      >
        {isAuto ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#1d6b4f' }} />
            <span style={{ color: INK }}>{t(COMMUNICATION_REFONTE.s1tplConfirmAutoNote)}</span>
          </>
        ) : noAudience ? (
          <>
            <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span style={{ color: INK }}>{t(COMMUNICATION_REFONTE.cardAudienceUnknown)}</span>
          </>
        ) : audience.loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: MUTED }} />
            <span style={{ color: MUTED }}>{t(COMMUNICATION_REFONTE.cardAudienceLoading)}</span>
          </>
        ) : audience.error ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t(COMMUNICATION_REFONTE.cardAudienceError)}</span>
          </>
        ) : (
          <>
            <Users className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <strong className="tabular-nums">{audience.count ?? 0}</strong>
            <span style={{ color: INK }}>
              {fill(t(COMMUNICATION_REFONTE.cardAudienceCount), { n: audience.count ?? 0 })
                .replace(/^\d+\s*/, '') /* strip leading number, keep "destinataire(s)" */}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-1">
        <button
          type="button"
          onClick={() => onPrepare?.(template)}
          disabled={disabled || isAuto}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
        >
          <Send className="w-3.5 h-3.5" aria-hidden />
          {t(COMMUNICATION_REFONTE.cardPrepareSend)}
        </button>
        {onPreview && (
          <button
            type="button"
            onClick={() => onPreview(template)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden />
            {t(COMMUNICATION_REFONTE.cardOpenTemplate)}
          </button>
        )}
        {onDuplicate && (
          <button
            type="button"
            onClick={() => onDuplicate(template)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50"
            style={{ background: 'white', color: INK, border: `1px solid ${CREAM2}` }}
          >
            <Copy className="w-3.5 h-3.5" aria-hidden />
            {t(COMMUNICATION_REFONTE.cardDuplicate)}
          </button>
        )}
      </div>
    </motion.article>
  );
}
