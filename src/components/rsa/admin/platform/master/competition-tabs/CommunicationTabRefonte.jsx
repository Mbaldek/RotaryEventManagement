// CommunicationTabRefonte — refonte UX du tab "Communication" du
// CompetitionEditView, organisée par étape du funnel de la compétition.
// ---------------------------------------------------------------------------
// Inspiration : ancien projet RSA ADMIN — chaque phase du funnel embarque
// SES templates Élysée FR/EN/DE prêts à envoyer + audience auto résolue
// côté serveur en fonction du status candidat.
//
// Structure :
//   • Header éditorial (eyebrow gold + EditorialTitle + subtitle)
//   • Stage 1 — Candidatures (Sparkles)        — 3 templates
//   • Stage 2 — Pré-sélection (Users)          — 2 templates
//   • Stage 3 — Sessions jury (Calendar)       — 3 templates
//   • Stage 4 — Résultats (Trophy) — RÉUTILISE CommunicatePanel + 3 templates
//   • Stage 5 — Post-finale (Sparkles)         — 3 templates
//   • Section "Outils avancés — Email Studio"  (accordion, replié par défaut)
//   • Section "Historique d'envois"            (lit email_sends scopé à edition)
//
// Tous les templates rebranchent sur StageTemplateCard → StageEmailModal qui
// fait : preview audience, édition subject+body, dry-run, envoi via sendBulk.
//
// Réutilise :
//   - CommunicatePanel  (V2) pour le bloc "Communiquer" cœur du stage 4
//   - EmailStudio       (Module 9) en accordion "Outils avancés"
//   - useEmailSends     (hook RPC rsa_list_email_sends) pour l'historique
// ---------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import {
  Sparkles, Users, Calendar, Trophy, Megaphone, Settings2, Mail, Loader2,
  AlertTriangle, CheckCircle2, Clock, ChevronDown,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  GOLD, NAVY, INK, MUTED, CREAM2, SERIF, TINT_ADMIN,
} from '@/components/design/tokens';
import { DANGER } from '@/components/design/tokens.app';
import { useLang } from '@/lib/platform/i18n';
import EditorialTitle from '@/components/design/EditorialTitle';

import { COMMUNICATION_REFONTE } from '../i18n';
import StageTemplateCard from './StageTemplateCard';
import StageEmailModal from './StageEmailModal';
import CommunicatePanel from '@/components/rsa/communicate/CommunicatePanel';
import EmailStudio from '@/components/rsa/admin/platform/comms/EmailStudio';
import { useEmailSends, KEYS as COMMS_KEYS } from '@/components/rsa/admin/platform/comms/useComms';

// ── helpers ────────────────────────────────────────────────────────────────
function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_m, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}

function fmtDate(iso, lang) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'de' ? 'de-DE' : 'fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Stage section wrapper (hairline gold + serif title + grid des cards) ──
function StageSection({ stage, intro, children, t }) {
  const StageIcon = stage.icon;
  return (
    <section
      role="region"
      aria-labelledby={`stage-${stage.id}-title`}
      className="mb-8"
    >
      {/* Hairline gold + eyebrow */}
      <div className="mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium inline-flex items-center gap-1.5"
            style={{ color: GOLD }}
          >
            <StageIcon className="w-3 h-3" aria-hidden />
            {t(stage.eyebrow)}
          </span>
        </div>
        <h3
          id={`stage-${stage.id}-title`}
          className="text-[20px] leading-snug mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(stage.title)}
        </h3>
        <p className="text-[12.5px] max-w-3xl" style={{ color: INK }}>
          {intro || t(stage.intro)}
        </p>
      </div>

      {children}
    </section>
  );
}

