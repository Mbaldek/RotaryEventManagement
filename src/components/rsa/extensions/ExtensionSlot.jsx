// ExtensionSlot — point d'extension générique pour rendre les extensions
// actives matching un scope donné.
//
// V3.0 (V1) : placeholder Élysée uniquement (carte hairline cream + Sparkle).
// V4 : rendu réel selon kind avec sous-composants dédiés.
//   - funnel_step     → <ExtensionFunnelStep>     (mini-form auto-généré)
//   - cockpit_tab     → <ExtensionCockpitTab>     (iframe sandbox strict)
//   - email_template  → <ExtensionEmailTemplate>  (card insertable composer)
//   - webhook         → <ExtensionWebhookCard>    (config-only doc card)
//
// Props :
//   kind        : 'funnel_step' | 'cockpit_tab' | 'email_template' | 'webhook'
//   scope       : 'master' | 'club' | 'edition'
//   clubId      : string? (filtre côté query si scope='club'/'edition')
//   editionId   : string? (filtre côté query si scope='edition')
//   fallback    : ReactNode? (rendu quand aucune extension active match)
//   values      : object? — pour funnel_step controlled (clé extension.id → fieldValues)
//   onChange    : (extId, values) => void — pour funnel_step
//   onInsertDraft : (draft) => void — pour email_template
//
// Sécurité : validateExtensionConfig() côté sous-composants — toute config
// invalide rend un message d'erreur Élysée plutôt que le widget réel.

import React from 'react';
import { Loader2 } from 'lucide-react';
import { MUTED } from '@/components/design/tokens';
import { useExtensions } from './useExtensions';
import ExtensionFunnelStep from './ExtensionFunnelStep';
import ExtensionCockpitTab from './ExtensionCockpitTab';
import ExtensionEmailTemplate from './ExtensionEmailTemplate';
import ExtensionWebhookCard from './ExtensionWebhookCard';

function renderOne({ extension, values, onChange, onInsertDraft }) {
  switch (extension.kind) {
    case 'funnel_step':
      return (
        <ExtensionFunnelStep
          key={extension.id}
          extension={extension}
          values={values?.[extension.id] || {}}
          onChange={(next) => typeof onChange === 'function' && onChange(extension.id, next)}
        />
      );
    case 'cockpit_tab':
      return <ExtensionCockpitTab key={extension.id} extension={extension} />;
    case 'email_template':
      return (
        <ExtensionEmailTemplate
          key={extension.id}
          extension={extension}
          onInsertDraft={onInsertDraft}
        />
      );
    case 'webhook':
      return <ExtensionWebhookCard key={extension.id} extension={extension} />;
    default:
      return null;
  }
}

export default function ExtensionSlot({
  kind,
  scope,
  clubId = null,
  editionId = null,
  fallback = null,
  values,
  onChange,
  onInsertDraft,
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

  // email_template a un layout naturellement list (TemplatesLibrary <ul>) ;
  // les autres sont des sections empilées.
  const isListLayout = kind === 'email_template';
  const Container = isListLayout ? 'ul' : 'div';

  return (
    <Container
      className="flex flex-col gap-2"
      data-extension-slot={`${scope}-${kind}`}
    >
      {active.map((ext) => renderOne({ extension: ext, values, onChange, onInsertDraft }))}
    </Container>
  );
}
