// GroupedQueue — vue Sélection groupée Compétition ▸ Club pour le master_admin.
//
// Refonte hiérarchie : remplace la <QueueList> plate côté master_admin par
// une liste sectionnée — une section par compétition, une sous-section par
// club, chaque sous-section listant les dossiers via <QueueList> (réutilisé
// tel quel comme primitive de rendu d'une row).
//
// Le composant est dumb : il reçoit `groups` (cf. groupSelectionPages) +
// les lookups edition / club pour les labels + les props standard de queue
// (isLoading, hasNextPage, onLoadMore, onOpen, selectedId, onRetry).
//
// Empty / loading / error states : on délègue à <QueueList> pour rester
// cohérent (mêmes skeletons, mêmes messages d'erreur).

import React from 'react';
import { Loader2 } from 'lucide-react';
import { GOLD, MUTED, NAVY, SERIF } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import QueueList from './QueueList';
import { UI } from './i18n';
import { NO_CLUB_BUCKET, NO_EDITION_BUCKET } from './useSelectionQueueGrouped';

function SectionHeader({ label, count }) {
  return (
    <header className="mb-3 flex items-baseline gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-[1.5px] w-6"
          style={{ background: GOLD }}
        />
        <span
          className="uppercase text-[10.5px] tracking-[0.18em] font-medium"
          style={{ color: GOLD }}
        >
          {label}
        </span>
      </div>
      <span className="text-[11.5px] tabular-nums" style={{ color: MUTED }}>
        · {count}
      </span>
    </header>
  );
}

function ClubSubHeader({ label, count }) {
  return (
    <h4
      className="mt-1 mb-2 flex items-baseline gap-2 flex-wrap"
      style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
    >
      <span className="text-[15px]">{label}</span>
      <span className="text-[11px] tabular-nums" style={{ color: MUTED }}>
        · {count}
      </span>
    </h4>
  );
}

export default function GroupedQueue({
  groups,
  editionsLookup,
  clubsLookup,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onOpen,
  selectedId,
  onRetry,
}) {
  const { t } = useLang();

  // Loading state : skeleton plat via <QueueList isLoading>. Cohérent avec le
  // mode plat — pas de section vide pendant le premier fetch.
  if (isLoading && (!groups || groups.length === 0)) {
    return (
      <QueueList
        pages={[]}
        isLoading
        isError={false}
        hasNextPage={false}
        onOpen={onOpen}
        selectedId={selectedId}
      />
    );
  }

  // Error / empty : on délègue aussi à <QueueList> pour homogénéité.
  if (isError) {
    return (
      <QueueList
        pages={[]}
        isLoading={false}
        isError
        onRetry={onRetry}
      />
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <QueueList
        pages={[]}
        isLoading={false}
        isError={false}
        hasNextPage={false}
        onOpen={onOpen}
        selectedId={selectedId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => {
        const ed = editionsLookup?.get?.(g.editionId);
        const edLabel = g.editionId === NO_EDITION_BUCKET
          ? t({ fr: 'Sans compétition', en: 'No competition', de: 'Ohne Wettbewerb' })
          : (ed?.name || g.editionId);
        return (
          <section key={g.editionId} aria-label={edLabel}>
            <SectionHeader label={edLabel} count={g.startupsCount} />
            <div className="flex flex-col gap-5 pl-1">
              {g.clubs.map((cg) => {
                const cl = clubsLookup?.get?.(cg.clubId);
                const clLabel = cg.clubId === NO_CLUB_BUCKET
                  ? t({ fr: 'Sans club', en: 'No club', de: 'Ohne Club' })
                  : (cl?.name || cg.clubId);
                return (
                  <div key={`${g.editionId}-${cg.clubId}`}>
                    <ClubSubHeader label={clLabel} count={cg.startups.length} />
                    <QueueList
                      pages={[cg.startups]}
                      isLoading={false}
                      isError={false}
                      hasNextPage={false}
                      onOpen={onOpen}
                      selectedId={selectedId}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {hasNextPage && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1.5px solid ${GOLD}`, background: 'white' }}
          >
            {isFetchingNextPage && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            {t(UI.loadMore)}
          </button>
        </div>
      )}

    </div>
  );
}
