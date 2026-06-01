// PilotageTab — onglet "Pilotage" (B-pilotage-tab) du CompetitionEditView.
//
// Première tab par défaut après création/ouverture d'une compétition : présente
// un checklist visuel des étapes de configuration restantes (clubs, admins,
// sessions, finale, URLs publiques) avec CTAs contextuels pour naviguer dans
// les bons écrans/tabs.
//
// Composition Élysée :
//   * Section opener "S-Gold-Rule" (barre gold + eyebrow uppercase + titre Playfair)
//   * Liste "L-Numbered-Hairline" — 6 steps avec hairline gauche gold/muted selon
//     état (done / pending / blocked / optional)
//   * Tokens : NAVY/GOLD/CREAM2/INK/MUTED/GREEN_TODAY pour done, MUTED pour pending
//
// Le tab ne fait que LECTURE et navigation — toutes les actions sont déléguées
// aux autres tabs / pages (Clubs, Roles, Cockpit club, Finale).

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Circle, AlertTriangle, ArrowRight, Flag,
  Users, ShieldCheck, Calendar, Trophy, ClipboardCheck,
} from 'lucide-react';
import {
  CREAM2, NAVY, INK, MUTED, GOLD, GREEN_TODAY, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { GOLD_TEXT, WARNING } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import { EDITION_STATUSES } from '../../i18n';
import { COMP, PILOTAGE } from '../i18n';
import { SelectRow } from './fields';
import usePilotageStatus from '../usePilotageStatus';

// ── Helpers visuels ────────────────────────────────────────────────────────

// S-Gold-Rule opener (barre gold 64px + eyebrow uppercase tracked + Playfair).
function GoldRuleOpener({ eyebrow, title, hint, titleId }) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <span
          className="h-[1.5px] origin-left"
          style={{ background: GOLD, width: 64 }}
          aria-hidden
        />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD_TEXT }}
        >
          {eyebrow}
        </span>
      </div>
      <h3
        id={titleId}
        className="text-[20px]"
        style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
      >
        {title}
      </h3>
      {hint && (
        <p className="text-[12.5px] mt-1 max-w-2xl" style={{ color: INK }}>
          {hint}
        </p>
      )}
    </header>
  );
}

// Pill petite — statut d'une step. done=GREEN_TODAY, pending=MUTED, optional=GOLD_TEXT.
function StatusPillSmall({ kind, children }) {
  const palette = {
    done:     { bg: '#ecf1e5', color: GREEN_TODAY, border: '#d6e0c7' },
    pending:  { bg: '#fdf6e8', color: GOLD_TEXT,   border: CREAM2 },
    optional: { bg: '#eff1f6', color: MUTED,       border: CREAM2 },
  };
  const p = palette[kind] || palette.pending;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.12em] font-medium"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
    >
      {children}
    </span>
  );
}

// CTA hairline — bouton secondaire éditorial (gold hairline + navy text).
function CtaButton({ children, onClick, disabled, icon: Icon, kind = 'primary' }) {
  const isPrimary = kind === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={isPrimary
        ? { background: NAVY, color: 'white' }
        : { background: TINT_ADMIN, color: NAVY, border: `1px solid ${CREAM2}` }
      }
    >
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden />}
      {children}
    </button>
  );
}

// Step card — L-Numbered-Hairline avec hairline gauche colorée selon état.
function StepCard({ index, done, optional, blocked, icon: Icon, title, children, statusLabel }) {
  let railColor = MUTED;       // pending default
  let StatusIcon = Circle;
  if (done) { railColor = GREEN_TODAY; StatusIcon = CheckCircle2; }
  else if (optional) { railColor = GOLD; StatusIcon = Circle; }
  else if (blocked)  { railColor = WARNING; StatusIcon = AlertTriangle; }

  return (
    <li
      className="grid grid-cols-[44px_1fr] items-stretch gap-0"
      style={{ borderBottom: `1px solid ${CREAM2}` }}
    >
      {/* Rail gauche : numéro + barre hairline gold/green/muted */}
      <div
        className="flex flex-col items-center pt-4 pb-4"
        style={{ borderRight: `2px solid ${railColor}` }}
      >
        <span
          className="text-[11px] uppercase tracking-[0.14em] tabular-nums"
          style={{ color: MUTED, fontFamily: SERIF }}
        >
          {String(index).padStart(2, '0')}
        </span>
        <StatusIcon
          className="w-4 h-4 mt-2"
          style={{ color: railColor }}
          aria-hidden
        />
      </div>
      <div className="py-4 pl-5 pr-2 min-w-0">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1.5">
          <h4
            className="text-[15px] flex items-center gap-2"
            style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: GOLD }} aria-hidden />}
            {title}
          </h4>
          {statusLabel && (
            <StatusPillSmall kind={done ? 'done' : optional ? 'optional' : 'pending'}>
              {statusLabel}
            </StatusPillSmall>
          )}
        </div>
        <div className="text-[12.5px]" style={{ color: INK }}>
          {children}
        </div>
      </div>
    </li>
  );
}

