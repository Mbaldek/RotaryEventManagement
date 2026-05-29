// src/components/rsa/communicate/CommunicateModal.jsx
// ---------------------------------------------------------------------------
// V3 Vague 2 — Feature B : CTA "Communiquer" pré-câblé.
//
// Modale Élysée réutilisant FunnelEditorModal (cf. funnel/FunnelEditorModal.jsx).
// Deux tabs :
//   1. "Destinataires" — preview audience (count, sample, statuts ciblés)
//   2. "Message"       — sujet + corps markdown éditables + aperçu Élysée live
//
// Footer : statut autosave (idle), bouton "Envoyer à N candidat·e·s" navy à
// droite. Une confirmation in-modal s'affiche au clic (overlay pop-up sobre)
// avant l'envoi définitif via sendBulk → audience_type='communicate_unselected'
// ou 'communicate_selected'.
//
// Props :
//   open       : boolean
//   kind       : 'unselected' | 'selected'
//   editionId  : string (requis pour résoudre l'audience)
//   clubId     : string|null  (NULL = scope master)
//   onClose    : (sent: boolean) => void  (sent=true si un envoi a eu lieu)
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2, Send, CheckCircle2, AlertTriangle, Users, RotateCcw,
} from 'lucide-react';
import {
  GOLD, NAVY, INK, MUTED, CREAM2, CREAM, SERIF, EASE,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { supabase } from '@/lib/supabase';
import { sendBulk } from '@/lib/platform/bulk';
import FunnelEditorModal from '@/components/rsa/admin/platform/funnel/FunnelEditorModal';
import EmailPreview, { buildEmailHtml } from '@/components/rsa/admin/platform/comms/EmailPreview';
import {
  COMMUNICATE_MODAL,
  COMMUNICATE_UI,
  getTemplate,
  audienceTypeForKind,
  STATUSES_BY_KIND,
} from './i18n';

// ── Hooks utilitaires ─────────────────────────────────────────────────────

// Audience preview : recharge dès qu'on ouvre la modale (et au refresh).
function useAudiencePreview({ open, editionId, clubId, kind }) {
  const [state, setState] = useState({
    loading: false, error: null, count: null, sample: [],
  });

  useEffect(() => {
    if (!open || !editionId) return undefined;
    let aborted = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const { data, error } = await supabase.rpc('rsa_communicate_audience', {
          p_edition_id:    editionId,
          p_audience_kind: kind,
          p_dry_run:       true,
          p_club_id:       clubId || null,
        });
        if (aborted) return;
        if (error) {
          setState({ loading: false, error: error.message || 'rpc_error', count: null, sample: [] });
          return;
        }
        setState({
          loading: false,
          error:   null,
          count:   typeof data?.count === 'number' ? data.count : 0,
          sample:  Array.isArray(data?.sample) ? data.sample : [],
        });
      } catch (err) {
        if (aborted) return;
        setState({
          loading: false,
          error:   err instanceof Error ? err.message : String(err),
          count:   null,
          sample:  [],
        });
      }
    })();
    return () => { aborted = true; };
  }, [open, editionId, clubId, kind]);

  return state;
}

// ── Sous-composants UI ────────────────────────────────────────────────────

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

