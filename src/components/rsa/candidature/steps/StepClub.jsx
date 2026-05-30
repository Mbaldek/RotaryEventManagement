// Étape Club — affiliation OBLIGATOIRE de la startup à un club organisateur
// (blueprint jury-application-funnel §5 ; décision verrouillée §9.1).
//
// Le candidat choisit un club parmi ceux rattachés à la compétition (table
// edition_clubs). Le choix est BLOQUANT : la soumission reste impossible tant
// qu'aucun club n'est sélectionné (cf. validation.js#REQUIRED_FIELDS_STATIC +
// validateField('club_id')). Persisté sur startups.club_id via l'autosave parent.
//
// Décision verrouillée : HINT seul (« le club de votre pays ou le plus proche »).
// PAS de champ pays candidat, PAS de tri/matching automatique en V1.
//
// Source des clubs : EditionClub.forEdition(editionId) (clubs de CETTE compétition).
// Repli sur Club.listAll() uniquement si l'édition n'expose aucun club scopé, pour
// ne jamais présenter un sélecteur vide quand des clubs existent globalement.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Field, Select, MUTED, GOLD } from '@/components/design';
import { useLang } from '@/lib/platform/i18n';
import { Club, EditionClub } from '@/lib/rsa/entities';
import { STEPS, FIELDS, UI } from '../i18n';
import StepShell from './StepShell';
import { validateField } from '../validation';

// Index du step 'club' dans STEPS (résolu dynamiquement pour rester robuste à
// l'ordre — on n'écrit pas l'index en dur comme les steps historiques).
const CLUB_STEP_LABEL = STEPS.find((s) => s.id === 'club')?.label
  || { fr: 'Club', en: 'Club', de: 'Club' };

// Charge les clubs de la compétition (puis repli global). Renvoie une liste
// normalisée [{ id, name, country, region }] dédupliquée par id.
async function loadClubsForEdition(editionId) {
  let rows = [];
  if (editionId) {
    const junctions = await EditionClub.forEdition(editionId);
    rows = (junctions || [])
      .map((j) => j.club || (j.club_id ? { id: j.club_id } : null))
      .filter(Boolean);
  }
  // Repli : aucune junction → on propose tous les clubs (sélecteur jamais vide
  // si des clubs existent). Choix volontairement large (cf. blueprint : hint seul).
  if (rows.length === 0) {
    rows = await Club.listAll();
  }
  const seen = new Set();
  const out = [];
  for (const c of rows || []) {
    if (!c?.id || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ id: c.id, name: c.name || c.id, country: c.country || null, region: c.region || null });
  }
  return out;
}

export default function StepClub({ value, onChange, errors = {}, editionId, disabled = false }) {
  const { t } = useLang();
  const v = value || {};
  const err = (field) => (errors[field] ? t(UI[errors[field]]) : undefined);

  const { data: clubs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['rsa', 'candidature-clubs', editionId || 'all'],
    queryFn: () => loadClubsForEdition(editionId),
    staleTime: 5 * 60 * 1000,
  });

  // Libellé : nom + (pays · région) en repère discret, sans matching/tri auto.
  const options = clubs.map((c) => {
    const loc = [c.country, c.region].filter(Boolean).join(' · ');
    return { value: c.id, label: loc ? `${c.name} — ${loc}` : c.name };
  });

  // Si la valeur stockée ne fait plus partie des clubs proposés (édition changée,
  // club détaché…), on l'expose quand même comme option afin que le Select ne la
  // « perde » pas silencieusement avant que le candidat re-choisisse.
  const hasCurrent = v.club_id && options.some((o) => o.value === v.club_id);
  const finalOptions = !hasCurrent && v.club_id
    ? [{ value: v.club_id, label: v.club_id }, ...options]
    : options;

  const empty = !isLoading && !isError && options.length === 0;

  return (
    <StepShell
      eyebrow={t(CLUB_STEP_LABEL)}
      title={t(UI.clubStepTitle)}
      subtitle={t(UI.clubStepSubtitle)}
    >
      <Field
        label={t(FIELDS.club_id.label)}
        required
        helper={t(UI.clubRecommendHint)}
        error={err('club_id')}
      >
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            disabled={disabled || isLoading || empty}
            value={v.club_id ?? ''}
            onChange={(e) => onChange?.('club_id', e.target.value || null)}
            placeholder={t(UI.clubSelectPlaceholder)}
            options={finalOptions}
          />
        )}
      </Field>

      {isLoading && (
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: MUTED }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} aria-hidden />
          {t(UI.clubLoading)}
        </div>
      )}

      {isError && (
        <div className="text-[13px]" style={{ color: MUTED }} role="alert">
          {t(UI.clubLoadError)}{' '}
          <button
            type="button"
            onClick={() => refetch()}
            className="underline underline-offset-2 font-medium rounded-[4px] px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
            style={{ color: GOLD }}
          >
            {t(UI.retry)}
          </button>
        </div>
      )}

      {empty && (
        <p className="text-[13px]" style={{ color: MUTED }}>
          {t(UI.clubEmpty)}
        </p>
      )}
    </StepShell>
  );
}

// Validation de l'étape (réutilisée par le funnel pour les points « incomplet »
// et la coupure de soumission). Aligné sur le pattern des autres steps.
StepClub.validate = (v) => {
  const out = {};
  const e = validateField('club_id', v?.club_id, v);
  if (e) out.club_id = e;
  return out;
};