// Phrase localisée avec compteur stylé : remplace {count}/{recommended} (ou
// {with}/{total}) par un <strong> coloré sémantiquement (done=green / partial=ink /
// none=muted), tout en laissant le reste du label en INK. Utilise les clés i18n
// existantes ({count}/{recommended}, {with}/{total}). Le sr-only assure que le
// compteur reste lu par les screen readers comme un nombre, pas comme deux nombres
// séparés.
function StatusCounterPhrase({ template, current, target, role = 'status' }) {
  let color = MUTED;
  if (target > 0 && current >= target) color = GREEN_TODAY;
  else if (current > 0) color = INK;
  // Détecte le format de placeholders utilisé dans le template :
  //   "{count}/{recommended} clubs"  ou  "{with}/{total} clubs"
  const tplWithSlash = template
    .replace('{count}/{recommended}', '@@COUNTER@@')
    .replace('{with}/{total}', '@@COUNTER@@');
  const [before, after] = tplWithSlash.split('@@COUNTER@@');
  return (
    <p role={role} aria-live="polite" className="text-[12.5px]" style={{ color: INK }}>
      {before}
      <strong className="tabular-nums" style={{ color, fontWeight: 500 }}>
        {current}/{target}
      </strong>
      {after}
    </p>
  );
}

// Libellés lisibles des phases du cycle de vie (le select brut affiche les
// codes draft/open/… ; ici on les humanise FR/EN/DE). L'ordre suit
// EDITION_STATUSES. « open » = compétition en ligne, candidatures ouvertes.
const STATUS_LABEL = {
  draft:     { fr: 'Brouillon',                en: 'Draft',                de: 'Entwurf' },
  open:      { fr: 'En ligne — candidatures',  en: 'Live — applications',  de: 'Live — Bewerbungen' },
  selection: { fr: 'Sélection',                en: 'Selection',            de: 'Auswahl' },
  sessions:  { fr: 'Sessions',                 en: 'Sessions',             de: 'Sessions' },
  finale:    { fr: 'Finale',                   en: 'Finale',               de: 'Finale' },
  closed:    { fr: 'Clôturée',                 en: 'Closed',               de: 'Abgeschlossen' },
};

// StatusBand — pilotage du cycle de vie de la compétition (draft→open→…).
// Vit en tête de l'onglet Pilotage : c'est l'action « passer en live ». Volon-
// tairement SANS gate sur la complétion de la checklist — on peut lancer même
// partiellement configuré (organisation au dernier moment assumée).
function StatusBand({ value, onChange, t }) {
  const current = value || 'draft';
  const isLive = current !== 'draft' && current !== 'closed';
  return (
    <div
      className="rounded-[4px] px-4 py-3.5 mb-5"
      style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Flag className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden />
        <span
          className="uppercase text-[10px] tracking-[0.18em] font-medium"
          style={{ color: GOLD_TEXT }}
        >
          {t({ fr: 'Statut de la compétition', en: 'Competition status', de: 'Status des Wettbewerbs' })}
        </span>
      </div>
      <div className="max-w-xs">
        <SelectRow
          id="pilotage-status"
          label={t(COMP.status)}
          value={current}
          onChange={onChange}
          options={EDITION_STATUSES.map((s) => ({ value: s, label: t(STATUS_LABEL[s] || { fr: s, en: s, de: s }) }))}
        />
      </div>
      <p className="text-[12px] mt-2.5 flex items-start gap-1.5" style={{ color: INK }}>
        <span style={{ color: isLive ? GREEN_TODAY : MUTED }} aria-hidden>●</span>
        <span>
          {t({
            fr: 'Passez en « En ligne » pour ouvrir les candidatures. Indépendant de la complétion ci-dessous — vous pouvez lancer même partiellement configuré.',
            en: 'Switch to “Live” to open applications. Independent of the completion below — you can launch even when partially configured.',
            de: 'Auf „Live“ stellen, um Bewerbungen zu öffnen. Unabhängig vom Fortschritt unten — Sie können auch teilweise konfiguriert starten.',
          })}
        </span>
      </p>
    </div>
  );
}

// ── PilotageTab principal ──────────────────────────────────────────────────

