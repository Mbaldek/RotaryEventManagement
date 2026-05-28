// CompetitionsTab — Master Cockpit, onglet « Compétitions ».
//
// Liste toutes les compétitions (toutes éditions, ordre desc par year) avec un
// panneau de création (id, name, year, model). Le clic sur une compétition
// ouvre le CompetitionEditor en panneau inline. Pattern hérité du SetupTab
// (Master ne consomme PAS d'editionId via URL — l'éditeur est sélectionné via
// un state local pour rester sous l'URL `?tab=competitions`).

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, ChevronRight, X } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF, StatusPill,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, COMP, COMPETITION_MODELS, KEBAB_REGEX } from '../i18n';
import {
  useAllCompetitions,
  useCreateCompetition,
  useCountsForEdition,
} from '../useMaster';
import CompetitionEditor from '../CompetitionEditor';

function FieldLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block uppercase tracking-[0.14em] text-[10.5px] mb-1.5"
      style={{ color: MUTED }}
    >
      {children}
    </label>
  );
}

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

function CompetitionCard({ competition, onOpen, isOpen }) {
  const { t } = useLang();
  const counts = useCountsForEdition(competition.id);
  const c = counts.data || {};
  return (
    <li
      className="rounded-[4px] p-4"
      style={{
        background: isOpen ? '#fdf6e8' : 'white',
        border: `1px solid ${isOpen ? GOLD : CREAM2}`,
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
          onClick={() => onOpen(isOpen ? null : competition.id)}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: isOpen ? NAVY : 'white', color: isOpen ? 'white' : NAVY, border: `1px solid ${isOpen ? NAVY : CREAM2}` }}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <>
              <X className="w-3.5 h-3.5" /> {t(UI.close)}
            </>
          ) : (
            <>
              {t(COMP.openEditor)} <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </li>
  );
}

export default function CompetitionsTab() {
  const { t } = useLang();
  const list = useAllCompetitions();
  const create = useCreateCompetition();

  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', year: new Date().getFullYear() + 1, model: 'multiclub' });
  const [formError, setFormError] = useState(null);

  const competitions = useMemo(() => list.data || [], [list.data]);
  const openCompetition = useMemo(
    () => competitions.find((c) => c.id === openId) || null,
    [competitions, openId],
  );

  function resetForm() {
    setForm({ id: '', name: '', year: new Date().getFullYear() + 1, model: 'multiclub' });
    setFormError(null);
  }

  async function onCreate() {
    setFormError(null);
    const id = String(form.id || '').trim().toLowerCase();
    const name = String(form.name || '').trim();
    const year = Number(form.year);
    const model = form.model;
    if (!id || !KEBAB_REGEX.test(id)) {
      setFormError(t(COMP.invalidId));
      return;
    }
    if (!name) {
      setFormError(t(COMP.nameLabel));
      return;
    }
    if (!Number.isFinite(year) || year < 2020 || year > 2100) {
      setFormError(`${t(COMP.yearLabel)}: 2020–2100`);
      return;
    }
    if (!COMPETITION_MODELS.includes(model)) {
      setFormError(t(COMP.modelLabel));
      return;
    }
    try {
      await create.mutateAsync({ id, name, year, model });
      setShowForm(false);
      resetForm();
      setOpenId(id);
    } catch (err) {
      setFormError(err?.message || 'Error');
    }
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
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c]"
          style={{ background: NAVY, color: 'white' }}
        >
          <Plus className="w-4 h-4" /> {t(COMP.newCompetition)}
        </button>
      </header>

      {/* Form de création */}
      {showForm && (
        <div
          className="rounded-[4px] p-4 mb-4"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="new-comp-id">{t(COMP.idLabel)}</FieldLabel>
              <input
                id="new-comp-id"
                type="text"
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                placeholder="2028-pilote"
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{t(COMP.idHint)}</p>
            </div>
            <div>
              <FieldLabel htmlFor="new-comp-name">{t(COMP.nameLabel)}</FieldLabel>
              <input
                id="new-comp-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Rotary Startup Award 2028"
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-comp-year">{t(COMP.yearLabel)}</FieldLabel>
              <input
                id="new-comp-year"
                type="number"
                value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel>{t(COMP.modelLabel)}</FieldLabel>
              <div className="flex flex-col gap-1.5">
                {COMPETITION_MODELS.map((m) => (
                  <label key={m} className="inline-flex items-start gap-2 text-[13px]" style={{ color: NAVY }}>
                    <input
                      type="radio"
                      name="comp-model"
                      value={m}
                      checked={form.model === m}
                      onChange={() => setForm((p) => ({ ...p, model: m }))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">
                        {m === 'multiclub' ? t(COMP.modelMulti) : t(COMP.modelMono)}
                      </span>
                      <span className="block text-[11.5px]" style={{ color: MUTED }}>
                        {m === 'multiclub' ? t(COMP.multiclubHint) : t(COMP.monoclubHint)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onCreate}
              disabled={create.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px] font-medium disabled:opacity-50"
              style={{ background: NAVY, color: 'white' }}
            >
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t(UI.create)}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
            >
              {t(UI.cancel)}
            </button>
            {formError && (
              <span className="text-[12px]" style={{ color: DANGER }}>{formError}</span>
            )}
          </div>
        </div>
      )}

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
            <React.Fragment key={c.id}>
              <CompetitionCard
                competition={c}
                isOpen={openId === c.id}
                onOpen={setOpenId}
              />
              {openId === c.id && openCompetition && (
                <li>
                  <CompetitionEditor
                    competition={openCompetition}
                    onClose={() => setOpenId(null)}
                  />
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}
