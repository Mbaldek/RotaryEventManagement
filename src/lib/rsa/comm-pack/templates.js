// Chaque livrable texte = dict {fr,en,de} contenant des tokens {{var}}.
export const TEMPLATES = {
  email: {
    fr: `Bonjour,

Nous relayons le {{competition_name}} {{year}}.
{{tagline}}.
Candidatures : {{application_window}}.
Dotations : {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Infos & candidature : {{registration_url}}
Contact : {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    en: `Hello,

We are relaying the {{competition_name}} {{year}}.
{{tagline}}.
Applications: {{application_window}}.
Awards: {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Info & apply: {{registration_url}}
Contact: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    de: `Hallo,

wir leiten den {{competition_name}} {{year}} weiter.
{{tagline}}.
Bewerbungen: {{application_window}}.
Preise: {{prize_main}} + {{prize_special}}.
{{eligibility_summary}}
Infos & Bewerbung: {{registration_url}}
Kontakt: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
  },
  newsletter: {
    fr: `**{{competition_name}} {{year}}** — {{tagline}}. Candidatures {{application_window}}. {{registration_url}}`,
    en: `**{{competition_name}} {{year}}** — {{tagline}}. Applications {{application_window}}. {{registration_url}}`,
    de: `**{{competition_name}} {{year}}** — {{tagline}}. Bewerbungen {{application_window}}. {{registration_url}}`,
  },
  social: {
    fr: `🚀 {{competition_name}} {{year}} — {{tagline}}. Candidatez avant le {{application_close}} : {{registration_url}}`,
    en: `🚀 {{competition_name}} {{year}} — {{tagline}}. Apply before {{application_close}}: {{registration_url}}`,
    de: `🚀 {{competition_name}} {{year}} — {{tagline}}. Bewerben bis {{application_close}}: {{registration_url}}`,
  },
  keymsg: {
    fr: `{{tagline}}.\nCandidatures : {{application_window}}.\nDotations : {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfos : {{registration_url}}\nContact : {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    en: `{{tagline}}.\nApplications: {{application_window}}.\nAwards: {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfo: {{registration_url}}\nContact: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
    de: `{{tagline}}.\nBewerbungen: {{application_window}}.\nPreise: {{prize_main}} + {{prize_special}}.\n{{eligibility_summary}}\nInfos: {{registration_url}}\nKontakt: {{contact_name}} – {{contact_phone}} – {{contact_email}}`,
  },
  faq: {
    fr: `# FAQ\n- Concours gratuit.\n- Critères d'éligibilité indicatifs, non exclusifs.\n- Jury indépendant (membres Rotary + experts).`,
    en: `# FAQ\n- Free to enter.\n- Eligibility criteria are indicative, non-exclusive.\n- Independent jury (Rotary members + experts).`,
    de: `# FAQ\n- Kostenlose Teilnahme.\n- Zulassungskriterien sind indikativ, nicht ausschließend.\n- Unabhängige Jury (Rotary-Mitglieder + Experten).`,
  },
};

export const TEXT_DELIVERABLES = Object.keys(TEMPLATES); // ['email','newsletter','social','keymsg','faq']
