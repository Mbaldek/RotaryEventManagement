// StageEmailModal — modale d'envoi par étape du funnel de compétition.
// ---------------------------------------------------------------------------
// Réutilise FunnelEditorModal (pattern Élysée trois tabs) pour préparer
// l'envoi d'un template lié à une phase du funnel :
//   1. Destinataires : audience preview live via previewAudience() (dry-run)
//   2. Modèle        : subject + body markdown éditables, langue switchable
//   3. Dry-run       : aperçu final tel qu'envoyé (EmailPreview)
//
// Envoi via sendBulk() avec l'audienceType + audienceFilter du template (qui
// peut être null si le template n'a pas d'audience structurée — l'admin doit
// alors passer par l'Email Studio en accordion).
//
// Props :
//   open          : bool
//   onClose       : (sent: bool) => void  — sent=true si envoi effectif
//   stageLabel    : string i18n résolu (eyebrow modale)
//   template      : {
//     id              : string,         // identifiant local pour debug
//     audienceType    : string | null,  // ex. 'club_candidates', 'session_jurys'...
//     audienceFilter  : object,         // base filter (edition_id, etc.)
//     statuses        : string[],       // statuts ciblés (UI display only)
//     subject         : { fr,en,de },   // template trilingue
//     body            : { fr,en,de },   // template trilingue (markdown léger)
//     manualOnly      : bool,           // si true, pas d'audience auto (free editor)
//   }
//   clubId        : string | null  — NULL = scope master
//   editionId     : string         — pour audit + log
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2, Send, CheckCircle2, AlertTriangle, Users, RotateCcw,
} from 'lucide-react';
import {
  NAVY, INK, MUTED, CREAM2, CREAM, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { sendBulk, previewAudience } from '@/lib/platform/bulk';
import FunnelEditorModal from '@/components/rsa/admin/platform/funnel/FunnelEditorModal';
import EmailPreview, { buildEmailHtml } from '@/components/rsa/admin/platform/comms/EmailPreview';
import { COMMUNICATION_REFONTE } from '../i18n';

// ── helpers ───────────────────────────────────────────────────────────────
function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_m, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}

function resolveLang(dict, lang) {
  if (!dict) return '';
  if (typeof dict === 'string') return dict;
  return dict[lang] || dict.fr || dict.en || '';
}

// ── Audience preview hook ─────────────────────────────────────────────────
function useStageAudience({ open, audienceType, audienceFilter, clubId }) {
  const [state, setState] = useState({
    loading: false, error: null, count: null, sample: [],
  });
  const filterKey = JSON.stringify(audienceFilter || {});

  useEffect(() => {
    if (!open) return undefined;
    if (!audienceType) {
      setState({ loading: false, error: null, count: null, sample: [] });
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
          setState({ loading: false, error: res?.error || 'audience_error', count: null, sample: [] });
          return;
        }
        setState({
          loading: false,
          error: null,
          count: typeof res.count === 'number' ? res.count : 0,
          sample: Array.isArray(res.sample) ? res.sample : [],
        });
      } catch (err) {
        if (aborted) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          count: null,
          sample: [],
        });
      }
    })();
    return () => { aborted = true; };
  }, [open, audienceType, filterKey, clubId]);

  return state;
}

