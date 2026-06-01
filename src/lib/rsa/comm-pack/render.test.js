import { describe, it, expect } from 'vitest';
import { buildVariables, interpolate, renderTextDeliverables } from './render';

const edition = {
  id: 'rsa-2026', name: 'Rotary Startup Award', year: 2026,
  application_open: '2026-02-01', application_close: '2026-03-31',
  finale_date: '2026-05-26', awards_date: '2026-06-02',
  prize_main: 5000, prize_special: 1500,
  comm_pack_config: {
    tagline: { fr: 'Concours de pitch Paris–Berlin', en: 'Paris–Berlin pitch competition', de: 'Paris–Berlin Pitch-Wettbewerb' },
    contact: { name: 'Mathieu', phone: '07 66 42 21 02', email: 'prixstartuprotary@proton.me' },
  },
};

describe('buildVariables', () => {
  it('derives variables from edition columns and config per lang', () => {
    const vars = buildVariables(edition, 'fr');
    expect(vars.competition_name).toBe('Rotary Startup Award');
    expect(vars.year).toBe(2026);
    expect(vars.prize_main).toContain('5');
    expect(vars.tagline).toBe('Concours de pitch Paris–Berlin');
    expect(vars.contact_email).toBe('prixstartuprotary@proton.me');
  });
});

describe('interpolate', () => {
  it('replaces {{tokens}} and leaves unknown tokens blank', () => {
    expect(interpolate('Hi {{competition_name}} {{year}}', { competition_name: 'X', year: 2026 })).toBe('Hi X 2026');
    expect(interpolate('a {{nope}} b', {})).toBe('a  b');
  });
});

describe('renderTextDeliverables', () => {
  it('produces fr/en/de bodies for each text deliverable', () => {
    const out = renderTextDeliverables(edition);
    expect(out.fr.email).toContain('Rotary Startup Award');
    expect(out.de.social.length).toBeGreaterThan(0);
    expect(Object.keys(out)).toEqual(['fr', 'en', 'de']);
  });
});
