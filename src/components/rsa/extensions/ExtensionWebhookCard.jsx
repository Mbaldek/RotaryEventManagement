// ExtensionWebhookCard — V3.0 Vague 4.
//
// Affiche la CONFIGURATION (URL, events souscrits) d'une extension kind='webhook'.
// V4 = configuration-only côté client : l'invocation réelle est server-side via
// une edge function placeholder (rsa-webhook-dispatch) qui :
//   1. lit la table extensions WHERE kind='webhook' AND active=true,
//   2. signe le payload HMAC-SHA256 avec extension.config.secret,
//   3. POST vers extension.config.url avec retry + dead-letter queue.
//
// Le component liste les événements souscrits + l'endpoint dispatcher (doc pour
// les intégrateurs). On NE rend PAS l'URL secrète en clair côté UI (les
// extensions de webhook sont visibles uniquement aux master_admin / club_admin
// de toute façon via la RLS extensions_read).

import React, { useMemo } from 'react';
import { Webhook, ExternalLink, Copy } from 'lucide-react';
import { CREAM2, GOLD, INK, MUTED, NAVY, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { EXT_UI } from './i18n';
import { validateExtensionConfig } from './schemas';

// Endpoint serveur de dispatch (édité en V4.1 quand l'edge function existe ;
// pour V4, c'est de la documentation à destination de l'intégrateur).
const WEBHOOK_DISPATCH_ENDPOINT = '/functions/v1/rsa-webhook-dispatch';

export default function ExtensionWebhookCard({ extension }) {
  const { t } = useLang();
  const validation = useMemo(
    () => validateExtensionConfig('webhook', extension?.config || {}),
    [extension?.config],
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
      </div>
    );
  }

  const cfg = validation.value;

  // URL affichée tronquée (origin + path), pas de query string
  const displayUrl = (() => {
    try {
      const u = new URL(cfg.url);
      return `${u.origin}${u.pathname}`;
    } catch {
      return cfg.url;
    }
  })();

  function copyEndpoint() {
    try { navigator.clipboard?.writeText(WEBHOOK_DISPATCH_ENDPOINT); } catch { /* noop */ }
  }

  return (
    <section
      className="rounded-[4px] p-4 mb-4"
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
      data-extension-id={extension.id}
      data-extension-kind="webhook"
    >
      <header className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Webhook className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
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
          {extension.name}
        </h4>
        {extension.description && (
          <p className="text-[13px] mt-1" style={{ color: INK }}>
            {extension.description}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <dt
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1"
            style={{ color: MUTED }}
          >
            {t({ fr: 'Endpoint cible', en: 'Target endpoint', de: 'Ziel-Endpoint' })}
          </dt>
          <dd className="flex items-center gap-1.5" style={{ color: NAVY }}>
            <code className="text-[12px] truncate" title={cfg.url}>{displayUrl}</code>
            <a
              href={cfg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
              aria-label="open"
              style={{ color: MUTED }}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </dd>
        </div>

        <div>
          <dt
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1"
            style={{ color: MUTED }}
          >
            {t({ fr: 'Signature', en: 'Signing', de: 'Signatur' })}
          </dt>
          <dd style={{ color: NAVY }}>
            {cfg.secret
              ? t({ fr: 'HMAC-SHA256 (secret configuré)', en: 'HMAC-SHA256 (secret set)',  de: 'HMAC-SHA256 (Geheimnis gesetzt)' })
              : t({ fr: 'Aucune (non recommandé)',         en: 'None (not recommended)',    de: 'Keine (nicht empfohlen)' })}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt
            className="uppercase tracking-[0.14em] text-[10.5px] mb-1"
            style={{ color: MUTED }}
          >
            {t({ fr: 'Événements souscrits', en: 'Subscribed events', de: 'Abonnierte Ereignisse' })}
          </dt>
          <dd className="flex flex-wrap gap-1.5 mt-1">
            {cfg.events.map((ev) => (
              <span
                key={ev}
                className="inline-flex items-center text-[11px] uppercase tracking-[0.12em] font-medium px-2 py-0.5 rounded-full"
                style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
              >
                {ev}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <div
        className="mt-4 pt-3 text-[11.5px]"
        style={{ color: MUTED, borderTop: `1px dashed ${CREAM2}` }}
      >
        <p className="mb-1">
          {t({
            fr: 'Le dispatcher serveur appelle cette URL lorsqu’un événement souscrit survient (POST JSON signé).',
            en: 'The server dispatcher POSTs a signed JSON payload to this URL on each subscribed event.',
            de: 'Der Server-Dispatcher sendet bei jedem abonnierten Ereignis eine signierte JSON-Nachricht an diese URL.',
          })}
        </p>
        <button
          type="button"
          onClick={copyEndpoint}
          className="inline-flex items-center gap-1.5 mt-1 text-[11.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY }}
        >
          <Copy className="w-3 h-3" />
          <code>{WEBHOOK_DISPATCH_ENDPOINT}</code>
        </button>
      </div>
    </section>
  );
}
