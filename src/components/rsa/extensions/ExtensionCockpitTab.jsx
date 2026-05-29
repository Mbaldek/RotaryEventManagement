// ExtensionCockpitTab — V3.0 Vague 4.
//
// Rend une extension kind='cockpit_tab' dans un iframe sandbox STRICT.
// Deux modes (validés par schemas.js) :
//   - iframeUrl : <iframe src={https URL} sandbox="allow-scripts allow-same-origin">
//   - html      : <iframe srcdoc={sanitized HTML} sandbox="allow-scripts">
//
// Sécurité :
//   - sandbox="allow-scripts allow-same-origin" (mode URL) ou "allow-scripts"
//     (mode srcdoc) — pas de allow-top-navigation / allow-forms / allow-popups.
//   - sanitizeExtensionHtml() retire <script>, on*= handlers, javascript: URIs.
//   - Référer-Policy strict-origin-when-cross-origin via meta — n'est appliqué
//     que pour l'iframe (le parent garde sa policy).
//   - height contrôlée par cfg.height (80..2000 px) — pas de redimension auto
//     (Web Component proper arrive en V4.1).
//
// V4 = iframe seulement (cf. consignes). V4.1 ajoutera Web Components +
// postMessage API parent↔iframe (save/load) en suivant.

import React, { useMemo } from 'react';
import { CREAM2, GOLD, INK, MUTED, NAVY, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { EXT_UI } from './i18n';
import { sanitizeExtensionHtml, validateExtensionConfig } from './schemas';

export default function ExtensionCockpitTab({ extension }) {
  const { t } = useLang();

  const validation = useMemo(
    () => validateExtensionConfig('cockpit_tab', extension?.config || {}),
    [extension?.config],
  );

  // Sanitize HTML pour mode srcdoc — useMemo PRÉCÈDE l'early return pour
  // respecter les rules-of-hooks (pas d'appel conditionnel).
  const safeHtml = useMemo(
    () => {
      const html = validation.ok ? validation.value?.html : null;
      return html ? sanitizeExtensionHtml(html) : null;
    },
    [validation.ok, validation.value?.html],
  );

  if (!validation.ok) {
    return (
      <div
        className="rounded-[4px] p-3"
        style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
        role="alert"
        data-extension-id={extension.id}
      >
        <p className="text-[12px]" style={{ color: MUTED }}>
          {t({
            fr: `Extension « ${extension.name} » : configuration invalide.`,
            en: `Extension "${extension.name}": invalid configuration.`,
            de: `Erweiterung „${extension.name}“: Konfiguration ungültig.`,
          })}
        </p>
        {validation.errors?.length > 0 && (
          <ul className="text-[11px] mt-1.5 list-disc ml-4" style={{ color: MUTED }}>
            {validation.errors.slice(0, 4).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const cfg = validation.value;
  const height = cfg.height || 480;

  // Mode iframe URL : sandbox plus permissif (le code distant doit accéder à
  // ses own resources via allow-same-origin) — mais toujours sans allow-forms
  // / allow-top-navigation / allow-popups.
  // Mode srcdoc : sandbox strict, sans allow-same-origin (le code s'exécute
  // dans un origin null, ne peut pas appeler le parent sans postMessage).
  const sandbox = cfg.iframeUrl
    ? 'allow-scripts allow-same-origin'
    : 'allow-scripts';

  return (
    <section
      className="rounded-[4px] p-4 mb-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      data-extension-id={extension.id}
      data-extension-kind="cockpit_tab"
    >
      <header className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-[1.5px] w-5" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.18em] font-medium"
              style={{ color: GOLD }}
            >
              {t(EXT_UI.slotPlaceholder)}
            </span>
          </div>
          <h4
            className="text-[18px] leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {cfg.label}
          </h4>
          {extension.description && (
            <p className="text-[12.5px] mt-1" style={{ color: INK }}>
              {extension.description}
            </p>
          )}
        </div>
        <span className="text-[11px]" style={{ color: MUTED }}>
          {cfg.iframeUrl
            ? t({ fr: 'iframe externe', en: 'external iframe', de: 'externes Iframe' })
            : t({ fr: 'HTML embarqué', en: 'embedded HTML',   de: 'eingebettetes HTML' })}
        </span>
      </header>

      <div
        className="rounded-[4px] overflow-hidden"
        style={{ border: `1px solid ${CREAM2}`, background: '#fff' }}
      >
        {cfg.iframeUrl ? (
          <iframe
            title={`extension-${extension.id}`}
            src={cfg.iframeUrl}
            sandbox={sandbox}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            style={{ width: '100%', height, border: 'none', display: 'block' }}
          />
        ) : (
          <iframe
            title={`extension-${extension.id}`}
            srcDoc={safeHtml}
            sandbox={sandbox}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            style={{ width: '100%', height, border: 'none', display: 'block' }}
          />
        )}
      </div>
    </section>
  );
}
