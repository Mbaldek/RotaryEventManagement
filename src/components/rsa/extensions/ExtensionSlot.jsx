// ExtensionSlot — point d'extension générique pour rendre les extensions
// actives matching un scope donné (V3.0).
//
// Usage futur (V4 marketplace) :
//   <ExtensionSlot kind="funnel_step" scope="club" clubId={clubId} editionId={editionId} />
//   <ExtensionSlot kind="cockpit_tab" scope="club" clubId={clubId} />
//   <ExtensionSlot kind="email_template" scope="master" />
//
// Pour V1, ExtensionSlot rend un placeholder Élysée par extension active matching
// le scope (carte hairline cream avec "Extension: {name}"). Le but est de
// vérifier que le pipeline DB → entity → hook → composant fonctionne de bout
// en bout.
//
// V4 ajoutera :
//   - render dynamique selon kind (JSON-schema autogen pour funnel_step,
//     iframe sandboxée pour cockpit_tab, MJML pour email_template, …)
//   - sandbox de sécurité (CSP, validation schema, eval guard)
//
// Props :
//   kind      : 'funnel_step' | 'cockpit_tab' | 'email_template' | 'webhook'
//   scope     : 'master' | 'club' | 'edition'
//   clubId    : string? (filtre côté query si scope='club'/'edition')
//   editionId : string? (filtre côté query si scope='edition')
//   fallback  : ReactNode? (rendu quand aucune extension active match)

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { CREAM, GOLD, INK, MUTED, NAVY, SERIF } from '@/components/design/tokens';
import { useLang } from '@/lib/platform/i18n';
import { useExtensions } from './useExtensions';
import { EXT_UI, EXT_KIND_LABELS } from './i18n';

function ExtensionPlaceholder({ extension }) {
  const { t } = useLang();
  return (
    <div
      className="rounded-[4px] p-3 flex items-start gap-2.5"
      style={{ background: CREAM, border: `1px dashed ${GOLD}` }}
      data-extension-id={extension.id}
      data-extension-kind={extension.kind}
      data-extension-scope={extension.scope}
    >
      <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px]" style={{ color: NAVY }}>
          <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
            {t(EXT_UI.slotPlaceholder)} · {t(EXT_KIND_LABELS[extension.kind] || { fr: extension.kind, en: extension.kind, de: extension.kind })}
          </span>
        </p>
        <p
          className="text-[14px] mt-0.5 leading-tight"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {extension.name}
        </p>
        {extension.description && (
          <p className="text-[12px] mt-1" style={{ color: INK }}>
            {extension.description}
          </p>
        )}
        <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>
          {t(EXT_UI.slotPlaceholderHint)}
        </p>
      </div>
    </div>
  );
}

export default function ExtensionSlot({
  kind,
  scope,
  clubId = null,
  editionId = null,
  fallback = null,
}) {
  const queryArgs = (() => {
    if (scope === 'master')  return { scope: 'master', kind };
    if (scope === 'club')    return { scope: 'club',   kind, clubId };
    if (scope === 'edition') return { scope: 'edition', kind, editionId };
    return { kind };
  })();

  const extensionsQ = useExtensions(queryArgs);

  if (extensionsQ.isLoading) {
    return (
      <div className="py-2 flex justify-center" aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: MUTED }} aria-hidden />
      </div>
    );
  }

  const all = extensionsQ.data || [];
  const active = all.filter((e) => e.active);

  if (active.length === 0) {
    return fallback || null;
  }

  return (
    <div className="flex flex-col gap-2" data-extension-slot={`${scope}-${kind}`}>
      {active.map((ext) => (
        <ExtensionPlaceholder key={ext.id} extension={ext} />
      ))}
    </div>
  );
}