// ── Confirm dialog ────────────────────────────────────────────────────────
function ConfirmDialog({ open, count, sending, onConfirm, onCancel, t }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,31,61,0.35)' }}
          onClick={onCancel}
        >
          <motion.div
            key="confirm-card"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="rounded-[4px] max-w-md w-full p-5"
            style={{ background: 'white', border: `1px solid ${CREAM2}` }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <h4
              className="text-[18px] mb-2"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {t(COMMUNICATION_REFONTE.modalConfirmTitle)}
            </h4>
            <p className="text-[13px]" style={{ color: INK }}>
              {fill(t(COMMUNICATION_REFONTE.modalConfirmBody), { n: count })}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
              >
                {t(COMMUNICATION_REFONTE.modalConfirmNo)}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={sending || count === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
                style={{ background: NAVY, color: 'white' }}
              >
                {sending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                {sending ? t(COMMUNICATION_REFONTE.modalSending) : t(COMMUNICATION_REFONTE.modalConfirmYes)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ tone, title, body, onClose }) {
  const ToneIcon = tone === 'ok' ? CheckCircle2 : tone === 'err' ? AlertTriangle : Users;
  const color    = tone === 'ok' ? '#1d6b4f' : tone === 'err' ? DANGER : NAVY;
  return (
    <div
      role="status"
      className="rounded-[4px] p-3 flex items-start gap-2 text-[12.5px] mb-3"
      style={{
        background: tone === 'ok' ? '#ecf1e5' : tone === 'err' ? '#f6e7e3' : '#eff1f6',
        border: `1px solid ${CREAM2}`,
        color,
      }}
    >
      <ToneIcon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium" style={{ color: NAVY }}>{title}</p>}
        {body && <p style={{ color: INK }}>{body}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] underline"
          style={{ color: INK }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Audience tab ──────────────────────────────────────────────────────────
function AudienceTab({ preview, template, t }) {
  const statuses = template?.statuses || [];
  return (
    <div className="space-y-4">
      <div>
        <h4
          className="text-[15px] mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMUNICATION_REFONTE.modalAudienceTitle)}
        </h4>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(COMMUNICATION_REFONTE.modalAudienceHint)}
        </p>
      </div>

      {!template?.audienceType ? (
        <p
          className="rounded-[4px] px-3 py-2 text-[12.5px]"
          style={{ background: '#f6efe0', border: `1px solid ${CREAM2}`, color: INK }}
        >
          {t(COMMUNICATION_REFONTE.modalNoAudienceTypeWarning)}
        </p>
      ) : (
        <div
          className="rounded-[4px] px-4 py-3 flex items-baseline gap-2"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          {preview.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
          ) : preview.error ? (
            <span style={{ color: DANGER }} className="text-[12.5px]">
              {t(COMMUNICATION_REFONTE.cardAudienceError)} — {preview.error}
            </span>
          ) : (
            <>
              <strong className="tabular-nums text-[22px]" style={{ fontFamily: SERIF }}>
                {preview.count ?? 0}
              </strong>
              <span style={{ color: INK }} className="text-[13px]">
                {t(COMMUNICATION_REFONTE.modalAudienceCount)}
              </span>
            </>
          )}
        </div>
      )}

      {template?.audienceType && preview.count === 0 && !preview.loading && !preview.error && (
        <p
          className="rounded-[4px] px-3 py-2 text-[12.5px]"
          style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}`, color: DANGER }}
        >
          {t(COMMUNICATION_REFONTE.modalAudienceEmpty)}
        </p>
      )}

      {preview.sample?.length > 0 && (
        <div>
          <p
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
            style={{ color: MUTED }}
          >
            {t(COMMUNICATION_REFONTE.modalAudienceSampleLabel)}
          </p>
          <ul
            className="rounded-[4px] p-3 text-[12.5px] font-mono space-y-1"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
          >
            {preview.sample.slice(0, 5).map((e) => <li key={e}>· {e}</li>)}
          </ul>
        </div>
      )}

      {statuses.length > 0 && (
        <div>
          <p
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
            style={{ color: MUTED }}
          >
            statuts ciblés
          </p>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium"
                style={{
                  background: '#eff1f6',
                  color: NAVY,
                  border: `1px solid ${CREAM2}`,
                  fontFamily: 'monospace',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Template tab ──────────────────────────────────────────────────────────
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

function TemplateTab({
  lang, setLang, subject, setSubject, body, setBody, onResetTemplate, t,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-[260px]">
          <FieldLabel htmlFor="stage-mail-lang">{t(COMMUNICATION_REFONTE.modalLangLabel)}</FieldLabel>
          <select
            id="stage-mail-lang"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onResetTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-[12px]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t(COMMUNICATION_REFONTE.modalResetTemplate)}
        </button>
      </div>

      <div>
        <FieldLabel htmlFor="stage-mail-subject">{t(COMMUNICATION_REFONTE.modalSubjectLabel)}</FieldLabel>
        <input
          id="stage-mail-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
        />
      </div>

      <div>
        <FieldLabel htmlFor="stage-mail-body">{t(COMMUNICATION_REFONTE.modalBodyLabel)}</FieldLabel>
        <textarea
          id="stage-mail-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] font-mono leading-relaxed"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
        />
        <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
          {t(COMMUNICATION_REFONTE.modalBodyHelper)}
        </p>
      </div>
    </div>
  );
}

// ── Dry-run tab ───────────────────────────────────────────────────────────
function DryRunTab({ subject, body, lang, t }) {
  return (
    <div className="space-y-3">
      <div>
        <h4
          className="text-[15px] mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMUNICATION_REFONTE.modalDryRunTitle)}
        </h4>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(COMMUNICATION_REFONTE.modalDryRunHint)}
        </p>
      </div>
      <div
        className="rounded-[4px] overflow-hidden"
        style={{ background: CREAM, border: `1px solid ${CREAM2}`, minHeight: 460 }}
      >
        <EmailPreview
          subject={subject || '—'}
          bodyMarkdown={body}
          lang={lang}
        />
      </div>
    </div>
  );
}

// ── Modale racine ─────────────────────────────────────────────────────────
export default function StageEmailModal({
  open,
  onClose,
  stageLabel = '',
  template,
  clubId = null,
  editionId,
}) {
  const { t, lang: uiLang } = useLang();

  const [tab, setTab] = useState('audience');
  const [lang, setLang] = useState(uiLang || 'fr');

  const initialSubject = useMemo(
    () => (template ? resolveLang(template.subject, uiLang || 'fr') : ''),
    [template, uiLang],
  );
  const initialBody = useMemo(
    () => (template ? resolveLang(template.body, uiLang || 'fr') : ''),
    [template, uiLang],
  );
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  // Build a stable filter that always carries the edition_id for audit/scoping.
  const audienceFilter = useMemo(() => ({
    ...(template?.audienceFilter || {}),
    ...(editionId ? { edition_id: editionId } : {}),
    ...(clubId ? { club_id: clubId } : {}),
  }), [template, editionId, clubId]);

  // Reset state on (re)open or template change.
  useEffect(() => {
    if (!open) return;
    setTab('audience');
    setLang(uiLang || 'fr');
    if (template) {
      setSubject(resolveLang(template.subject, uiLang || 'fr'));
      setBody(resolveLang(template.body, uiLang || 'fr'));
    } else {
      setSubject('');
      setBody('');
    }
    setSendResult(null);
    setConfirmOpen(false);
    setSending(false);
  }, [open, template, uiLang]);

  // When user switches language: replace subject/body ONLY if they still match
  // one of the localized template versions (i.e. user hasn't customised yet).
  useEffect(() => {
    if (!open || !template) return;
    const allSubjects = ['fr', 'en', 'de'].map((l) => resolveLang(template.subject, l));
    const allBodies = ['fr', 'en', 'de'].map((l) => resolveLang(template.body, l));
    setSubject((prev) => (allSubjects.includes(prev) ? resolveLang(template.subject, lang) : prev));
    setBody((prev) => (allBodies.includes(prev) ? resolveLang(template.body, lang) : prev));
  }, [lang, open, template]);

  const preview = useStageAudience({
    open,
    audienceType: template?.audienceType,
    audienceFilter,
    clubId,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const onResetTemplate = useCallback(() => {
    if (!template) return;
    setSubject(resolveLang(template.subject, lang));
    setBody(resolveLang(template.body, lang));
  }, [template, lang]);

  const count = preview.count ?? 0;

  const onAskSend = useCallback(() => {
    if (!template?.audienceType) return;
    if (preview.loading || count === 0) return;
    setSendResult(null);
    setConfirmOpen(true);
  }, [template, preview.loading, count]);

  const onConfirmSend = useCallback(async () => {
    setSending(true);
    setSendResult(null);
    const bodyHtml = buildEmailHtml({ subject, bodyMarkdown: body, lang });
    try {
      const res = await sendBulk({
        clubId: clubId ?? null,
        audienceType: template.audienceType,
        audienceFilter,
        subject,
        bodyHtml,
        dryRun: false,
      });
      setSending(false);
      setConfirmOpen(false);
      if (!res || res.ok === false) {
        setSendResult({
          tone: 'err',
          title: t(COMMUNICATION_REFONTE.modalSendFailed),
          body: res?.error || 'unknown_error',
        });
        return;
      }
      const tone = res.status === 'partial' ? 'info' : 'ok';
      const title = res.status === 'partial'
        ? t(COMMUNICATION_REFONTE.modalSendPartial)
        : t(COMMUNICATION_REFONTE.modalSendOk);
      const summary = fill(t(COMMUNICATION_REFONTE.modalSendSummary), {
        sent: res.sent ?? 0,
        total: res.total ?? 0,
      });
      setSendResult({ tone, title, body: summary });
      // Notify parent so it can invalidate history.
      setTimeout(() => onClose?.(true), 600);
    } catch (err) {
      setSending(false);
      setConfirmOpen(false);
      setSendResult({
        tone: 'err',
        title: t(COMMUNICATION_REFONTE.modalSendFailed),
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }, [audienceFilter, clubId, template, subject, body, lang, t, onClose]);

  const tabs = useMemo(() => [
    {
      id: 'audience',
      label: t(COMMUNICATION_REFONTE.modalTabAudience),
      render: () => (
        <>
          {sendResult && <Toast {...sendResult} onClose={() => setSendResult(null)} />}
          <AudienceTab preview={preview} template={template} t={t} />
        </>
      ),
    },
    {
      id: 'template',
      label: t(COMMUNICATION_REFONTE.modalTabTemplate),
      render: () => (
        <>
          {sendResult && <Toast {...sendResult} onClose={() => setSendResult(null)} />}
          <TemplateTab
            lang={lang}
            setLang={setLang}
            subject={subject}
            setSubject={setSubject}
            body={body}
            setBody={setBody}
            onResetTemplate={onResetTemplate}
            t={t}
          />
        </>
      ),
    },
    {
      id: 'dryrun',
      label: t(COMMUNICATION_REFONTE.modalTabDryRun),
      render: () => (
        <>
          {sendResult && <Toast {...sendResult} onClose={() => setSendResult(null)} />}
          <DryRunTab subject={subject} body={body} lang={lang} t={t} />
        </>
      ),
    },
  ], [t, preview, template, sendResult, lang, subject, body, onResetTemplate]);

  const sendCtaLabel = count > 0
    ? fill(t(COMMUNICATION_REFONTE.modalSendCta), { n: count })
    : t(COMMUNICATION_REFONTE.modalSendCtaZero);

  const sendDisabled = !template?.audienceType
    || preview.loading
    || !!preview.error
    || count === 0
    || !subject.trim()
    || !body.trim()
    || sending;

  const sendButton = (
    <button
      type="button"
      onClick={onAskSend}
      disabled={sendDisabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: NAVY,
        color: 'white',
        border: `1px solid ${NAVY}`,
      }}
    >
      <Send className="w-3.5 h-3.5" aria-hidden />
      {sendCtaLabel}
    </button>
  );

  const eyebrow = fill(t(COMMUNICATION_REFONTE.modalEyebrow), { stage: stageLabel });
  const title = template ? resolveLang(template.titleDict || {}, lang) || subject : '';

  return (
    <>
      <FunnelEditorModal
        open={open}
        onClose={() => onClose?.(false)}
        title={title || subject || ''}
        eyebrow={eyebrow}
        tabs={tabs}
        activeTab={tab}
        onTabChange={setTab}
        status="idle"
        destructiveSlot={sendButton}
        width="wide"
      />

      <ConfirmDialog
        open={confirmOpen}
        count={count}
        sending={sending}
        onConfirm={onConfirmSend}
        onCancel={() => !sending && setConfirmOpen(false)}
        t={t}
      />
    </>
  );
}
