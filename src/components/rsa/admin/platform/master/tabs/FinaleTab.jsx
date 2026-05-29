// FinaleTab — Master Cockpit, onglet « Pool Finale ».
//
// La Finale est désormais une entité configurable attachée à toute édition
// (monoclub OU multiclub). Cet onglet pilote le POOL d'une édition donnée :
// championnes par club, pool de la Finale (platform_finale_membership) et,
// si elle existe, la session-instance kind='finale'.
//
// La CONFIGURATION éditoriale (has_finale, name, date, lieu, format, top-N)
// vit dans l'édition de compétition (CompetitionEditView/CompetitionFunnel,
// tab "Finale"). Cet onglet ne configure rien, il opère.

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trophy, Trash2 } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, FOCUS_RING_CLASS, SERIF, StatusPill, TINT_ADMIN,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, FINALE, KEBAB_REGEX } from '../i18n';
import {
  useAllCompetitions,
  useClubsForEdition,
  useFinalistsForEdition,
  useFinale,
  useCreateFinale,
  useFinalePool,
  useRemoveFinalist,
} from '../useMaster';

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

function CompetitionPicker({ value, onChange, options }) {
  const { t } = useLang();
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: INK }}>
      <span className="uppercase tracking-[0.14em] text-[10.5px]" style={{ color: MUTED }}>
        {t({ fr: 'Compétition', en: 'Competition', de: 'Wettbewerb' })}
      </span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[4px] px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · {c.year} · {c.status}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChampionsByClub({ competition }) {
  const { t } = useLang();
  const clubs = useClubsForEdition(competition.id);
  const finalists = useFinalistsForEdition(competition.id);
  const pool = useFinalePool(competition.id);

  const clubsList = clubs.data || [];
  const finalistsList = finalists.data || [];
  const poolStartupIds = useMemo(
    () => new Set((pool.data || []).map((r) => r.startup_id)),
    [pool.data],
  );

  // Group finalistes par club_id (depuis startup.club_id), retombe sur session.club_id si manquant.
  const byClubId = useMemo(() => {
    const out = new Map();
    for (const s of finalistsList) {
      const cid = s.club_id || s.session?.club_id || null;
      if (!cid) continue;
      if (!out.has(cid)) out.set(cid, []);
      out.get(cid).push(s);
    }
    return out;
  }, [finalistsList]);

  if (clubs.isLoading || finalists.isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
      </div>
    );
  }

  if (clubsList.length === 0) {
    return (
      <p className="text-[13px] py-2" style={{ color: MUTED }}>{t(FINALE.noChampions)}</p>
    );
  }

  return (
    <ul className="space-y-4">
      {clubsList.map((row) => {
        const club = row.club || { id: row.club_id, name: row.club_id };
        const finalistsForClub = byClubId.get(club.id) || [];
        return (
          <li
            key={club.id}
            className="rounded-[4px] p-4"
            style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Trophy className="w-4 h-4" style={{ color: GOLD }} aria-hidden />
              <h4 className="text-[15px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                {club.name}
              </h4>
              <span className="text-[11.5px]" style={{ color: MUTED }}>
                · {finalistsForClub.length} {t(FINALE.championsPerClub)}
              </span>
            </div>
            {finalistsForClub.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: MUTED }}>{t(FINALE.noChampions)}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr style={{ color: MUTED }}>
                      <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">
                        {t(FINALE.championStartupCol)}
                      </th>
                      <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">
                        {t(FINALE.championSessionCol)}
                      </th>
                      <th className="text-right uppercase tracking-[0.14em] text-[10.5px] py-2">
                        {t(FINALE.championActionsCol)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalistsForClub.map((s) => {
                      const inPool = poolStartupIds.has(s.id);
                      return (
                        <tr key={s.id} className="border-t" style={{ borderColor: CREAM2 }}>
                          <td className="py-2 pr-3 align-top">
                            <p className="font-medium" style={{ color: NAVY }}>{s.name || s.id}</p>
                            <StatusPill status="finalist" kind="dossier" label="finaliste" />
                          </td>
                          <td className="py-2 pr-3 align-top text-[12px]" style={{ color: INK }}>
                            {s.session ? (
                              <>
                                <span>{s.session.name}</span>
                                {s.session.session_date && (
                                  <span className="block text-[11px]" style={{ color: MUTED }}>
                                    {s.session.session_date}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ color: MUTED }}>—</span>
                            )}
                          </td>
                          <td className="py-2 align-top text-right">
                            {inPool ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-[4px] uppercase tracking-[0.14em]"
                                style={{ color: GOLD, border: `1px solid ${GOLD}`, background: '#fdf6e8' }}
                              >
                                <Trophy className="w-3 h-3" /> {t(FINALE.poolSectionTitle)}
                              </span>
                            ) : (
                              <span
                                className="text-[11px]"
                                title={t(FINALE.poolSectionHint)}
                                style={{ color: MUTED }}
                              >—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FinaleSessionRow({ competition }) {
  const { t } = useLang();
  const finale = useFinale(competition.id);
  const create = useCreateFinale();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: `finale_${competition.year || 'edition'}`,
    name: 'Finale',
    session_date: '',
  });
  const [error, setError] = useState(null);

  async function onCreate() {
    setError(null);
    const id = String(form.id || '').trim();
    const name = String(form.name || '').trim();
    if (!id || !KEBAB_REGEX.test(id.replace(/_/g, '-'))) {
      // Session IDs autorisent l'underscore (legacy 'dev_s1_foodtech').
      if (!/^[a-z][a-z0-9_-]{0,49}$/.test(id)) {
        setError(t({ fr: 'Identifiant invalide.', en: 'Invalid identifier.', de: 'Ungültige Kennung.' }));
        return;
      }
    }
    if (!name) {
      setError(t(FINALE.finaleSessionName));
      return;
    }
    try {
      await create.mutateAsync({
        editionId: competition.id,
        payload: {
          id,
          name,
          theme: null,
          session_date: form.session_date || null,
          position: 999, // toujours dernier
          notes: null,
        },
      });
      setShowForm(false);
    } catch (err) {
      setError(err?.message || 'Error');
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(FINALE.finaleSection)}
        </h3>
      </header>

      {finale.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!finale.isLoading && finale.data && (
        <div
          className="rounded-[4px] p-3 flex items-start gap-3 flex-wrap"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <Trophy className="w-5 h-5 mt-0.5 shrink-0" style={{ color: GOLD }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: NAVY }}>
              {finale.data.name}
            </p>
            <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>
              {finale.data.id}
              {finale.data.session_date && (
                <> · <span style={{ color: GOLD }}>{finale.data.session_date}</span></>
              )}
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: INK }}>{t(FINALE.finaleExists)}</p>
          </div>
          <a
            href={`/Admin?tab=live&edition=${encodeURIComponent(competition.id)}&session=${encodeURIComponent(finale.data.id)}`}
            className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
          >
            {t(FINALE.finaleLink)}
          </a>
        </div>
      )}

      {!finale.isLoading && !finale.data && !showForm && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[12.5px]" style={{ color: INK }}>{t(FINALE.finaleMissing)}</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px] font-medium"
            style={{ background: NAVY, color: 'white' }}
          >
            <Plus className="w-4 h-4" /> {t(FINALE.createFinale)}
          </button>
        </div>
      )}

      {!finale.isLoading && !finale.data && showForm && (
        <div
          className="rounded-[4px] p-3 mt-2"
          style={{ background: '#fdf6e8', border: `1px solid ${CREAM2}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <FieldLabel htmlFor="finale-id">{t({ fr: 'Identifiant', en: 'Identifier', de: 'Kennung' })}</FieldLabel>
              <input
                id="finale-id"
                type="text"
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>{t(FINALE.finaleIdHint)}</p>
            </div>
            <div>
              <FieldLabel htmlFor="finale-name">{t(FINALE.finaleSessionName)}</FieldLabel>
              <input
                id="finale-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="finale-date">{t(FINALE.finaleDate)}</FieldLabel>
              <input
                id="finale-date"
                type="date"
                value={form.session_date}
                onChange={(e) => setForm((p) => ({ ...p, session_date: e.target.value }))}
                className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}`, color: NAVY }}
              />
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
              onClick={() => { setShowForm(false); setError(null); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-[12.5px]"
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
            >
              {t(UI.cancel)}
            </button>
            {error && (
              <span className="text-[12px]" style={{ color: DANGER }}>{error}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function FinaleTab() {
  const { t } = useLang();
  const competitions = useAllCompetitions();
  const list = competitions.data || [];

  // Éditions ayant has_finale=true (mono OU multi). On garde un fallback safe
  // pour les éditions legacy qui n'ont pas encore la colonne ou pas activé le
  // flag : on les expose si elles sont multiclub (cas historique).
  const withFinale = useMemo(() => {
    return list.filter((c) => c.has_finale === true || c.model === 'multiclub');
  }, [list]);

  const initialId = useMemo(() => {
    if (withFinale.length === 0) return null;
    const ranked = withFinale.find((c) => ['sessions', 'finale', 'open'].includes(c.status)) || withFinale[0];
    return ranked.id;
  }, [withFinale]);

  const [editionId, setEditionId] = useState(initialId);

  // Si on n'a pas encore d'editionId mais que la liste arrive, on bootstrap.
  React.useEffect(() => {
    if (!editionId && initialId) setEditionId(initialId);
  }, [editionId, initialId]);

  const competition = useMemo(
    () => withFinale.find((c) => c.id === editionId) || null,
    [withFinale, editionId],
  );

  return (
    <section
      className="mb-6"
      role="region"
      aria-labelledby="finale-tab-section-heading"
    >
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3
          id="finale-tab-section-heading"
          className="text-[18px]"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(FINALE.sectionTitle)}
        </h3>
        <div className="ml-auto">
          {withFinale.length > 0 && (
            <CompetitionPicker
              value={editionId}
              onChange={setEditionId}
              options={withFinale}
            />
          )}
        </div>
      </header>

      {competitions.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!competitions.isLoading && withFinale.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(FINALE.needMulticlub)}</p>
      )}

      {competition && (
        <>
          <FinaleSessionRow competition={competition} />
          <FinalePoolSection competition={competition} />

          <section className="mb-6">
            <header className="mb-3 flex items-center gap-3 flex-wrap">
              <h3 className="text-[16px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
                {t(FINALE.championsPerClub)}
              </h3>
            </header>
            <ChampionsByClub competition={competition} />
          </section>
        </>
      )}
    </section>
  );
}

// ── FinalePoolSection — V3 Vague 2 (A.3) ─────────────────────────────────────
// Liste les startups membres de platform_finale_membership pour la compétition.
// Action master_admin only : retirer du pool (typed-confirm "RETIRER").
function FinalePoolSection({ competition }) {
  const { t } = useLang();
  const pool = useFinalePool(competition.id);
  const remove = useRemoveFinalist();
  const [confirm, setConfirm] = useState(null); // { startupId, startupName }
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);

  const list = pool.data || [];

  async function doRemove() {
    if (!confirm) return;
    setError(null);
    try {
      await remove.mutateAsync({
        editionId: competition.id,
        startupId: confirm.startupId,
      });
      setConfirm(null);
      setTyped('');
    } catch (err) {
      setError(err?.message || 'Error');
    }
  }

  return (
    <section
      className="rounded-[4px] p-5 mb-6"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <header className="mb-3 flex items-baseline gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(FINALE.poolSectionTitle)}
        </h3>
        <span className="text-[11.5px]" style={{ color: MUTED }}>· {list.length}</span>
      </header>
      <p className="text-[12px] mb-3" style={{ color: MUTED }}>
        {t(FINALE.poolSectionHint)}
      </p>

      {pool.isLoading && (
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!pool.isLoading && list.length === 0 && (
        <p className="text-[12.5px]" style={{ color: MUTED }}>{t(FINALE.poolEmpty)}</p>
      )}

      {!pool.isLoading && list.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: MUTED }}>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">{t(FINALE.poolColStartup)}</th>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">{t(FINALE.poolColClub)}</th>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">{t(FINALE.poolColSource)}</th>
                <th className="text-left uppercase tracking-[0.14em] text-[10.5px] py-2 pr-3">{t(FINALE.poolColPromotedAt)}</th>
                <th className="text-right uppercase tracking-[0.14em] text-[10.5px] py-2">{t(FINALE.poolColActions)}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.startup_id} className="border-t" style={{ borderColor: CREAM2 }}>
                  <td className="py-2 pr-3 align-top">
                    <p className="font-medium" style={{ color: NAVY }}>
                      {row.startup?.name || t(FINALE.poolUnknownStartup)}
                    </p>
                  </td>
                  <td className="py-2 pr-3 align-top" style={{ color: INK }}>
                    {row.club?.name || row.startup?.club_id || t(FINALE.poolUnknownClub)}
                  </td>
                  <td className="py-2 pr-3 align-top text-[12px]" style={{ color: INK }}>
                    {row.session ? (
                      <>
                        <span>{row.session.name}</span>
                        {row.session.session_date && (
                          <span className="block text-[11px]" style={{ color: MUTED }}>{row.session.session_date}</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top tabular-nums text-[11.5px]" style={{ color: MUTED }}>
                    {row.promoted_at ? String(row.promoted_at).slice(0, 10) : '—'}
                  </td>
                  <td className="py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => { setConfirm({ startupId: row.startup_id, startupName: row.startup?.name || row.startup_id }); setTyped(''); setError(null); }}
                      className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                      style={{ color: DANGER, border: `1px solid ${CREAM2}`, background: TINT_ADMIN }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t(FINALE.poolRemoveAction)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 31, 61, 0.45)' }}>
          <div className="bg-white rounded-[4px] max-w-md w-full p-5" style={{ border: `1px solid ${CREAM2}` }}>
            <h3 className="text-[16px] font-medium mb-2" style={{ color: NAVY, fontFamily: SERIF }}>
              {t(FINALE.poolRemoveConfirmTitle)}
            </h3>
            <p className="text-[13px] mb-2" style={{ color: INK }}>
              {t(FINALE.poolRemoveConfirmBody)}
            </p>
            <p className="text-[12.5px] mb-3" style={{ color: NAVY, fontWeight: 500 }}>
              {confirm.startupName}
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t(FINALE.poolRemoveTypedWord)}
              className="w-full text-[13px] rounded-[4px] px-2.5 py-1.5 mb-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
              style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
            />
            {error && (
              <p className="text-[12px] mb-2" style={{ color: DANGER }}>{error}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirm(null); setTyped(''); setError(null); }}
                disabled={remove.isPending}
                className="px-3 py-1.5 text-[12.5px] rounded-[4px]"
                style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
              >
                {t(UI.cancel)}
              </button>
              <button
                type="button"
                onClick={doRemove}
                disabled={remove.isPending || typed !== t(FINALE.poolRemoveTypedWord)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium rounded-[4px] disabled:opacity-50"
                style={{ background: DANGER, color: 'white' }}
              >
                {remove.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t(FINALE.poolRemoveAction)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