// ── History list ──────────────────────────────────────────────────────────
function HistorySection({ editionId, clubId, t, lang }) {
  // The send-history RPC doesn't accept an edition_id filter, but each row's
  // audience_filter snapshot embeds it. We fetch the full club-scoped list
  // (or master-scoped) and filter in JS — fine until volumes grow.
  const sendsQ = useEmailSends(clubId ?? null, 100);

  const filtered = useMemo(() => {
    const all = sendsQ.data || [];
    if (!editionId) return all;
    return all.filter((s) => {
      const f = s?.audience_filter || {};
      return f.edition_id === editionId;
    });
  }, [sendsQ.data, editionId]);

  const stage = {
    id: 'history',
    eyebrow: COMMUNICATION_REFONTE.historyEyebrow,
    title: COMMUNICATION_REFONTE.historyTitle,
    intro: COMMUNICATION_REFONTE.historyIntro,
    icon: Mail,
  };

  return (
    <StageSection stage={stage} t={t}>
      {sendsQ.isLoading && (
        <div
          className="py-6 flex items-center justify-center gap-2 rounded-[4px]"
          style={{ background: 'white', border: `1px solid ${CREAM2}`, color: MUTED }}
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12.5px]">{t(COMMUNICATION_REFONTE.historyLoading)}</span>
        </div>
      )}

      {sendsQ.isError && (
        <p
          className="rounded-[4px] px-3 py-2 text-[12.5px]"
          style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}`, color: DANGER }}
          role="alert"
        >
          {t(COMMUNICATION_REFONTE.historyLoadError)}
        </p>
      )}

      {!sendsQ.isLoading && !sendsQ.isError && filtered.length === 0 && (
        <div
          className="rounded-[4px] p-6 text-center"
          style={{ background: 'white', border: `1px dashed ${CREAM2}` }}
        >
          <p className="text-[13px]" style={{ color: INK }}>
            {t(COMMUNICATION_REFONTE.historyEmpty)}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div
          className="rounded-[4px] overflow-hidden"
          style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        >
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: TINT_ADMIN, borderBottom: `1px solid ${CREAM2}` }}>
                <th className="text-left px-3 py-2 uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.historyColDate)}
                </th>
                <th className="text-left px-3 py-2 uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.historyColSubject)}
                </th>
                <th className="text-left px-3 py-2 uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.historyColAudience)}
                </th>
                <th className="text-right px-3 py-2 uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.historyColCount)}
                </th>
                <th className="text-left px-3 py-2 uppercase tracking-[0.12em] text-[10.5px]" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.historyColStatus)}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const Icon = s.status === 'sent' ? CheckCircle2 : s.status === 'partial' ? Clock : AlertTriangle;
                const color = s.status === 'sent' ? '#1d6b4f' : s.status === 'partial' ? '#9a6b1f' : DANGER;
                return (
                  <tr key={s.id} style={{ borderTop: `1px solid ${CREAM2}` }}>
                    <td className="px-3 py-2" style={{ color: INK }}>
                      {fmtDate(s.sent_at, lang)}
                    </td>
                    <td className="px-3 py-2" style={{ color: NAVY, fontWeight: 500 }}>
                      {s.subject}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: INK }}>
                      {s.audience_type}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: NAVY }}>
                      {s.recipients_count}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1" style={{ color }}>
                        <Icon className="w-3 h-3" />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </StageSection>
  );
}

// ── Advanced section (collapsed by default) ───────────────────────────────
function AdvancedSection({ clubId, edition, t }) {
  const [open, setOpen] = useState(false);
  return (
    <section
      role="region"
      aria-labelledby="stage-advanced-title"
      className="mb-8"
    >
      <div className="mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium inline-flex items-center gap-1.5"
            style={{ color: GOLD }}
          >
            <Settings2 className="w-3 h-3" aria-hidden />
            {t(COMMUNICATION_REFONTE.advancedEyebrow)}
          </span>
        </div>
        <h3
          id="stage-advanced-title"
          className="text-[20px] leading-snug mb-1"
          style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}
        >
          {t(COMMUNICATION_REFONTE.advancedTitle)}
        </h3>
        <p className="text-[12.5px] max-w-3xl" style={{ color: INK }}>
          {t(COMMUNICATION_REFONTE.advancedIntro)}
        </p>
      </div>

      <details
        className="rounded-[4px]"
        style={{ background: 'white', border: `1px solid ${CREAM2}` }}
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary
          className="px-4 py-3 cursor-pointer flex items-center gap-2 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
          style={{ color: NAVY }}
        >
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: GOLD, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            aria-hidden
          />
          {t(COMMUNICATION_REFONTE.advancedSummary)}
        </summary>
        {open && (
          <div className="px-4 py-4" style={{ borderTop: `1px solid ${CREAM2}` }}>
            <EmailStudio clubId={clubId ?? null} edition={edition || null} />
          </div>
        )}
      </details>
    </section>
  );
}

// ── Stages config (templates par phase) ───────────────────────────────────
// On garde tout dans ce fichier pour rester self-contained ; si la collection
// s'enrichit en V3.x on extrait dans un fichier templates.js dédié.
function buildStages({ editionId }) {
  // Helper : edition_id sera ajouté côté StageTemplateCard et StageEmailModal,
  // mais on l'expose ici aussi pour la lisibilité du config.
  const baseFilter = editionId ? { edition_id: editionId } : {};

  return [
    // ── STAGE 1 — Candidatures ─────────────────────────────────────────────
    {
      id: 'candidatures',
      eyebrow: COMMUNICATION_REFONTE.stage1Eyebrow,
      title: COMMUNICATION_REFONTE.stage1Title,
      intro: COMMUNICATION_REFONTE.stage1Intro,
      icon: Sparkles,
      templates: [
        {
          id: 's1-confirm',
          autoTrigger: true,
          audienceType: null,
          audienceFilter: baseFilter,
          statuses: ['soumis'],
          titleDict: COMMUNICATION_REFONTE.s1tplConfirmTitle,
          description: COMMUNICATION_REFONTE.s1tplConfirmDescription,
          subject: {
            fr: 'Rotary Startup Award — confirmation de votre candidature',
            en: 'Rotary Startup Award — application receipt',
            de: 'Rotary Startup Award — Bestätigung Ihrer Bewerbung',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nNous accusons réception de votre candidature au **Rotary Startup Award**. Votre dossier est désormais entre les mains de notre comité de sélection.\n\nVous serez informé·e du résultat dans les semaines à venir.\n\nBien cordialement,',
            en: 'Dear applicant,\n\nWe confirm receipt of your application to the **Rotary Startup Award**. Your dossier is now in the hands of our selection committee.\n\nYou will be informed of the outcome over the coming weeks.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Bewerbung beim **Rotary Startup Award**. Ihre Unterlagen werden nun von unserer Auswahlkommission geprüft.\n\nÜber das Ergebnis informieren wir Sie in den kommenden Wochen.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's1-draft-reminder',
          audienceType: 'club_candidates',
          audienceFilter: { ...baseFilter, statuses: ['brouillon'] },
          statuses: ['brouillon'],
          titleDict: COMMUNICATION_REFONTE.s1tplDraftReminderTitle,
          description: COMMUNICATION_REFONTE.s1tplDraftReminderDescription,
          subject: {
            fr: 'Rotary Startup Award — votre dossier vous attend',
            en: 'Rotary Startup Award — your draft is waiting',
            de: 'Rotary Startup Award — Ihr Entwurf wartet',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nNous avons remarqué que votre candidature au **Rotary Startup Award** est encore à l’état de brouillon.\n\nNous vous invitons à la finaliser avant la clôture des inscriptions afin que votre projet puisse être étudié par notre comité.\n\nVous pouvez reprendre votre dossier depuis votre espace personnel.\n\nBien cordialement,',
            en: 'Dear applicant,\n\nWe noticed that your application to the **Rotary Startup Award** is still in draft.\n\nWe kindly invite you to finalise it before the application deadline so that our committee may review your project.\n\nYou can pick up where you left off from your personal space.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nuns ist aufgefallen, dass Ihre Bewerbung beim **Rotary Startup Award** noch im Entwurfsstatus ist.\n\nWir laden Sie ein, sie vor Ablauf der Frist abzuschließen, damit unser Komitee Ihr Projekt prüfen kann.\n\nSie können dort weitermachen, wo Sie aufgehört haben.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's1-validated',
          audienceType: 'club_candidates',
          audienceFilter: { ...baseFilter, statuses: ['soumis', 'en_selection', 'affecte'] },
          statuses: ['soumis', 'en_selection', 'affecte'],
          titleDict: COMMUNICATION_REFONTE.s1tplValidatedTitle,
          description: COMMUNICATION_REFONTE.s1tplValidatedDescription,
          subject: {
            fr: 'Rotary Startup Award — dossier validé',
            en: 'Rotary Startup Award — application validated',
            de: 'Rotary Startup Award — Bewerbung bestätigt',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nVotre dossier au **Rotary Startup Award** est officiellement validé et transmis à notre comité de sélection.\n\nNous reviendrons vers vous dans les semaines à venir avec les résultats de cette première étape.\n\nBien cordialement,',
            en: 'Dear applicant,\n\nYour application to the **Rotary Startup Award** is officially validated and forwarded to our selection committee.\n\nWe will get back to you over the coming weeks with the outcome of this first stage.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nIhre Bewerbung beim **Rotary Startup Award** ist offiziell bestätigt und an unsere Auswahlkommission weitergeleitet.\n\nWir melden uns in den kommenden Wochen mit dem Ergebnis dieser ersten Etappe bei Ihnen.\n\nMit freundlichen Grüßen,',
          },
        },
      ],
    },

    // ── STAGE 2 — Pré-sélection ───────────────────────────────────────────
    {
      id: 'preselection',
      eyebrow: COMMUNICATION_REFONTE.stage2Eyebrow,
      title: COMMUNICATION_REFONTE.stage2Title,
      intro: COMMUNICATION_REFONTE.stage2Intro,
      icon: Users,
      templates: [
        {
          id: 's2-comite-summon',
          audienceType: 'club_comite',
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s2tplComiteSummonTitle,
          description: COMMUNICATION_REFONTE.s2tplComiteSummonDescription,
          subject: {
            fr: 'Rotary Startup Award — convocation du comité',
            en: 'Rotary Startup Award — committee summons',
            de: 'Rotary Startup Award — Komitee-Einladung',
          },
          body: {
            fr: 'Chères et chers membres du comité,\n\nNous vous convions à la **session d’instruction** des dossiers de candidature au Rotary Startup Award.\n\nVotre regard sera précieux pour identifier les projets à présenter au jury.\n\nVous trouverez l’ordre du jour et les modalités logistiques sur votre espace.\n\nBien cordialement,',
            en: 'Dear committee members,\n\nWe invite you to the **review session** for the Rotary Startup Award applications.\n\nYour judgement will be valuable to identify the projects that should be presented to the jury.\n\nAgenda and logistics are available on your space.\n\nWith kindest regards,',
            de: 'Sehr geehrte Komitee-Mitglieder,\n\nwir laden Sie zur **Prüfungssitzung** der Bewerbungen für den Rotary Startup Award ein.\n\nIhre Einschätzung wird wertvoll sein, um die Projekte für die Jury auszuwählen.\n\nTagesordnung und Logistik finden Sie in Ihrem Bereich.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's2-in-review',
          audienceType: 'club_candidates',
          audienceFilter: { ...baseFilter, statuses: ['en_selection'] },
          statuses: ['en_selection'],
          titleDict: COMMUNICATION_REFONTE.s2tplInReviewTitle,
          description: COMMUNICATION_REFONTE.s2tplInReviewDescription,
          subject: {
            fr: 'Rotary Startup Award — votre dossier est en cours d’étude',
            en: 'Rotary Startup Award — your application is under review',
            de: 'Rotary Startup Award — Ihre Bewerbung wird geprüft',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nNotre comité de sélection étudie actuellement votre dossier de candidature au **Rotary Startup Award**.\n\nVous recevrez très prochainement le résultat de cette étape.\n\nNous vous remercions pour votre patience.\n\nBien cordialement,',
            en: 'Dear applicant,\n\nOur selection committee is currently reviewing your application to the **Rotary Startup Award**.\n\nYou will hear back from us very shortly with the outcome of this stage.\n\nThank you for your patience.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nunsere Auswahlkommission prüft derzeit Ihre Bewerbung beim **Rotary Startup Award**.\n\nWir werden uns in Kürze mit dem Ergebnis dieser Etappe bei Ihnen melden.\n\nVielen Dank für Ihre Geduld.\n\nMit freundlichen Grüßen,',
          },
        },
      ],
    },

    // ── STAGE 3 — Sessions jury ───────────────────────────────────────────
    {
      id: 'sessions',
      eyebrow: COMMUNICATION_REFONTE.stage3Eyebrow,
      title: COMMUNICATION_REFONTE.stage3Title,
      intro: COMMUNICATION_REFONTE.stage3Intro,
      icon: Calendar,
      templates: [
        {
          id: 's3-jury-invite',
          audienceType: 'club_jurys',
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s3tplJuryInviteTitle,
          description: COMMUNICATION_REFONTE.s3tplJuryInviteDescription,
          subject: {
            fr: 'Rotary Startup Award — invitation à la session jury',
            en: 'Rotary Startup Award — jury session invitation',
            de: 'Rotary Startup Award — Einladung zur Jury-Sitzung',
          },
          body: {
            fr: 'Chères et chers jurés,\n\nNous vous invitons à la prochaine **session de jury** du Rotary Startup Award.\n\nVotre présence et votre regard professionnel sont précieux pour évaluer les pitchs des startups retenues.\n\nLes modalités logistiques (date, lieu, horaires, ordre de passage) vous seront communiquées dans un message suivant.\n\nBien cordialement,',
            en: 'Dear jurors,\n\nWe invite you to the next **jury session** of the Rotary Startup Award.\n\nYour presence and professional expertise are valuable to assess the pitches of the selected startups.\n\nThe logistical details (date, venue, schedule, running order) will be shared in a follow-up message.\n\nWith kindest regards,',
            de: 'Sehr geehrte Jury-Mitglieder,\n\nwir laden Sie zur nächsten **Jury-Sitzung** des Rotary Startup Award ein.\n\nIhre Anwesenheit und Ihr fachlicher Blick sind wertvoll für die Bewertung der Pitches der ausgewählten Startups.\n\nDie logistischen Details (Datum, Ort, Zeitplan, Reihenfolge) folgen in einer separaten Nachricht.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's3-jury-briefing',
          audienceType: 'club_jurys',
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s3tplJuryBriefingTitle,
          description: COMMUNICATION_REFONTE.s3tplJuryBriefingDescription,
          subject: {
            fr: 'Rotary Startup Award — briefing pitch + Q&A (J-7)',
            en: 'Rotary Startup Award — pitch + Q&A briefing (D-7)',
            de: 'Rotary Startup Award — Briefing Pitch + Q&A (D-7)',
          },
          body: {
            fr: 'Chères et chers jurés,\n\nLa session approche — voici le rappel de format en vue de votre préparation :\n\n- **Pitch** : 10 à 12 minutes par startup\n- **Q&A** : 8 à 10 minutes après chaque pitch\n- **Slot total** : 20 minutes par projet\n- **Session** : ~2h30 au total\n\nLes critères d’évaluation sont disponibles dans votre espace juré.\n\nBien cordialement,',
            en: 'Dear jurors,\n\nThe session is approaching — here is the format reminder for your preparation:\n\n- **Pitch**: 10 to 12 minutes per startup\n- **Q&A**: 8 to 10 minutes after each pitch\n- **Total slot**: 20 minutes per project\n- **Session**: ~2h30 in total\n\nThe scoring criteria are available in your jury space.\n\nWith kindest regards,',
            de: 'Sehr geehrte Jury-Mitglieder,\n\ndie Sitzung rückt näher — hier zur Vorbereitung der Formatüberblick:\n\n- **Pitch**: 10 bis 12 Minuten je Startup\n- **Q&A**: 8 bis 10 Minuten nach jedem Pitch\n- **Gesamt-Slot**: 20 Minuten pro Projekt\n- **Sitzung**: insgesamt ca. 2h30\n\nDie Bewertungskriterien finden Sie in Ihrem Jury-Bereich.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's3-jury-reminder',
          audienceType: 'club_jurys',
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s3tplJuryReminderTitle,
          description: COMMUNICATION_REFONTE.s3tplJuryReminderDescription,
          subject: {
            fr: 'Rotary Startup Award — dernier rappel avant la session',
            en: 'Rotary Startup Award — final reminder before the session',
            de: 'Rotary Startup Award — letzte Erinnerung vor der Sitzung',
          },
          body: {
            fr: 'Chères et chers jurés,\n\nUn dernier rappel logistique avant la **session de jury** :\n\n- Lieu, horaire et ordre de passage disponibles sur votre espace.\n- Merci d’arriver 15 minutes avant l’ouverture pour l’accueil.\n\nAu plaisir de vous retrouver très prochainement.\n\nBien cordialement,',
            en: 'Dear jurors,\n\nA final logistical reminder before the **jury session**:\n\n- Venue, schedule and running order available on your space.\n- Please arrive 15 minutes before the opening for the welcome.\n\nLooking forward to meeting you very soon.\n\nWith kindest regards,',
            de: 'Sehr geehrte Jury-Mitglieder,\n\neine letzte logistische Erinnerung vor der **Jury-Sitzung**:\n\n- Ort, Zeitplan und Reihenfolge stehen in Ihrem Bereich bereit.\n- Bitte erscheinen Sie 15 Minuten vor Beginn zur Begrüßung.\n\nWir freuen uns, Sie bald zu sehen.\n\nMit freundlichen Grüßen,',
          },
        },
      ],
    },

    // ── STAGE 4 — Résultats (CommunicatePanel + 3 institutional templates) ─
    {
      id: 'results',
      eyebrow: COMMUNICATION_REFONTE.stage4Eyebrow,
      title: COMMUNICATION_REFONTE.stage4Title,
      intro: COMMUNICATION_REFONTE.stage4Intro,
      icon: Trophy,
      reuseCommunicatePanel: true,
      templates: [
        {
          id: 's4-laureates',
          audienceType: 'club_candidates',
          audienceFilter: { ...baseFilter, statuses: ['laureat'] },
          statuses: ['laureat'],
          titleDict: COMMUNICATION_REFONTE.s4tplLaureatesTitle,
          description: COMMUNICATION_REFONTE.s4tplLaureatesDescription,
          subject: {
            fr: 'Rotary Startup Award — vous figurez au palmarès',
            en: 'Rotary Startup Award — you have been awarded',
            de: 'Rotary Startup Award — Sie wurden ausgezeichnet',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nNous avons l’honneur de vous informer que votre projet a été distingué au palmarès du **Rotary Startup Award**.\n\nNous reviendrons rapidement vers vous concernant la cérémonie officielle, la remise du prix et les modalités de communication associées.\n\nNous saluons l’engagement et la qualité de votre projet.\n\nBien cordialement,',
            en: 'Dear laureate,\n\nWe are honoured to inform you that your project has been recognised in the **Rotary Startup Award** palmarès.\n\nWe will get back to you shortly regarding the official ceremony, the award delivery, and the related communication arrangements.\n\nWe commend the commitment and quality of your project.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nwir freuen uns sehr, Ihnen mitzuteilen, dass Ihr Projekt im Palmarès des **Rotary Startup Award** ausgezeichnet wurde.\n\nWir melden uns in Kürze mit Details zur offiziellen Zeremonie, zur Preisübergabe und zur begleitenden Kommunikation.\n\nWir würdigen das Engagement und die Qualität Ihres Projekts.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's4-finalists',
          audienceType: 'club_finalists',
          audienceFilter: baseFilter,
          statuses: ['finaliste'],
          titleDict: COMMUNICATION_REFONTE.s4tplFinalistsTitle,
          description: COMMUNICATION_REFONTE.s4tplFinalistsDescription,
          subject: {
            fr: 'Rotary Startup Award — vous êtes promu·e en finale',
            en: 'Rotary Startup Award — you are promoted to the finale',
            de: 'Rotary Startup Award — Sie ziehen ins Finale ein',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nVotre projet a été *promu en finale* du **Rotary Startup Award**. Félicitations.\n\nNous vous transmettrons prochainement les modalités pratiques de la grande finale : date, lieu, format de pitch, présence média.\n\nBien cordialement,',
            en: 'Dear finalist,\n\nYour project has been *promoted to the finale* of the **Rotary Startup Award**. Congratulations.\n\nWe will share the practical details of the grand finale shortly: date, venue, pitch format, media presence.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nIhr Projekt wurde *ins Finale befördert* beim **Rotary Startup Award**. Herzlichen Glückwunsch.\n\nDie praktischen Details des Grand Finale (Datum, Ort, Pitch-Format, Medienpräsenz) folgen in Kürze.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's4-presskit',
          audienceType: null,
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s4tplPresskitTitle,
          description: COMMUNICATION_REFONTE.s4tplPresskitDescription,
          subject: {
            fr: 'Rotary Startup Award — palmarès et press kit',
            en: 'Rotary Startup Award — palmarès and press kit',
            de: 'Rotary Startup Award — Palmarès und Press-Kit',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nNous avons le plaisir de partager avec vous le palmarès du **Rotary Startup Award** ainsi que le press kit associé.\n\nVous trouverez ci-joint les visuels et éléments de langage à destination des relais médias et partenaires.\n\nNous restons à votre disposition pour toute information complémentaire.\n\nBien cordialement,',
            en: 'Dear partner,\n\nWe are pleased to share the **Rotary Startup Award** palmarès together with the associated press kit.\n\nYou will find attached the visuals and key messages for use with media partners and stakeholders.\n\nWe remain available for any further information.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nwir freuen uns, Ihnen das Palmarès des **Rotary Startup Award** sowie das zugehörige Press-Kit zu übermitteln.\n\nIm Anhang finden Sie Visuals und Sprachregelungen für Medienpartner und Förderer.\n\nFür Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen,',
          },
        },
      ],
    },

    // ── STAGE 5 — Post-finale ────────────────────────────────────────────────
    {
      id: 'post-finale',
      eyebrow: COMMUNICATION_REFONTE.stage5Eyebrow,
      title: COMMUNICATION_REFONTE.stage5Title,
      intro: COMMUNICATION_REFONTE.stage5Intro,
      icon: Megaphone,
      templates: [
        {
          id: 's5-thanks',
          audienceType: null,
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s5tplThanksTitle,
          description: COMMUNICATION_REFONTE.s5tplThanksDescription,
          subject: {
            fr: 'Rotary Startup Award — merci pour cette édition',
            en: 'Rotary Startup Award — thank you for this edition',
            de: 'Rotary Startup Award — Danke für diese Edition',
          },
          body: {
            fr: 'Chères et chers contributrices, contributeurs,\n\nL’édition du **Rotary Startup Award** que nous venons de clôturer doit beaucoup à votre engagement.\n\nCandidats, comité, jurés, partenaires, équipe d’organisation — chacun a contribué à la qualité du processus et à la valeur des projets distingués.\n\nNous vous en remercions très sincèrement, et donnons rendez-vous à la prochaine édition.\n\nBien cordialement,',
            en: 'Dear contributors,\n\nThe **Rotary Startup Award** edition we have just closed owes a great deal to your commitment.\n\nApplicants, committee, jurors, partners, organising team — each contributed to the quality of the process and the value of the distinguished projects.\n\nWe thank you sincerely and look forward to the next edition.\n\nWith kindest regards,',
            de: 'Sehr geehrte Mitwirkende,\n\ndie soeben abgeschlossene Edition des **Rotary Startup Award** verdankt sich in hohem Maße Ihrem Engagement.\n\nBewerber, Komitee, Jury, Partner, Organisationsteam — jede·r hat zur Qualität des Prozesses und zum Wert der ausgezeichneten Projekte beigetragen.\n\nWir danken Ihnen sehr herzlich und freuen uns auf die nächste Edition.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's5-pressrelease',
          audienceType: null,
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s5tplPressreleaseTitle,
          description: COMMUNICATION_REFONTE.s5tplPressreleaseDescription,
          subject: {
            fr: 'Rotary Startup Award — communiqué de presse final',
            en: 'Rotary Startup Award — final press release',
            de: 'Rotary Startup Award — abschließende Pressemitteilung',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nVeuillez trouver ci-joint le **communiqué de presse final** du Rotary Startup Award.\n\nCe communiqué présente le palmarès, les lauréats, les chiffres-clés et les partenaires de l’édition.\n\nNous restons à votre disposition pour toute interview ou complément d’information.\n\nBien cordialement,',
            en: 'Dear media partner,\n\nPlease find attached the **final press release** of the Rotary Startup Award.\n\nThis release covers the palmarès, the laureates, the key figures and the partners of the edition.\n\nWe remain available for any interview or further information.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\nim Anhang erhalten Sie die **abschließende Pressemitteilung** des Rotary Startup Award.\n\nDie Mitteilung umfasst Palmarès, Preisträger, Kennzahlen und Partner der Edition.\n\nFür Interviews oder weitere Informationen stehen wir gern zur Verfügung.\n\nMit freundlichen Grüßen,',
          },
        },
        {
          id: 's5-savethedate',
          audienceType: null,
          audienceFilter: baseFilter,
          statuses: [],
          titleDict: COMMUNICATION_REFONTE.s5tplSavethedateTitle,
          description: COMMUNICATION_REFONTE.s5tplSavethedateDescription,
          subject: {
            fr: 'Rotary Startup Award — save the date',
            en: 'Rotary Startup Award — save the date',
            de: 'Rotary Startup Award — Save the Date',
          },
          body: {
            fr: 'Madame, Monsieur,\n\nLa prochaine édition du **Rotary Startup Award** se prépare déjà.\n\n*Save the date* — les inscriptions ouvriront prochainement. Nous vous tiendrons informé·e des étapes clés du calendrier au fil des prochaines semaines.\n\nBien cordialement,',
            en: 'Dear friend,\n\nThe next edition of the **Rotary Startup Award** is already being prepared.\n\n*Save the date* — applications will open shortly. We will share key calendar milestones in the coming weeks.\n\nWith kindest regards,',
            de: 'Sehr geehrte Damen und Herren,\n\ndie nächste Edition des **Rotary Startup Award** wird bereits vorbereitet.\n\n*Save the date* — die Bewerbungsphase startet in Kürze. Wir halten Sie in den kommenden Wochen über die wichtigsten Kalenderschritte auf dem Laufenden.\n\nMit freundlichen Grüßen,',
          },
        },
      ],
    },
  ];
}

// ── Composant racine ──────────────────────────────────────────────────────
export default function CommunicationTabRefonte({
  editionId,
  competition,
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();

  // Modal state — un seul template ouvert à la fois.
  const [openTpl, setOpenTpl] = useState(null);
  const [openStageLabel, setOpenStageLabel] = useState('');

  const stages = useMemo(() => buildStages({ editionId }), [editionId]);

  // No edition guard
  if (!editionId) {
    return (
      <div
        className="rounded-[4px] px-4 py-6 text-center"
        style={{ background: 'white', border: `1px dashed ${CREAM2}`, color: MUTED }}
      >
        <p className="text-[13px]">{t(COMMUNICATION_REFONTE.noEdition)}</p>
      </div>
    );
  }

  // CommunicatePanel (V2) is master-scope by default (clubId=null).
  // We pass clubId=null to keep cross-club broadcast semantics.
  const clubId = null;

  const onOpenTemplate = (template, stageLabel) => {
    setOpenTpl(template);
    setOpenStageLabel(stageLabel || '');
  };

  const onCloseModal = (sent) => {
    setOpenTpl(null);
    setOpenStageLabel('');
    if (sent) {
      // Invalidate send history.
      qc.invalidateQueries({ queryKey: COMMS_KEYS.sends(clubId ?? null) });
    }
  };

  const onDuplicateTpl = (template) => {
    // Duplicate = open modal with copy and a different id (just bump id for now).
    setOpenTpl({ ...template, id: `${template.id}-copy` });
  };

  const compName = competition?.name || '';

  return (
    <div>
      {/* Header éditorial */}
      <header className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="h-[1.5px] w-7" style={{ background: GOLD }} aria-hidden />
          <span
            className="uppercase text-[10px] tracking-[0.18em] font-medium"
            style={{ color: GOLD }}
          >
            {fill(t(COMMUNICATION_REFONTE.headerEyebrow), { name: compName })}
          </span>
        </div>
        <EditorialTitle
          lead={t(COMMUNICATION_REFONTE.headerTitleLead)}
          italic={t(COMMUNICATION_REFONTE.headerTitleItalic)}
          size="sm"
        />
        <p className="text-[13px] mt-2 max-w-3xl" style={{ color: INK }}>
          {t(COMMUNICATION_REFONTE.headerSubtitle)}
        </p>
      </header>

      {/* 5 phases */}
      {stages.map((stage) => {
        const stageLabel = t(stage.eyebrow);
        return (
          <StageSection key={stage.id} stage={stage} t={t}>
            {/* Stage 4 : on insère le CommunicatePanel V2 EN PREMIER pour
                cadrer l'attention sur l'action principale "Communiquer". */}
            {stage.reuseCommunicatePanel && (
              <div
                className="mb-4 rounded-[4px] p-4"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}
              >
                <p className="text-[11px] mb-2" style={{ color: MUTED }}>
                  {t(COMMUNICATION_REFONTE.stage4CommunicatePanelHint)}
                </p>
                <CommunicatePanel editionId={editionId} clubId={clubId} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {stage.templates.map((template) => (
                <StageTemplateCard
                  key={template.id}
                  stage={{
                    id: stage.id,
                    eyebrow: stageLabel,
                    icon: stage.icon,
                  }}
                  template={template}
                  clubId={clubId}
                  editionId={editionId}
                  onPrepare={(tpl) => onOpenTemplate(tpl, stageLabel)}
                  onDuplicate={onDuplicateTpl}
                />
              ))}
            </div>
          </StageSection>
        );
      })}

      {/* Advanced — Email Studio */}
      <AdvancedSection clubId={clubId} edition={competition || null} t={t} />

      {/* History */}
      <HistorySection editionId={editionId} clubId={clubId} t={t} lang={lang} />

      {/* Modal — single instance, controlled by openTpl */}
      <StageEmailModal
        open={!!openTpl}
        onClose={onCloseModal}
        stageLabel={openStageLabel}
        template={openTpl}
        clubId={clubId}
        editionId={editionId}
      />
    </div>
  );
}
