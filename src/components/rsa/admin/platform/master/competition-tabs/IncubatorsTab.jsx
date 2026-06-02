import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/platform/i18n';
import { SectionNote, TextRow } from './fields';
import IncubatorEditModal from './IncubatorEditModal';
import ClubIncubatorsManager from '@/components/rsa/incubators/ClubIncubatorsManager';
import {
  useAllIncubators,
  useEditionClubLinks,
  useDeleteIncubator,
  useSourcingStats,
} from '@/components/rsa/hooks/useIncubators';
import { useClubsForEdition } from '../useMaster';
import { Edition } from '@/lib/rsa/entities/editions';
import { uploadCommAsset, commAssetPublicUrl } from '@/lib/rsa/storage';

export default function IncubatorsTab({ competition, mode = 'edit' }) {
  const { t } = useLang();
  const editionId = competition?.id;
  const isMulti = (competition?.model || 'monoclub') === 'multiclub';

  // ALL hooks must be called unconditionally before any early return.
  const { data: attachedClubs = [] } = useClubsForEdition(editionId);

  const [editionFull, setEditionFull] = useState(competition || {});
  const [config, setConfig] = useState(competition?.comm_pack_config || {});
  const seededRef = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!editionId) return;
    Edition.get(editionId).then((e) => {
      if (!e) return;
      setEditionFull(e);
      // Seed local config only once on first server load so we don't clobber
      // any edits the user may have made before the fetch resolved.
      if (!seededRef.current) {
        seededRef.current = true;
        setConfig(e.comm_pack_config || {});
      }
    });
  }, [editionId]);

  // Clear the debounce timer on unmount (pending write within 600 ms will be lost;
  // that is acceptable — the alternative is an uncontrolled write after unmount).
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const [generating, setGenerating] = useState(false);

  // Monoclub : le club unique attaché porte l'opt-in + les contacts.
  const soloClubId = useMemo(
    () => (attachedClubs.length > 0 ? (attachedClubs[0].club_id || attachedClubs[0].club?.id) : null),
    [attachedClubs],
  );

  // Early return AFTER all hooks.
  if (mode === 'create' || !editionId) {
    return (
      <SectionNote>
        {t({
          fr: 'Disponible après la création de la compétition.',
          en: 'Available after the competition is created.',
          de: 'Nach Erstellung des Wettbewerbs verfügbar.',
        })}
      </SectionNote>
    );
  }

  // patchConfig: updates local state immediately and schedules a debounced DB write.
  // One DB write fires 600 ms after the last edit — no write-per-keystroke.
  const patchConfig = (partial) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        Edition.update(editionId, { comm_pack_config: next }).catch(() => {});
      }, 600);
      return next;
    });
  };

  const onGenerate = async () => {
    setGenerating(true);
    try {
      // Flush any pending debounced write so the DB is current before generating.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      await Edition.update(editionId, { comm_pack_config: config }).catch(() => {});

      const { buildCommPackZip } = await import('@/lib/rsa/comm-pack/buildZip');
      const fetchAsset = async (path) => {
        const url = commAssetPublicUrl(path);
        if (!url) return null;
        const res = await fetch(url);
        return res.ok ? res.blob() : null;
      };
      // Pass the merged edition so the ZIP builder sees the latest local config.
      const blob = await buildCommPackZip({ ...editionFull, comm_pack_config: config }, { fetchAsset });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(editionFull.name || 'kit').replace(/\s+/g, '-')}-${editionFull.year || ''}-kit-com.zip`;
      const href = a.href;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
    } finally { setGenerating(false); }
  };

  return (
    <div className="space-y-6">
      {isMulti ? (
        <section>
          <SectionNote>
            {t({
              fr: 'Compétition multi-club : chaque club gère sa propre liste d’incubateurs et ses contacts depuis son Cockpit Club. Ci-dessous, la base globale (partagée) et le récap des opt-in par club.',
              en: 'Multi-club competition: each club manages its own incubator list and contacts from its Club Cockpit. Below, the shared global base and the per-club opt-in summary.',
              de: 'Multi-Club-Wettbewerb: Jeder Club verwaltet seine eigene Inkubatorenliste und Kontakte über sein Club-Cockpit. Unten die gemeinsame globale Basis und die Opt-in-Übersicht pro Club.',
            })}
          </SectionNote>
          <MulticlubOverview editionId={editionId} t={t} />
        </section>
      ) : soloClubId ? (
        <ClubIncubatorsManager editionId={editionId} clubId={soloClubId} canEditBase />
      ) : (
        <SectionNote>
          {t({
            fr: 'Attachez d’abord un club à cette compétition (onglet Clubs) pour gérer les incubateurs.',
            en: 'Attach a club to this competition first (Clubs tab) to manage incubators.',
            de: 'Verknüpfen Sie zuerst einen Club mit diesem Wettbewerb (Tab Clubs), um Inkubatoren zu verwalten.',
          })}
        </SectionNote>
      )}

      <section className="border-t border-[#e7e1d6] pt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
          {t({ fr: 'Pack de communication', en: 'Communication pack', de: 'Kommunikationspaket' })}
        </h3>

        {['fr', 'en', 'de'].map((lng) => (
          <div key={lng} className="mb-4">
            <p className="mb-1 text-xs font-semibold text-[#7a7367]">{lng.toUpperCase()}</p>
            <TextRow id={`tagline-${lng}`} label={t({ fr: 'Accroche', en: 'Tagline', de: 'Slogan' })}
              value={config.tagline?.[lng] ?? ''}
              onChange={(val) => patchConfig({ tagline: { ...(config.tagline || {}), [lng]: val } })} />
            <TextRow id={`venue-${lng}`} label={t({ fr: 'Lieu cérémonie', en: 'Ceremony venue', de: 'Veranstaltungsort' })}
              value={config.ceremony_venue?.[lng] ?? ''}
              onChange={(val) => patchConfig({ ceremony_venue: { ...(config.ceremony_venue || {}), [lng]: val } })} />
          </div>
        ))}

        <TextRow id="contact-name" label={t({ fr: 'Contact — nom', en: 'Contact — name', de: 'Kontakt — Name' })}
          value={config.contact?.name ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), name: val } })} />
        <TextRow id="contact-phone" label={t({ fr: 'Contact — téléphone', en: 'Contact — phone', de: 'Kontakt — Telefon' })}
          value={config.contact?.phone ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), phone: val } })} />
        <TextRow id="contact-email" label={t({ fr: 'Contact — email', en: 'Contact — email', de: 'Kontakt — E-Mail' })}
          value={config.contact?.email ?? ''} onChange={(val) => patchConfig({ contact: { ...(config.contact || {}), email: val } })} />

        <div className="mt-4 space-y-2">
          <AssetUpload label={t({ fr: 'Logo', en: 'Logo', de: 'Logo' })} kind="logo" current={config.assets?.logo_path}
            onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), logo_path: path } })} editionId={editionId} />
          {['fr', 'en', 'de'].map((lng) => (
            <AssetUpload key={`reg-${lng}`} label={`Règlement ${lng.toUpperCase()}`} kind={`reglement-${lng}`}
              current={config.assets?.reglement?.[lng]}
              onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), reglement: { ...(config.assets?.reglement || {}), [lng]: path } } })}
              editionId={editionId} />
          ))}
          {['fr', 'en', 'de'].map((lng) => (
            <AssetUpload key={`pos-${lng}`} label={`Affiche ${lng.toUpperCase()}`} kind={`affiche-${lng}`}
              current={config.assets?.poster?.[lng]}
              onUploaded={(path) => patchConfig({ assets: { ...(config.assets || {}), poster: { ...(config.assets?.poster || {}), [lng]: path } } })}
              editionId={editionId} />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="button" className="rounded-lg bg-[#0a1f44] px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={generating} onClick={onGenerate}>
            {generating ? t({ fr: 'Génération…', en: 'Generating…', de: 'Erzeugen…' }) : t({ fr: 'Générer le ZIP ⤓', en: 'Generate ZIP ⤓', de: 'ZIP erzeugen ⤓' })}
          </button>
        </div>
      </section>

      <section className="border-t border-[#e7e1d6] pt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
          {t({ fr: 'Provenance des candidats', en: 'Applicant sourcing', de: 'Herkunft der Bewerber' })}
        </h3>
        <SourcingTable editionId={editionId} t={t} />
      </section>
    </div>
  );
}

// MulticlubOverview — vue master en multi-club : base globale (création/édition/
// suppression master) + récap des opt-in par club (lecture). La gestion fine de
// l'opt-in + contact se fait dans chaque Cockpit Club.
function MulticlubOverview({ editionId, t }) {
  const { data: all = [] } = useAllIncubators();
  const { data: links = [] } = useEditionClubLinks(editionId);
  const del = useDeleteIncubator();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const stats = useMemo(() => {
    const m = {};
    for (const l of links) {
      const s = (m[l.incubator_id] ||= { clubs: new Set(), contacts: 0 });
      s.clubs.add(l.club_id);
      if (l.contact_name || l.contact_email) s.contacts += 1;
    }
    return m;
  }, [links]);

  return (
    <div className="mt-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0a1f44]">
          {t({ fr: 'Base globale d’incubateurs', en: 'Global incubator base', de: 'Globale Inkubatoren-Basis' })}
        </h3>
        <button
          type="button"
          className="rounded-lg border border-[#0a1f44] px-3 py-1.5 text-sm text-[#0a1f44]"
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          + {t({ fr: 'Nouvel incubateur', en: 'New incubator', de: 'Neuer Inkubator' })}
        </button>
      </div>

      {all.length === 0 ? (
        <SectionNote>
          {t({ fr: 'Aucun incubateur dans la base. Créez-en un.', en: 'No incubators yet. Create one.', de: 'Noch keine Inkubatoren. Erstellen Sie einen.' })}
        </SectionNote>
      ) : (
        <ul className="space-y-2">
          {all.map((inc) => {
            const s = stats[inc.id];
            const clubCount = s ? s.clubs.size : 0;
            return (
              <li key={inc.id} className="flex items-center gap-3 rounded-xl border border-[#e7e1d6] bg-white px-3 py-2">
                <span className="flex-1 text-sm">
                  {inc.name}{' '}
                  {inc.country ? <em className="text-xs text-[#7a7367]">· {inc.country}</em> : null}
                </span>
                <span className="text-xs text-[#7a7367]">
                  {clubCount > 0
                    ? t({
                        fr: `opté par ${clubCount} club${clubCount > 1 ? 's' : ''} · ${s.contacts} contact${s.contacts > 1 ? 's' : ''}`,
                        en: `${clubCount} club${clubCount > 1 ? 's' : ''} opted · ${s.contacts} contact${s.contacts > 1 ? 's' : ''}`,
                        de: `${clubCount} Club(s) · ${s.contacts} Kontakt(e)`,
                      })
                    : t({ fr: 'aucun club', en: 'no club', de: 'kein Club' })}
                </span>
                <button type="button" className="px-1 text-xs text-[#7a7367]"
                  onClick={() => { setEditing(inc); setModalOpen(true); }} aria-label={`edit ${inc.name}`}>✎</button>
                <button type="button" className="px-1 text-xs text-red-700" aria-label={`delete ${inc.name}`}
                  onClick={() => {
                    if (confirm(t({
                      fr: 'Supprimer cet incubateur de la base globale ?',
                      en: 'Delete this incubator from the global base?',
                      de: 'Diesen Inkubator löschen?',
                    }))) del.mutate(inc.id);
                  }}>🗑</button>
              </li>
            );
          })}
        </ul>
      )}

      <IncubatorEditModal open={modalOpen} onClose={() => setModalOpen(false)} incubator={editing} />
    </div>
  );
}

function AssetUpload({ label, kind, current, onUploaded, editionId }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      const path = await uploadCommAsset({ editionId, kind, file });
      onUploaded(path);
    } catch (err) {
      console.error('uploadCommAsset failed', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 text-[#7a7367]">{label}</span>
      <input type="file" onChange={onFile} disabled={busy} />
      {current ? <a className="text-xs text-[#0a1f44] underline" href={commAssetPublicUrl(current)} target="_blank" rel="noreferrer">✓</a> : null}
      {failed ? <span className="text-xs text-red-700">⚠</span> : null}
    </div>
  );
}

function SourcingTable({ editionId, t }) {
  const { data } = useSourcingStats(editionId);
  const { data: all = [] } = useAllIncubators();
  const allById = useMemo(() => Object.fromEntries(all.map((i) => [i.id, i])), [all]);
  if (!data || data.total === 0) {
    return <SectionNote>{t({ fr: 'Aucune candidature soumise pour le moment.', en: 'No submitted applications yet.', de: 'Noch keine eingereichten Bewerbungen.' })}</SectionNote>;
  }
  const rows = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="space-y-1 text-sm">
      {rows.map(([id, n]) => (
        <li key={id} className="flex justify-between"><span>{allById[id]?.name || id}</span><span className="font-semibold">{n}</span></li>
      ))}
      {data.other > 0 && (
        <li className="flex justify-between text-[#7a7367]"><span>{t({ fr: 'Autre', en: 'Other', de: 'Andere' })}</span><span>{data.other}</span></li>
      )}
      {data.none > 0 && (
        <li className="flex justify-between text-[#7a7367]"><span>{t({ fr: 'Non renseigné', en: 'Not specified', de: 'Nicht angegeben' })}</span><span>{data.none}</span></li>
      )}
    </ul>
  );
}