export default function PilotageTab({ competition, setActiveTab, onPatch }) {
  const { t } = useLang();
  const [, setSearchParams] = useSearchParams();
  const status = usePilotageStatus({ competition });
  const { steps, summary } = status;

  // ── Navigation helpers ────────────────────────────────────────────────────
  function gotoClubsTab() {
    setActiveTab?.('clubs');
  }
  function gotoFinaleTab() {
    // V2.6 sessions-finale unification — la Grande Finale vit désormais en tête
    // de l'onglet Sessions (une finale n'est qu'une session de plus). Cf.
    // docs/blueprints/sessions-finale-unification.md.
    setActiveTab?.('sessions');
  }
  function gotoMasterRoles() {
    // Navigation intra-cockpit (MasterCockpit lit ?tab= depuis useSearchParams).
    // On reset `subview` et `id` puisqu'on quitte la vue d'édition.
    const next = new URLSearchParams();
    next.set('scope', 'master');
    next.set('tab', 'roles');
    setSearchParams(next, { replace: false });
  }
  function gotoClubCockpit(clubId) {
    if (!clubId) return;
    // Refonte hiérarchie : Admin.jsx dérive désormais le scope depuis l'URL
    // (useSearchParams), donc setSearchParams suffit (plus de window.location.href
    // qui forcait un reload). On pousse le scope canonique club:{eid}/{cid}
    // pour conserver le breadcrumb Master ▸ Compétition ▸ Club.
    const editionId = competition?.id;
    if (!editionId) return;
    const next = new URLSearchParams();
    next.set('scope', `club:${editionId}/${clubId}`);
    setSearchParams(next, { replace: false });
  }

  // ── Mapping steps[] → JSX par id ─────────────────────────────────────────
  const [s1, s2, s3, s4, s5] = steps;

  // Labels statut
  const lblDone     = t(PILOTAGE.statusDone);
  const lblPending  = t(PILOTAGE.statusPending);
  const lblOptional = t(PILOTAGE.statusOptional);

  // Header completion pct
  const pct = summary.completionPercent;

  return (
    <section
      role="region"
      aria-labelledby="pilotage-section-heading"
    >
      <GoldRuleOpener
        eyebrow={t(PILOTAGE.eyebrow)}
        title={t(PILOTAGE.checklistTitle)}
        hint={t(PILOTAGE.checklistIntro)}
        titleId="pilotage-section-heading"
      />

      {/* Statut / cycle de vie — l'action « passer en live » (sans gate). */}
      <StatusBand
        value={competition?.status}
        onChange={(v) => onPatch?.({ status: v })}
        t={t}
      />

      {/* Pulse bar : completion percent en haut, hairline + Playfair number. */}
      <div
        className="rounded-[4px] px-4 py-3 mb-5 flex items-baseline justify-between gap-3 flex-wrap"
        style={{ background: TINT_ADMIN, border: `1px solid ${CREAM2}` }}
        role="status"
        aria-live="polite"
      >
        <span
          className="text-[10.5px] uppercase tracking-[0.16em]"
          style={{ color: MUTED }}
        >
          {t(PILOTAGE.completionLabel)}
        </span>
        <div className="flex-1 mx-3 h-[3px] rounded-full overflow-hidden" style={{ background: CREAM2 }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? GREEN_TODAY : GOLD,
            }}
            aria-hidden
          />
        </div>
        <span
          className="text-[18px] tabular-nums"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(PILOTAGE.completionTemplate).replace('{percent}', String(pct))}
        </span>
      </div>

      <ol className="rounded-[4px] overflow-hidden" style={{ border: `1px solid ${CREAM2}` }}>
        {/* ── Step 1 — Compétition créée ───────────────────────────────────── */}
        <StepCard
          index={1}
          done={s1.done}
          icon={ClipboardCheck}
          title={t(PILOTAGE.step1Title)}
          statusLabel={lblDone}
        >
          <p>{t(PILOTAGE.step1Subtitle)}</p>
          <p className="mt-1" style={{ color: MUTED }}>
            {t(PILOTAGE.step1Fill).replace('{percent}', String(s1.identityPercent))}
          </p>
          {s1.identityPercent < 100 && (
            <div className="mt-3">
              <CtaButton
                kind="secondary"
                icon={ArrowRight}
                onClick={() => setActiveTab?.('identity')}
              >
                {t(PILOTAGE.step1CtaEditIdentity)}
              </CtaButton>
            </div>
          )}
        </StepCard>

        {/* ── Step 2 — Clubs participants attachés ─────────────────────────── */}
        <StepCard
          index={2}
          done={s2.done}
          icon={Users}
          title={t(PILOTAGE.step2Title)}
          statusLabel={s2.done ? lblDone : lblPending}
        >
          <StatusCounterPhrase
            template={t(PILOTAGE.step2Count)}
            current={s2.count}
            target={s2.recommended}
          />
          {s2.count === 0 && (
            <p className="mt-1" style={{ color: WARNING }}>
              {summary.isMonoclub ? t(PILOTAGE.step2EmptyMono) : t(PILOTAGE.step2EmptyMulti)}
            </p>
          )}
          <div className="mt-3">
            <CtaButton icon={ArrowRight} onClick={gotoClubsTab}>
              {t(PILOTAGE.step2CtaAttach)}
            </CtaButton>
          </div>
        </StepCard>

        {/* ── Step 3 — Club admins assignés ────────────────────────────────── */}
        <StepCard
          index={3}
          done={s3.done}
          blocked={!!s3.blockedBy}
          icon={ShieldCheck}
          title={t(PILOTAGE.step3Title)}
          statusLabel={s3.done ? lblDone : lblPending}
        >
          {s3.blockedBy === 'clubs' ? (
            <p style={{ color: MUTED }}>{t(PILOTAGE.step3NoClubsYet)}</p>
          ) : (
            <>
              <StatusCounterPhrase
                template={t(PILOTAGE.step3Count)}
                current={s3.withAdmin}
                target={s3.total}
              />
              {s3.missingClubs.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11.5px] uppercase tracking-[0.12em] mb-1" style={{ color: MUTED }}>
                    {t(PILOTAGE.step3MissingHeading)}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {s3.missingClubs.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-[12px]" style={{ color: INK }}>
                        <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: WARNING }} aria-hidden />
                        <span className="truncate">{c.name}</span>
                        <span className="font-mono text-[10.5px]" style={{ color: MUTED }}>· {c.id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <CtaButton
                  icon={ArrowRight}
                  onClick={gotoMasterRoles}
                  disabled={s3.blockedBy === 'clubs'}
                >
                  {t(PILOTAGE.step3CtaInvite)}
                </CtaButton>
              </div>
            </>
          )}
        </StepCard>

        {/* ── Step 4 — Sessions configurées ────────────────────────────────── */}
        <StepCard
          index={4}
          done={s4.done}
          blocked={!!s4.blockedBy}
          icon={Calendar}
          title={t(PILOTAGE.step4Title)}
          statusLabel={s4.done ? lblDone : lblPending}
        >
          {s4.blockedBy === 'clubs' && (
            <p style={{ color: MUTED }}>{t(PILOTAGE.step3NoClubsYet)}</p>
          )}
          {s4.blockedBy === 'admins' && (
            <p style={{ color: MUTED }}>{t(PILOTAGE.step4NeedsAdmin)}</p>
          )}
          {!s4.blockedBy && (
            <>
              <StatusCounterPhrase
                template={t(PILOTAGE.step4Count)}
                current={s4.withSessions}
                target={s4.total}
              />
              {s4.missingClubs.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11.5px] uppercase tracking-[0.12em] mb-1" style={{ color: MUTED }}>
                    {t(PILOTAGE.step4MissingHeading)}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {s4.missingClubs.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-[12px]" style={{ color: INK }}>
                        <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: WARNING }} aria-hidden />
                        <span className="truncate">{c.name}</span>
                        <span className="font-mono text-[10.5px]" style={{ color: MUTED }}>· {c.id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {s4.firstMissing && (
                <div className="mt-3">
                  <CtaButton
                    icon={ArrowRight}
                    onClick={() => gotoClubCockpit(s4.firstMissing.id)}
                  >
                    {t(PILOTAGE.step4CtaCockpit).replace('{clubName}', s4.firstMissing.name)}
                  </CtaButton>
                </div>
              )}
            </>
          )}
        </StepCard>

        {/* ── Step 5 — Finale configurée ───────────────────────────────────── */}
        <StepCard
          index={5}
          done={s5.done}
          optional={s5.optional}
          icon={Trophy}
          title={t(PILOTAGE.step5Title)}
          statusLabel={s5.done ? lblDone : s5.optional ? lblOptional : lblPending}
        >
          {!s5.enabled ? (
            <>
              <p style={{ color: MUTED }}>{t(PILOTAGE.step5Disabled)}</p>
              <div className="mt-3">
                <CtaButton
                  kind="secondary"
                  icon={ArrowRight}
                  onClick={gotoFinaleTab}
                >
                  {t(PILOTAGE.step5CtaEnable)}
                </CtaButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ color: INK }}>
                  <strong style={{ color: NAVY }}>
                    {s5.date || t(PILOTAGE.step5MissingDate)}
                  </strong>
                  <span style={{ color: MUTED }}> · </span>
                  <span style={{ color: s5.location ? INK : WARNING }}>
                    {s5.location || t(PILOTAGE.step5MissingLocation)}
                  </span>
                </span>
              </div>
              <div className="mt-3">
                <CtaButton icon={ArrowRight} onClick={gotoFinaleTab}>
                  {t(PILOTAGE.step5CtaConfigure)}
                </CtaButton>
              </div>
            </>
          )}
        </StepCard>
      </ol>
    </section>
  );
}
