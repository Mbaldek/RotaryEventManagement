// CompetitionsTab — Master Cockpit, onglet « Compétitions ».
//
// V3 — Refonte UX :
//   * "Nouvelle compétition" ouvre <CompetitionFunnel /> (modal funnel
//     backdrop-blur, autosave debounced),
//   * Le clic sur "Ouvrir l'éditeur" d'une card pousse l'URL
//     ?subview=edit-competition&id={editionId} ; MasterCockpit intercepte
//     ce subview pour rendre <CompetitionEditView /> à la place du shell.
//   * Plus de panel inline qui se déploie sous la carte.
//
// La liste des compétitions reste identique côté UI (card + counts + status
// pill + bouton "Ouvrir l'éditeur").

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, ChevronRight } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, SERIF, StatusPill,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, COMP } from '../i18n';
import {
  useAllCompetitions,
  useCountsForEdition,
} from '../useMaster';
import CompetitionFunnel from '../CompetitionFunnel';

function ModelBadge({ model }) {
  const isMulti = model === 'multiclub';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        background: isMulti ? '#fdf6e8' : '#eff1f6',
        color: NAVY,
        border: `1px solid ${CREAM2}`,
      }}
    >
      {isMulti ? 'multiclub' : 'monoclub'}
    </span>
  );
}

function CompetitionCard({ competition, onOpen }) {
  const { t } = useLang();
  const counts = useCountsForEdition(competition.id);
  const c = counts.data || {};
  return (
    <li
      className="group rounded-[4px] p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#c9a84c]/60"
      style={{
        background: 'white',
        border: `1px solid ${CREAM2}`,
      }}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="text-[16px]"
              style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
            >
              {competition.name}
            </h4>
            <span className="text-[11.5px] tabular-nums" style={{ color: MUTED }}>· {competition.year}</span>
            <ModelBadge model={competition.model} />
            <StatusPill status={competition.status} kind="jury" label={competition.status} />
          </div>
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: MUTED }}>{competition.id}</p>
          <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px]" style={{ color: INK }}>
            {counts.isLoading ? (
              <span className="inline-flex items-center gap-1.5" style={{ color: MUTED }}>
                <Loader2 className="w-3 h-3 animate-spin" /> {t(UI.loading)}
              </span>
            ) : (
              <>
                <span><strong className="tabular-nums">{c.clubsCount ?? 0}</strong> {t(COMP.clubsAttached)}</span>
                <span style={{ color: CREAM2 }}>·</span>
                <span><strong className="tabular-nums">{c.startupsCount ?? 0}</strong> {t(COMP.applications)}</span>
                <span style={{ color: CREAM2 }}>·</span>
                <span><strong className="tabular-nums">{c.sessionsCount ?? 0}</strong> {t(COMP.sessions)}</span>
                {(c.sessionsLive ?? 0) > 0 && (
                  <>
                    <span style={{ color: CREAM2 }}>·</span>
                    <span style={{ color: '#1d6b4f' }}>
                      <strong className="tabular-nums">{c.sessionsLive}</strong> live
                    </span>
                  </>
                )}
                {(c.sessionsPublished ?? 0) > 0 && (
                  <>
                    <span style={{ color: CREAM2 }}>·</span>
                    <span><strong className="tabular-nums">{c.sessionsPublished}</strong> published</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(competition.id)}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: 'white', color: NAVY, border: `1px solid ${CREAM2}` }}
        >
          {t(COMP.openEditor)} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </li>
  );
}

export default function CompetitionsTab() {
  const { t } = useLang();
  const list = useAllCompetitions();
  const [params, setParams] = useSearchParams();

  const [funnelOpen, setFunnelOpen] = useState(false);

  const competitions = useMemo(() => list.data || [], [list.data]);

  function openEditor(id) {
    const p = new URLSearchParams(params);
    p.set('tab', 'competitions');
    p.set('subview', 'edit-competition');
    p.set('id', id);
    setParams(p, { replace: false });
  }

  return (
    <section className="mb-6">
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(COMP.sectionTitle)}
        </h3>
        <span className="text-[12px]" style={{ color: MUTED }}>· {competitions.length}</span>
        <button
          type="button"
          onClick={() => setFunnelOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(COMP.newCompetition)}
        </button>
      </header>

      {/* Liste */}
      {list.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {list.isError && (
        <p className="text-[12.5px]" style={{ color: DANGER }}>{t(UI.loadError)}</p>
      )}

      {!list.isLoading && !list.isError && competitions.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(COMP.noCompetitions)}</p>
      )}

      {!list.isLoading && competitions.length > 0 && (
        <ul className="space-y-3">
          {competitions.map((c) => (
            <CompetitionCard
              key={c.id}
              competition={c}
              onOpen={openEditor}
            />
          ))}
        </ul>
      )}

      <CompetitionFunnel
        open={funnelOpen}
        onClose={() => setFunnelOpen(false)}
        onCreated={(newId) => {
          // Ouvre directement la vue d'édition de la compétition créée.
          openEditor(newId);
        }}
      />
    </section>
  );
}
