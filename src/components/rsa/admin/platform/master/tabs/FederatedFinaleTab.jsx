// FederatedFinaleTab — Master Cockpit, onglet « Finale fédérée ».
//
// Contenu (compétition multiclub uniquement) :
//   * Section "Championnes & champions par club" — startups en status='finaliste'
//     attachées à une session qualificative du club (kind='qualifying').
//     Le bouton "Promouvoir vers Grande Finale" est en placeholder M4b (disabled).
//   * Section "Grande Finale" — si une session kind='finale' AND club_id=NULL existe
//     pour la compétition, affichage de sa config. Sinon, bouton de création
//     (form ID + name + date) qui appelle rsa_create_session avec kind='finale'.
//
// Reste minimaliste : l'essentiel de l'orchestration finale arrive avec M4b.

import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Trophy } from 'lucide-react';
import {
  CREAM2, NAVY, MUTED, INK, GOLD, SERIF, StatusPill,
} from '@/components/design';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { UI, FINALE, KEBAB_REGEX } from '../i18n';
import {
  useAllCompetitions,
  useClubsForEdition,
  useFinalistsForEdition,
  useFederatedFinale,
  useCreateFederatedFinale,
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
        style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
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

  const clubsList = clubs.data || [];
  const finalistsList = finalists.data || [];

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
            style={{ background: 'white', border: `1px solid ${CREAM2}` }}
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
                    {finalistsForClub.map((s) => (
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
                          <button
                            type="button"
                            disabled
                            title={t(FINALE.promoteTodo)}
                            className="inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-[4px] opacity-50 cursor-not-allowed"
                            style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
                          >
                            {t(FINALE.promoteToFinale)}
                          </button>
                        </td>
                      </tr>
                    ))}
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

function FinaleSection({ competition }) {
  const { t } = useLang();
  const finale = useFederatedFinale(competition.id);
  const create = useCreateFederatedFinale();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: `finale_${competition.year || 'edition'}`,
    name: 'Grande Finale',
    session_date: '',
  });
  const [error, setError] = useState(null);

  async function onCreate() {
    setError(null);
    const id = String(form.id || '').trim();
    const name = String(form.name || '').trim();
    if (!id || !KEBAB_REGEX.test(id.replace(/_/g, '-'))) {
      // Note : session IDs autorisent l'underscore (legacy 'dev_s1_foodtech').
      // On valide qu'il commence par a-z et reste alphanum+_- max 50 chars.
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
      style={{ background: 'white', border: `1px solid ${CREAM2}` }}
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
            style={{ color: NAVY, border: `1px solid ${CREAM2}`, background: 'white' }}
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
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
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
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
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
                style={{ background: 'white', border: `1px solid ${CREAM2}`, color: NAVY }}
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
              style={{ color: INK, border: `1px solid ${CREAM2}`, background: 'white' }}
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

export default function FederatedFinaleTab() {
  const { t } = useLang();
  const competitions = useAllCompetitions();
  const list = competitions.data || [];

  // Multiclub competitions only (la finale fédérée n'a de sens qu'en multi).
  // On préfère par défaut la première en status open/sessions/finale, sinon la
  // plus récente. L'utilisateur peut changer.
  const multiclub = useMemo(() => list.filter((c) => c.model === 'multiclub'), [list]);
  const initialId = useMemo(() => {
    if (multiclub.length === 0) return null;
    const ranked = multiclub.find((c) => ['sessions', 'finale', 'open'].includes(c.status)) || multiclub[0];
    return ranked.id;
  }, [multiclub]);

  const [editionId, setEditionId] = useState(initialId);

  // Si on n'a pas encore d'editionId mais que la liste arrive, on bootstrap.
  React.useEffect(() => {
    if (!editionId && initialId) setEditionId(initialId);
  }, [editionId, initialId]);

  const competition = useMemo(
    () => multiclub.find((c) => c.id === editionId) || null,
    [multiclub, editionId],
  );

  return (
    <section className="mb-6">
      <header className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
          {t(FINALE.sectionTitle)}
        </h3>
        <div className="ml-auto">
          {multiclub.length > 0 && (
            <CompetitionPicker
              value={editionId}
              onChange={setEditionId}
              options={multiclub}
            />
          )}
        </div>
      </header>

      {competitions.isLoading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MUTED }} />
        </div>
      )}

      {!competitions.isLoading && multiclub.length === 0 && (
        <p className="text-[13px] py-3" style={{ color: MUTED }}>{t(FINALE.needMulticlub)}</p>
      )}

      {competition && (
        <>
          <FinaleSection competition={competition} />

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
