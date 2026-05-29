// DiffusionSection — bloc « URLs à diffuser » du PilotageTab (équipe B step 6).
//
// Surfaces les 3 URLs publiques que le master_admin doit pousser au monde dès
// qu'une compétition est prête à recevoir des candidatures :
//   a) Candidat startup     /Candidater?edition=<id>
//   b) Juré (self-apply)    /DevenirJury?edition=<id>
//   c) Vue publique         /Concours[?edition=<id>]   (param optionnel — la
//                           route /Concours sélectionne l'édition active
//                           courante côté serveur si non précisé)
//
// Chaque card propose : copie clipboard (toast feedback), QR code (modal
// rendered client-side via qrcode.react, déjà dans le bundle), et un lien
// "ouvrir dans un nouvel onglet" (target=_blank + rel=noopener).
//
// Design : tokens Élysée (CREAM2 hairlines, NAVY text, GOLD accents) — aligné
// sur les autres sections du master cockpit.
//
// TODO V3.1 — Compteur de clics : la plateforme n'expose pas encore de
// tracking côté backend. Le label est i18n-prêt (DIFFUSION.clicksLabel), il
// suffira de wirer un counter via TanStack Query quand l'endpoint existera.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Users, Globe, Copy, ExternalLink, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { useLang } from '@/lib/platform/i18n';
import { NAVY, GOLD, CREAM, CREAM2, INK, MUTED, SERIF } from '@/components/design/tokens';
import { buildPublicUrl } from '@/lib/platform/buildPublicUrl';

import { DIFFUSION } from '../i18n';

