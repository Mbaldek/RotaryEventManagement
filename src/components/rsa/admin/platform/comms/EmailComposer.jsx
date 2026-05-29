// EmailComposer — composer + preview live (Module 9 Email Studio).
//
// Split layout 60/40 (form gauche, preview droite) — preview en bas sur mobile.
// Workflow :
//   1. l'utilisateur tape subject + body (markdown light) + choisit audience
//   2. clic "Aperçu envoi" → dry_run send-bulk → modale count + 3 destinataires
//   3. clic "Envoyer maintenant" :
//        - si recipients > 50 : confirme typé "ENVOYER" (FR) / "SEND" (EN/DE)
//        - sinon : envoie direct
//   4. toast résultat (sent/partial/failed) + invalidate history
//
// La langue choisie (lang) pilote le footer/signature du rendu Élysée, pas la
// langue de l'UI (qui suit useLang() global). Permet à un FR admin d'envoyer
// un email en EN à un juré allemand sans switcher l'UI.

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Loader2, Eye, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { CREAM2, NAVY, INK, MUTED, GOLD, SERIF, EASE, TINT_ADMIN } from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { usePlatformAuth } from '@/lib/platform/auth';
import { COMMS_COMPOSER, COMMS_UI } from './i18n';
import AudienceSelector from './AudienceSelector';
import EmailPreview, { buildEmailHtml } from './EmailPreview';
import { sendBulk } from '@/lib/platform/bulk';
import { useInvalidateSends, useSaveTemplate } from './useComms';

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