function ConfirmDialog({ open, count, scopeLabel, sending, onConfirm, onCancel, t }) {
  const filled = (template, vars) =>
    String(template).replace(/\{(\w+)\}/g, (_m, k) => (vars && vars[k] != null ? vars[k] : ''));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          // z-[60] pour passer au-dessus du z-50 de FunnelEditorModal
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
              {t(COMMUNICATE_MODAL.confirmTitle)}
            </h4>
            <p className="text-[13px]" style={{ color: INK }}>
              {filled(t(COMMUNICATE_MODAL.confirmBody), { n: count, scope: scopeLabel })}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12.5px]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
              >
                {t(COMMUNICATE_MODAL.confirmNo)}
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
                {sending ? t(COMMUNICATE_MODAL.sending) : t(COMMUNICATE_MODAL.confirmYes)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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

// ── Vue Audience (tab 1) ──────────────────────────────────────────────────
function AudienceView({ preview, kind, t }) {
  const statuses = STATUSES_BY_KIND[kind] || [];
  return (
    <div className="space-y-4">
      <div>
        <h4
          className="text-[15px] mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMUNICATE_MODAL.audienceSummaryTitle)}
        </h4>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(COMMUNICATE_MODAL.audienceSummaryHint)}
        </p>
      </div>

      {/* Count */}
      <div
        className="rounded-[4px] px-4 py-3 flex items-baseline gap-2"
        style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: NAVY }}
      >
        {preview.loading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} />
        ) : preview.error ? (
          <span style={{ color: DANGER }} className="text-[12.5px]">
            {t(COMMUNICATE_UI.countError)} — {preview.error}
          </span>
        ) : (
          <>
            <strong className="tabular-nums text-[22px]" style={{ fontFamily: SERIF }}>
              {preview.count ?? 0}
            </strong>
            <span style={{ color: INK }} className="text-[13px]">
              {t(COMMUNICATE_MODAL.audienceCountLabel)}
            </span>
          </>
        )}
      </div>

      {preview.count === 0 && !preview.loading && !preview.error && (
        <p
          className="rounded-[4px] px-3 py-2 text-[12.5px]"
          style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}`, color: DANGER }}
        >
          {t(COMMUNICATE_MODAL.audienceEmpty)}
        </p>
      )}

      {/* Sample */}
      {preview.sample?.length > 0 && (
        <div>
          <p
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
            style={{ color: MUTED }}
          >
            {t(COMMUNICATE_MODAL.audienceSampleLabel)}
          </p>
          <ul
            className="rounded-[4px] p-3 text-[12.5px] font-mono space-y-1"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
          >
            {preview.sample.map((e) => <li key={e}>· {e}</li>)}
          </ul>
        </div>
      )}

      {/* Statuses */}
      <div>
        <p
          className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
          style={{ color: MUTED }}
        >
          {t(COMMUNICATE_MODAL.audienceStatusesLabel)}
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
    </div>
  );
}

// ── Vue Template (tab 2) ──────────────────────────────────────────────────
function TemplateView({
  lang, setLang, subject, setSubject, body, setBody, onResetTemplate, t,
}) {
  // Note : EmailPreview rebuild son HTML en interne via useMemo. On ne le pré-
  // calcule pas ici pour éviter une double mémoïsation et garder la subject-
  // line réactive sans re-render coûteux.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Form */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <FieldLabel htmlFor="communicate-lang">{t(COMMUNICATE_MODAL.langLabel)}</FieldLabel>
            <select
              id="communicate-lang"
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
            {t(COMMUNICATE_MODAL.resetTemplate)}
          </button>
        </div>

        <div>
          <FieldLabel htmlFor="communicate-subject">{t(COMMUNICATE_MODAL.subjectLabel)}</FieldLabel>
          <input
            id="communicate-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
          />
        </div>

        <div>
          <FieldLabel htmlFor="communicate-body">{t(COMMUNICATE_MODAL.bodyLabel)}</FieldLabel>
          <textarea
            id="communicate-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] font-mono leading-relaxed"
            style={{ background: 'white', border: `1px solid ${CREAM2}`, color: INK }}
          />
          <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
            {t(COMMUNICATE_MODAL.bodyHelper)}
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:col-span-2">
        <p
          className="uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
          style={{ color: GOLD }}
        >
          {t(COMMUNICATE_MODAL.previewTitle)}
        </p>
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
    </div>
  );
}

// ── Modale racine ─────────────────────────────────────────────────────────
export default function CommunicateModal({
  open,
  kind = 'unselected',
  editionId,
  clubId = null,
  onClose,
}) {
  const { t, lang: uiLang } = useLang();

  // URL-less local tab state (la modale est imbriquée).
  const [tab, setTab] = useState('audience');

  // Langue de l'email — initialisée sur la langue UI.
  const [lang, setLang] = useState(uiLang || 'fr');

  // Sujet + corps : hydratés depuis le template pré-rédigé.
  const initial = useMemo(() => getTemplate(kind, lang), [kind, lang]);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody]       = useState(initial.body);

  // Quand on (re)ouvre la modale ou qu'on change de kind, on REPART du template.
  useEffect(() => {
    if (!open) return;
    setTab('audience');
    setLang(uiLang || 'fr');
    const tpl = getTemplate(kind, uiLang || 'fr');
    setSubject(tpl.subject);
    setBody(tpl.body);
    setSendResult(null);
    setConfirmOpen(false);
    setSending(false);
  }, [open, kind, uiLang]);

  // Quand on change la langue manuellement, on remplace le contenu uniquement
  // si l'utilisateur n'a PAS encore édité le brouillon (i.e. le sujet/body
  // matche encore le template courant). Sinon on laisse intact.
  useEffect(() => {
    if (!open) return;
    const last = getTemplate(kind, lang);
    setSubject((prev) => {
      // si l'utilisateur tape, on respecte sa saisie ; sinon (équivalent à un
      // template précédent ou vide) on remplit.
      if (!prev) return last.subject;
      // Heuristique simple : si le sujet correspond à l'un des sujets template
      // (fr/en/de) du kind courant, on remplace par la nouvelle langue.
      const allSubjects = ['fr', 'en', 'de'].map((l) => getTemplate(kind, l).subject);
      if (allSubjects.includes(prev)) return last.subject;
      return prev;
    });
    setBody((prev) => {
      if (!prev) return last.body;
      const allBodies = ['fr', 'en', 'de'].map((l) => getTemplate(kind, l).body);
      if (allBodies.includes(prev)) return last.body;
      return prev;
    });
  }, [lang, open, kind]);

  // Audience preview
  const preview = useAudiencePreview({ open, editionId, clubId, kind });

  // Envoi
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { tone, title, body }

  const onResetTemplate = useCallback(() => {
    const tpl = getTemplate(kind, lang);
    setSubject(tpl.subject);
    setBody(tpl.body);
  }, [kind, lang]);

  const onAskSend = useCallback(() => {
    if (preview.loading || (preview.count ?? 0) === 0) return;
    setSendResult(null);
    setConfirmOpen(true);
  }, [preview.loading, preview.count]);

  const onConfirmSend = useCallback(async () => {
    setSending(true);
    setSendResult(null);
    const bodyHtml = buildEmailHtml({ subject, bodyMarkdown: body, lang });
    try {
      const res = await sendBulk({
        clubId: clubId || null,
        audienceType: audienceTypeForKind(kind),
        audienceFilter: {
          edition_id: editionId,
          ...(clubId ? { club_id: clubId } : {}),
        },
        subject,
        bodyHtml,
        dryRun: false,
      });
      setSending(false);
      setConfirmOpen(false);
      if (!res || res.ok === false) {
        setSendResult({
          tone: 'err',
          title: t(COMMUNICATE_MODAL.sendFailed),
          body: res?.error || 'unknown_error',
        });
        return;
      }
      const tone = res.status === 'partial' ? 'info' : 'ok';
      const title = res.status === 'partial'
        ? t(COMMUNICATE_MODAL.sendPartial)
        : t(COMMUNICATE_MODAL.sendOk);
      const summary = String(t(COMMUNICATE_MODAL.recipientsSummary))
        .replace('{sent}', String(res.sent ?? 0))
        .replace('{total}', String(res.total ?? 0));
      setSendResult({ tone, title, body: summary });
    } catch (err) {
      setSending(false);
      setConfirmOpen(false);
      setSendResult({
        tone: 'err',
        title: t(COMMUNICATE_MODAL.sendFailed),
        body: err instanceof Error ? err.message : String(err),
      });
    }
  }, [clubId, editionId, kind, subject, body, lang, t]);

  // Tabs definitions pour FunnelEditorModal.
  const tabs = useMemo(() => [
    {
      id: 'audience',
      label: t(COMMUNICATE_MODAL.tabAudience),
      render: () => (
        <>
          {sendResult && (
            <Toast {...sendResult} onClose={() => setSendResult(null)} />
          )}
          <AudienceView preview={preview} kind={kind} t={t} />
        </>
      ),
    },
    {
      id: 'template',
      label: t(COMMUNICATE_MODAL.tabTemplate),
      render: () => (
        <>
          {sendResult && (
            <Toast {...sendResult} onClose={() => setSendResult(null)} />
          )}
          <TemplateView
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
  ], [t, preview, kind, sendResult, lang, subject, body, onResetTemplate]);

  const scopeLabel = clubId
    ? t(COMMUNICATE_UI.scopeClub)
    : t(COMMUNICATE_UI.scopeMaster);

  const count = preview.count ?? 0;
  const sendCtaLabel = count > 0
    ? String(t(COMMUNICATE_MODAL.sendCta)).replace('{n}', String(count))
    : t(COMMUNICATE_MODAL.sendCtaZero);

  const sendDisabled = preview.loading
    || !!preview.error
    || count === 0
    || !subject.trim()
    || !body.trim()
    || sending;

  // Footer "destructive slot" (gauche) — on le détourne pour mettre le bouton
  // d'envoi NAVY à gauche, comme un CTA primaire (le footer Funnel place
  // déjà "Fermer" à droite + statut autosave).
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

  const isThanks = kind === 'unselected';

  return (
    <>
      <FunnelEditorModal
        open={open}
        onClose={() => onClose?.(false)}
        title={t(isThanks ? COMMUNICATE_MODAL.modalTitleThanks : COMMUNICATE_MODAL.modalTitleAnnounce)}
        eyebrow={t(isThanks ? COMMUNICATE_MODAL.modalEyebrowThanks : COMMUNICATE_MODAL.modalEyebrowAnnounce)}
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
        scopeLabel={scopeLabel}
        sending={sending}
        onConfirm={onConfirmSend}
        onCancel={() => !sending && setConfirmOpen(false)}
        t={t}
      />
    </>
  );
}
