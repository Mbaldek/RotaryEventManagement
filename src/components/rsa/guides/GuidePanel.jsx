// GuidePanel — drawer lecteur des guides d'un espace. Accordéon d'articles,
// contenu markdown rendu par langue courante (fallback via pickLang).
// Pattern visuel calqué sur SessionDetailDrawer (overlay, motion, Esc).

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Accordion from '@radix-ui/react-accordion';
import ReactMarkdown from 'react-markdown';
import { X, ChevronDown } from 'lucide-react';
import { NAVY, GOLD, INK, MUTED, CREAM2, SERIF, EASE } from '@/components/design/tokens';
import { useLang, pickLang } from '@/lib/platform/i18n';
import { GUIDE_UI, GUIDE_SPACE_TITLE } from './i18n';

function formatDate(iso, lang) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(
      lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' },
    );
  } catch {
    return null;
  }
}

export default function GuidePanel({ open, space, guides, isLoading, isError, onClose }) {
  const { t, lang } = useLang();

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) {
      window.addEventListener('keydown', onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open, onClose]);

  const lastUpdated = guides.reduce(
    (max, g) => (g.updated_at > max ? g.updated_at : max),
    '',
  );

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-drawer-title"
        >
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-0"
            style={{ background: 'rgba(15,31,61,0.45)' }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="relative w-full md:w-[480px] h-full overflow-y-auto"
            style={{ background: 'white', borderLeft: `1px solid ${CREAM2}` }}
          >
            <div aria-hidden className="h-[3px]" style={{ background: GOLD }} />
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
              style={{ background: 'white', borderBottom: `1px solid ${CREAM2}` }}
            >
              <div
                id="guide-drawer-title"
                className="uppercase text-[10px] tracking-[0.18em] font-semibold"
                style={{ color: NAVY }}
              >
                {t(GUIDE_SPACE_TITLE[space])}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(GUIDE_UI.close)}
                className="p-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] hover:bg-[#faf7f2]"
                style={{ color: NAVY }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-6">
              {isLoading && <div className="text-[13px]" style={{ color: MUTED }}>{t(GUIDE_UI.loading)}</div>}
              {isError && <div className="text-[13px]" style={{ color: '#b91c1c' }}>{t(GUIDE_UI.loadError)}</div>}
              {!isLoading && !isError && guides.length === 0 && (
                <div className="text-[13px] italic" style={{ color: MUTED }}>{t(GUIDE_UI.empty)}</div>
              )}

              {guides.length > 0 && (
                <Accordion.Root type="single" collapsible defaultValue={guides[0]?.id}>
                  {guides.map((g) => (
                    <Accordion.Item key={g.id} value={g.id} style={{ borderBottom: `1px solid ${CREAM2}` }}>
                      <Accordion.Header>
                        <Accordion.Trigger
                          className="group w-full flex items-center justify-between gap-3 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] rounded-[4px]"
                        >
                          <span className="text-[14px] font-medium" style={{ color: NAVY, fontFamily: SERIF }}>
                            {pickLang(g.title, lang) || '—'}
                          </span>
                          <ChevronDown
                            className="w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                            style={{ color: MUTED }}
                            aria-hidden
                          />
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="pb-4">
                        <div
                          className="guide-prose text-[13.5px] leading-relaxed"
                          style={{ color: INK }}
                        >
                          <ReactMarkdown>{pickLang(g.body_md, lang) || ''}</ReactMarkdown>
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              )}

              {lastUpdated && (
                <div className="mt-6 text-[11px]" style={{ color: MUTED }}>
                  {t(GUIDE_UI.updatedAt)} {formatDate(lastUpdated, lang)}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
