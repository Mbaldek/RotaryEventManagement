// MarketplaceTab — V3.0 Vague 4.
//
// Tab Marketplace embarqué dans le ClubCockpit. Affiche le catalogue
// extensions scope='master' active=true, avec un bouton "Activer" qui installe
// directement pour le club courant (pas de modale, le club est déjà connu via
// la prop `clubId`).
//
// Pour la vraie marketplace cross-clubs (multi-club admin, pickers, …), voir
// la route publique `/Marketplace`. Ce tab est la version "rapide" pour les
// club_admin qui ne veulent pas naviguer.

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  NAVY, INK, GOLD, CREAM2, MUTED, SERIF, EASE, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER, TINT_DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import {
  useExtensions, useInstallExtensionToClub,
} from '@/components/rsa/extensions/useExtensions';
import {
  EXT_KIND_LABELS, MARKETPLACE_UI,
} from '@/components/rsa/extensions/i18n';
import { EXTENSION_KINDS } from '@/lib/rsa/extensions';

function KindFilter({ value, onChange }) {
  const { t } = useLang();
  const pills = [
    { id: 'all', label: t(MARKETPLACE_UI.filterAll) },
    ...EXTENSION_KINDS.map((k) => ({ id: k, label: t(EXT_KIND_LABELS[k]) })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pills.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className="px-3 py-1 rounded-full text-[11.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] transition-colors"
            style={{
              background: active ? NAVY : TINT_ADMIN,
              color: active ? 'white' : INK,
              border: `1px solid ${active ? NAVY : CREAM2}`,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ extension, isInstalled, onInstall, busy, t }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-start gap-2 mb-2 flex-wrap">
        <span
          className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
          style={{ background: '#fdf6e8', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          {t(EXT_KIND_LABELS[extension.kind] || { fr: extension.kind, en: extension.kind, de: extension.kind })}
        </span>
        <span
          className="inline-flex items-center text-[10.5px] uppercase tracking-[0.14em] font-medium px-2 py-0.5 rounded-full"
          style={{ background: TINT_ADMIN, color: MUTED, border: `1px solid ${CREAM2}` }}
        >
          {t(MARKETPLACE_UI.badgeMaster)}
        </span>
      </div>

      <h4
        className="text-[16px] leading-tight"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {extension.name}
      </h4>
      {extension.description && (
        <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: INK }}>
          {extension.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onInstall(extension)}
          disabled={isInstalled || busy}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c] disabled:opacity-50"
          style={{
            background: isInstalled ? TINT_ADMIN : NAVY,
            color: isInstalled ? NAVY : 'white',
            border: `1px solid ${NAVY}`,
          }}
        >
          {busy
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : isInstalled
              ? <Check className="w-3.5 h-3.5" />
              : <Plus className="w-3.5 h-3.5" />}
          {busy
            ? t(MARKETPLACE_UI.installing)
            : isInstalled
              ? t(MARKETPLACE_UI.installed)
              : t(MARKETPLACE_UI.install)}
        </button>
      </div>
    </motion.li>
  );
}

export default function MarketplaceTab({ clubId }) {
  const { t } = useLang();
  const masterExtsQ = useExtensions({ scope: 'master' });
  const clubExtsQ = useExtensions(clubId ? { scope: 'club', clubId } : {});
  const installMut = useInstallExtensionToClub();

  const [kindFilter, setKindFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const extensions = useMemo(
    () => (masterExtsQ.data || []).filter((e) => e.active),
    [masterExtsQ.data],
  );
  const filtered = useMemo(
    () => (kindFilter === 'all' ? extensions : extensions.filter((e) => e.kind === kindFilter)),
    [extensions, kindFilter],
  );
  const installedSet = useMemo(() => {
    const out = new Set();
    for (const e of clubExtsQ.data || []) {
      out.add(`${e.kind}::${e.name}`);
    }
    return out;
  }, [clubExtsQ.data]);

  async function handleInstall(ext) {
    if (!clubId) return;
    setBusyId(ext.id);
    setError(null);
    try {
      await installMut.mutateAsync({ masterExtensionId: ext.id, clubId });
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
            <span
              className="uppercase text-[10px] tracking-[0.18em] font-medium"
              style={{ color: GOLD }}
            >
              {t(MARKETPLACE_UI.eyebrow)}
            </span>
          </div>
          <h3
            className="text-[18px]"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(MARKETPLACE_UI.pageTitle)}
          </h3>
        </div>
        <Link
          to="/Marketplace"
          className="inline-flex items-center gap-1.5 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY }}
        >
          {t({ fr: 'Voir le catalogue complet', en: 'See full catalogue', de: 'Vollständigen Katalog anzeigen' })}
          <ExternalLink className="w-3 h-3" />
        </Link>
      </header>

      <p className="text-[12.5px] mb-4 max-w-3xl" style={{ color: INK }}>
        {t(MARKETPLACE_UI.pageSubtitle)}
      </p>

      <div className="mb-4">
        <KindFilter value={kindFilter} onChange={setKindFilter} />
      </div>

      {error && (
        <div
          className="rounded-[4px] p-2.5 text-[12px] mb-3"
          role="alert"
          style={{ color: INK, background: TINT_DANGER, borderLeft: `2px solid ${DANGER}` }}
        >
          {error}
        </div>
      )}

      {masterExtsQ.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!masterExtsQ.isLoading && filtered.length === 0 && (
        <div
          className="rounded-[4px] p-6 text-center"
          style={{ background: TINT_ADMIN, border: `1px dashed ${CREAM2}` }}
        >
          <h4
            className="text-[15px] mb-1"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {t(MARKETPLACE_UI.emptyTitle)}
          </h4>
          <p className="text-[12.5px]" style={{ color: MUTED }}>
            {t(MARKETPLACE_UI.emptyBody)}
          </p>
        </div>
      )}

      {!masterExtsQ.isLoading && filtered.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((ext) => (
              <Card
                key={ext.id}
                extension={ext}
                isInstalled={installedSet.has(`${ext.kind}::${ext.name}`)}
                onInstall={handleInstall}
                busy={busyId === ext.id && installMut.isPending}
                t={t}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
