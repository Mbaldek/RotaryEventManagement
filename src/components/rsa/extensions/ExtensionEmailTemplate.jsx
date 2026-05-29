// ExtensionEmailTemplate — V3.0 Vague 4.
//
// Rend une extension kind='email_template' comme une card "template tiers" dans
// l'EmailStudio (Templates tab). C'est de la LECTURE SEULE : on affiche le
// subject + bodyMarkdown + audienceType + lang, avec un bouton "Insérer dans
// le composer" qui remonte un draft initial (compatible TemplatesLibrary).
//
// Pourquoi pas écrire directement dans la table email_templates ?
//   - Garder la séparation d'origine : un template "extension" reste découplé
//     de la table email_templates (qui a sa propre RLS multi-club V2).
//   - Permet le lifecycle "désactiver l'extension" sans toucher aux templates
//     persistés dans email_templates.
//   - Le club peut "promouvoir" un template extension vers un vrai
//     email_template via TemplatesLibrary > Créer (TemplatesLibrary lit
//     le draft inséré).

import React, { useMemo } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { CREAM2, GOLD, INK, MUTED, NAVY, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { EXT_UI } from './i18n';
import { validateExtensionConfig } from './schemas';

export default function ExtensionEmailTemplate({ extension, onInsertDraft }) {
  const { t } = useLang();
  const validation = useMemo(
    () => validateExtensionConfig('email_template', extension?.config || {}),
    [extension?.config],
  );

  if (!validation.ok) {
    return (
      <li
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
      </li>
    );
  }

  const cfg = validation.value;

  function handleInsert() {
    if (typeof onInsertDraft !== 'function') return;
    onInsertDraft({
      subject: cfg.subject,
      bodyHtml: cfg.bodyMarkdown, // convention M9 : body_html stocke le markdown light
      audienceType: cfg.audienceType || 'club_jurys',
      lang: cfg.lang || 'fr',
      // Tag d'origine pour debug — TemplatesLibrary ignore les clés inconnues
      sourceExtensionId: extension.id,
      sourceExtensionName: extension.name,
    });
  }

  return (
    <li
      className="rounded-[4px] p-3"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      data-extension-id={extension.id}
      data-extension-kind="email_template"
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Mail className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.18em] font-medium"
              style={{ color: GOLD }}
            >
              {t(EXT_UI.slotPlaceholder)}
            </span>
            <span
              className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
            >
              {cfg.lang || 'fr'}
            </span>
            {cfg.audienceType && (
              <span
                className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'white', color: MUTED, border: `1px solid ${CREAM2}` }}
              >
                {cfg.audienceType.replace('_', ' ')}
              </span>
            )}
          </div>
          <h4
            className="text-[15.5px] mt-1.5 leading-tight"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {extension.name}
          </h4>
          <p className="text-[12.5px] mt-1" style={{ color: INK }}>
            <strong>{t({ fr: 'Objet', en: 'Subject', de: 'Betreff' })} :</strong> {cfg.subject}
          </p>
          {extension.description && (
            <p className="text-[12px] mt-1.5" style={{ color: MUTED }}>
              {extension.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleInsert}
          className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white', border: `1px solid ${NAVY}` }}
        >
          {t({ fr: 'Insérer', en: 'Insert', de: 'Einfügen' })}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </li>
  );
}