function Toast({ tone = 'info', title, body, onClose }) {
  const ToneIcon = tone === 'ok' ? CheckCircle2 : tone === 'err' ? AlertTriangle : Eye;
  const color = tone === 'ok' ? '#1d6b4f' : tone === 'err' ? DANGER : NAVY;
  return (
    <div
      role="status"
      className="rounded-[4px] p-3 flex items-start gap-2 text-[12.5px]"
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

// Modale preview destinataires
function RecipientsPreviewModal({ open, onClose, count, sample, onConfirmSend, sending, t }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,31,61,0.45)' }}
          onClick={onClose}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="rounded-[4px] max-w-md w-full p-5"
            style={{ background: 'white', border: `1px solid ${CREAM2}` }}
            onClick={(e) => e.stopPropagation()}
          >
        <h4 className="text-[16px] mb-2" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMMS_COMPOSER.recipientsPreviewTitle)}
        </h4>
        <p className="text-[12.5px]" style={{ color: INK }}>
          {t(COMMS_COMPOSER.recipientsPreviewBody)}
        </p>
        <div
          className="mt-3 rounded-[4px] p-3 flex items-baseline gap-2 text-[13px]"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}`, color: NAVY }}
        >
          <strong className="tabular-nums text-[18px]">{count}</strong>
          <span style={{ color: INK }}>{t(COMMS_COMPOSER.recipients)}</span>
        </div>
        {sample?.length > 0 && (
          <div className="mt-3">
            <p className="uppercase tracking-[0.14em] text-[10.5px] mb-1" style={{ color: MUTED }}>
              {t(COMMS_COMPOSER.recipientsSample)}
            </p>
            <ul className="text-[12px] font-mono" style={{ color: INK }}>
              {sample.map((e) => <li key={e}>· {e}</li>)}
            </ul>
          </div>
        )}
        {count === 0 && (
          <p className="mt-3 text-[12px]" style={{ color: DANGER }}>
            {t(COMMS_COMPOSER.noRecipients)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
            style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
          >
            {t(COMMS_UI.close)}
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={onConfirmSend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? t(COMMS_COMPOSER.sending) : t(COMMS_COMPOSER.send)}
            </button>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function EmailComposer({ clubId, editionId = null, initialDraft, onAfterSend }) {
  const { t, lang: uiLang } = useLang();
  const { isMasterAdmin } = usePlatformAuth();
  const invalidateSends = useInvalidateSends(clubId);
  const saveTemplate = useSaveTemplate(clubId);

  // ── form state ──
  const [subject, setSubject]   = useState(initialDraft?.subject || '');
  const [body, setBody]         = useState(initialDraft?.body || '');
  const [emailLang, setEmailLang] = useState(initialDraft?.lang || uiLang || 'fr');
  const [audience, setAudience] = useState({
    audienceType: initialDraft?.audienceType || '',
    audienceFilter: initialDraft?.audienceFilter || (clubId ? { club_id: clubId } : {}),
  });

  // Hydrate depuis un template inséré après mount.
  useEffect(() => {
    if (!initialDraft) return;
    setSubject(initialDraft.subject || '');
    setBody(initialDraft.body || '');
    if (initialDraft.lang) setEmailLang(initialDraft.lang);
    if (initialDraft.audienceType) {
      setAudience({
        audienceType: initialDraft.audienceType,
        audienceFilter: initialDraft.audienceFilter || (clubId ? { club_id: clubId } : {}),
      });
    }
  }, [initialDraft, clubId]);

  // ── modale recipients ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewData, setPreviewData] = useState({ count: 0, sample: [] });

  // ── confirmation typée ──
  const [typedConfirm, setTypedConfirm] = useState('');
  const [force, setForce] = useState(false);
  const requireTypedConfirm = previewData.count > 50;
  const expectedToken = emailLang === 'fr'
    ? COMMS_COMPOSER.confirmTypedTokenFr
    : emailLang === 'de'
      ? COMMS_COMPOSER.confirmTypedTokenDe
      : COMMS_COMPOSER.confirmTypedTokenEn;

  // ── send ──
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  // Save-as-template form (collapsed by default)
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // bodyHtml dérivé : mémoïsé pour ne pas re-render le iframe à chaque keystroke.
  const bodyHtml = useMemo(
    () => buildEmailHtml({ subject, bodyMarkdown: body, lang: emailLang }),
    [subject, body, emailLang],
  );

  function clearForm() {
    setSubject('');
    setBody('');
    setTypedConfirm('');
    setPreviewData({ count: 0, sample: [] });
  }

  async function onPreviewSend() {
    setToast(null);
    if (!subject.trim() || !body.trim() || !audience.audienceType) {
      setToast({ tone: 'err', title: t(COMMS_UI.loadError), body: 'subject + body + audience' });
      return;
    }
    setPreviewBusy(true);
    try {
      const res = await sendBulk({
        clubId,
        audienceType: audience.audienceType,
        audienceFilter: audience.audienceFilter,
        subject,
        bodyHtml,
        dryRun: true,
      });
      setPreviewBusy(false);
      if (!res.ok) {
        setToast({ tone: 'err', title: t(COMMS_UI.loadError), body: res.error });
        return;
      }
      setPreviewData({ count: res.count || 0, sample: res.sample || [] });
      setPreviewOpen(true);
      setTypedConfirm('');
    } catch (err) {
      setPreviewBusy(false);
      setToast({ tone: 'err', title: t(COMMS_UI.loadError), body: err?.message || String(err) });
    }
  }

  async function onConfirmSend() {
    if (requireTypedConfirm && typedConfirm !== expectedToken) {
      // Le bouton est désactivé, garde défensive.
      return;
    }
    setSending(true);
    setToast(null);
    try {
      const res = await sendBulk({
        clubId,
        audienceType: audience.audienceType,
        audienceFilter: audience.audienceFilter,
        subject,
        bodyHtml,
        dryRun: false,
        force,
      });
      setSending(false);
      setPreviewOpen(false);
      if (!res.ok) {
        setToast({ tone: 'err', title: t(COMMS_COMPOSER.sendFailed), body: res.error });
        return;
      }
      const tone = res.status === 'partial' ? 'info' : 'ok';
      const title = res.status === 'partial'
        ? t(COMMS_COMPOSER.sendPartial)
        : t(COMMS_COMPOSER.sendOk);
      setToast({
        tone,
        title,
        body: `${res.sent}/${res.total} ${t(COMMS_COMPOSER.recipients)}`,
      });
      invalidateSends();
      onAfterSend?.(res);
      // Garde le brouillon (utilisateur peut vouloir resender / retoucher).
    } catch (err) {
      setSending(false);
      setToast({ tone: 'err', title: t(COMMS_COMPOSER.sendFailed), body: err?.message || String(err) });
    }
  }

  async function onSaveTemplate() {
    if (!templateName.trim() || !subject.trim() || !body.trim() || !audience.audienceType) {
      setToast({ tone: 'err', title: t(COMMS_UI.loadError), body: 'name + subject + body + audience' });
      return;
    }
    try {
      await saveTemplate.mutateAsync({
        id: null,
        name: templateName.trim(),
        subject,
        bodyHtml: body, // on stocke le MARKDOWN brut comme body_html — convention M9
        audienceType: audience.audienceType,
        lang: emailLang,
      });
      setShowTemplateForm(false);
      setTemplateName('');
      setToast({ tone: 'ok', title: t(COMMS_UI.saved) });
    } catch (err) {
      setToast({ tone: 'err', title: t(COMMS_UI.loadError), body: err?.message || String(err) });
    }
  }

  return (
    <section className="space-y-4">
      {toast && (
        <Toast {...toast} onClose={() => setToast(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Form (60 %) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Audience */}
          <div
            className="rounded-[4px] p-4"
            style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: GOLD }}>
                {t(COMMS_COMPOSER.audienceLabel)}
              </span>
            </div>
            <AudienceSelector
              clubId={clubId}
              editionId={editionId}
              isMasterAdmin={isMasterAdmin}
              value={audience}
              onChange={setAudience}
            />
          </div>

          {/* Subject */}
          <div>
            <FieldLabel htmlFor="email-subject">{t(COMMS_COMPOSER.subjectLabel)}</FieldLabel>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t(COMMS_COMPOSER.subjectPlaceholder)}
              className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            />
          </div>

          {/* Lang */}
          <div>
            <FieldLabel htmlFor="email-lang">{t(COMMS_COMPOSER.langLabel)}</FieldLabel>
            <select
              id="email-lang"
              value={emailLang}
              onChange={(e) => setEmailLang(e.target.value)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          {/* Body */}
          <div>
            <FieldLabel htmlFor="email-body">{t(COMMS_COMPOSER.bodyLabel)}</FieldLabel>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t(COMMS_COMPOSER.bodyPlaceholder)}
              rows={14}
              className="w-full text-[14px] rounded-[4px] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] font-mono leading-relaxed"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: INK }}
            />
            <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
              {t(COMMS_COMPOSER.bodyHelper)}
            </p>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPreviewSend}
              disabled={previewBusy || !subject.trim() || !body.trim() || !audience.audienceType}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
            >
              {previewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {t(COMMS_COMPOSER.previewSend)}
            </button>

            <button
              type="button"
              onClick={() => setShowTemplateForm((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12.5px]"
              style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: INK }}
            >
              <FileText className="w-4 h-4" />
              {t(COMMS_COMPOSER.saveAsTemplate)}
            </button>

            <div className="ml-auto" />

            <button
              type="button"
              onClick={clearForm}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(COMMS_UI.cancel)}
            </button>
          </div>

          {/* Save-as-template inline form */}
          {showTemplateForm && (
            <div
              className="rounded-[4px] p-3"
              style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
            >
              <FieldLabel htmlFor="template-name">{t(COMMS_COMPOSER.saveTemplateName)}</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <input
                  id="template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1 min-w-[200px] text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                  style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
                />
                <button
                  type="button"
                  onClick={onSaveTemplate}
                  disabled={saveTemplate.isPending || !templateName.trim()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
                  style={{ background: NAVY, color: 'white' }}
                >
                  {saveTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t(COMMS_UI.save)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview (40 %) */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="uppercase tracking-[0.14em] text-[10.5px]"
              style={{ color: GOLD }}
            >
              {t(COMMS_COMPOSER.preview)}
            </span>
          </div>
          <div
            className="rounded-[4px] overflow-hidden"
            style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, minHeight: 540 }}
          >
            <EmailPreview subject={subject || '—'} bodyMarkdown={body} lang={emailLang} />
          </div>
        </div>
      </div>

      <RecipientsPreviewModal
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setTypedConfirm(''); }}
        count={previewData.count}
        sample={previewData.sample}
        sending={sending}
        onConfirmSend={requireTypedConfirm ? undefined : onConfirmSend}
        t={t}
      />

      {/* Typed confirmation panel (in-modal would be cramped — we show it inline
          after the preview is open and the count > 50). */}
      {previewOpen && requireTypedConfirm && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[60] max-w-md mx-auto rounded-[4px] p-4"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, boxShadow: '0 12px 30px rgba(15,31,61,0.18)' }}
        >
          <p className="text-[13px] font-medium" style={{ color: NAVY }}>
            {t(COMMS_COMPOSER.confirmTypedTitle)}
          </p>
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {t(COMMS_COMPOSER.confirmTypedBody)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder={expectedToken}
              className="flex-1 text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            <button
              type="button"
              onClick={onConfirmSend}
              disabled={sending || typedConfirm !== expectedToken}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? t(COMMS_COMPOSER.sending) : t(COMMS_COMPOSER.send)}
            </button>
          </div>
          {isMasterAdmin && previewData.count > 100 && (
            <label className="mt-2 flex items-center gap-2 text-[11.5px]" style={{ color: INK }}>
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              {t(COMMS_COMPOSER.forceLabel)}
            </label>
          )}
        </div>
      )}
    </section>
  );
}