// ── QR Modal ────────────────────────────────────────────────────────────────
function QrModal({ open, onClose, title, url, t }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t(DIFFUSION.qrModalTitle)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,31,61,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CREAM,
          border: `1px solid ${CREAM2}`,
          borderRadius: 8,
          maxWidth: 480,
          width: '100%',
          maxHeight: '92vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(15,31,61,0.25)',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${CREAM2}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: GOLD,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {t(DIFFUSION.qrButton)}
            </div>
            <h2
              style={{
                fontFamily: SERIF,
                fontSize: 20,
                fontWeight: 600,
                color: NAVY,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: 12, color: INK, marginTop: 6, lineHeight: 1.45 }}>
              {t(DIFFUSION.qrModalHint)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(DIFFUSION.closeModal)}
            style={{
              background: 'white',
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X aria-hidden="true" style={{ width: 16, height: 16, color: MUTED }} />
          </button>
        </div>

        <div
          style={{
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              padding: 18,
              background: 'white',
              border: `1px solid ${CREAM2}`,
              borderRadius: 6,
              boxShadow: '0 4px 18px rgba(15,31,61,0.06)',
            }}
          >
            <QRCodeSVG
              value={url}
              size={232}
              level="M"
              fgColor={NAVY}
              bgColor="white"
              marginSize={0}
            />
          </div>
          <code
            style={{
              width: '100%',
              background: 'white',
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
              padding: '9px 12px',
              fontSize: 12,
              color: NAVY,
              fontFamily: "'JetBrains Mono', monospace",
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {url}
          </code>
        </div>
      </div>
    </div>
  );
}

// ── Card single ─────────────────────────────────────────────────────────────
function DiffusionCard({ icon: Icon, eyebrow, title, description, url, inputId, t }) {
  const [qrOpen, setQrOpen] = useState(false);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t(DIFFUSION.copySuccess));
    } catch {
      toast.error(t(DIFFUSION.copyError));
    }
  }, [url, t]);

  return (
    <article
      role="region"
      aria-label={`${title} — ${t(DIFFUSION.ariaCardRegion)}`}
      style={{
        background: CREAM2,
        border: `1px solid ${CREAM2}`,
        borderRadius: 8,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 6,
            background: 'white',
            border: `1px solid ${CREAM}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon aria-hidden="true" style={{ width: 18, height: 18, color: GOLD }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: GOLD,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
          <h3
            style={{
              fontFamily: SERIF,
              fontSize: 18,
              fontWeight: 600,
              color: NAVY,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: 12.5,
              color: INK,
              marginTop: 6,
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
          style={{ color: MUTED }}
        >
          {t(DIFFUSION.urlLabel)}
        </label>
        <input
          id={inputId}
          type="text"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
          aria-label={`${t(DIFFUSION.urlLabel)} — ${title}`}
          style={{
            width: '100%',
            background: 'white',
            border: `1px solid ${CREAM}`,
            borderRadius: 4,
            padding: '8px 10px',
            fontSize: 12,
            color: NAVY,
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={copyUrl}
          aria-label={`${t(DIFFUSION.copyButton)} — ${title}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: NAVY,
            color: 'white',
            border: `1px solid ${NAVY}`,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Copy aria-hidden="true" style={{ width: 14, height: 14 }} />
          {t(DIFFUSION.copyButton)}
        </button>

        <button
          type="button"
          onClick={() => setQrOpen(true)}
          aria-label={`${t(DIFFUSION.qrButton)} — ${title}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'white',
            color: NAVY,
            border: `1px solid ${CREAM}`,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <QrCode aria-hidden="true" style={{ width: 14, height: 14, color: GOLD }} />
          {t(DIFFUSION.qrButton)}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t(DIFFUSION.openTab)} — ${title}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'white',
            color: NAVY,
            border: `1px solid ${CREAM}`,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <ExternalLink aria-hidden="true" style={{ width: 14, height: 14, color: MUTED }} />
          {t(DIFFUSION.openTab)}
        </a>
      </div>

      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} title={title} url={url} t={t} />
    </article>
  );
}

// ── Public component ────────────────────────────────────────────────────────
export default function DiffusionSection({ edition }) {
  const { t } = useLang();

  const editionId = edition?.id ?? null;

  // URLs construites une seule fois par edition.id (mémoïsées pour éviter de
  // re-rendre les cards à chaque tick).
  const urls = useMemo(
    () => ({
      candidat: buildPublicUrl('/Candidater', { edition: editionId }),
      jury: buildPublicUrl('/DevenirJury', { edition: editionId }),
      // Vue publique : l'edition param est forward-compat (la route /Concours
      // résout l'édition active courante côté serveur), mais on l'envoie quand
      // même quand on en a un pour permettre un lien stable inter-éditions.
      public: buildPublicUrl('/Concours', { edition: editionId }),
    }),
    [editionId]
  );

  return (
    <section
      aria-label={t(DIFFUSION.sectionTitle)}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      {/* Hairline gold separator + headline */}
      <div>
        <div
          aria-hidden="true"
          style={{ width: 48, height: 1, background: GOLD, marginBottom: 14 }}
        />
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: GOLD,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {t(DIFFUSION.sectionEyebrow)}
        </div>
        <h2
          style={{
            fontFamily: SERIF,
            fontSize: 22,
            fontWeight: 600,
            color: NAVY,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {t(DIFFUSION.sectionTitle)}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: INK,
            marginTop: 6,
            marginBottom: 0,
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          {t(DIFFUSION.sectionLede)}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DiffusionCard
          icon={Sparkles}
          eyebrow={t(DIFFUSION.sectionEyebrow)}
          title={t(DIFFUSION.candidatTitle)}
          description={t(DIFFUSION.candidatDesc)}
          url={urls.candidat}
          inputId="diffusion-url-candidater"
          t={t}
        />
        <DiffusionCard
          icon={Users}
          eyebrow={t(DIFFUSION.sectionEyebrow)}
          title={t(DIFFUSION.juryTitle)}
          description={t(DIFFUSION.juryDesc)}
          url={urls.jury}
          inputId="diffusion-url-jury"
          t={t}
        />
        <DiffusionCard
          icon={Globe}
          eyebrow={t(DIFFUSION.sectionEyebrow)}
          title={t(DIFFUSION.publicTitle)}
          description={t(DIFFUSION.publicDesc)}
          url={urls.public}
          inputId="diffusion-url-public"
          t={t}
        />
      </div>
    </section>
  );
}
