import { describe, it, expect } from 'vitest';
import { buildZipManifest } from './manifest';

const edition = {
  id: 'rsa-2026', name: 'RSA', year: 2026, application_close: '2026-03-31',
  comm_pack_config: { assets: { logo_path: 'editions/rsa-2026/comm/logo/x.svg', reglement: { fr: 'editions/rsa-2026/comm/reglement/fr.pdf' } } },
};

describe('buildZipManifest', () => {
  it('lists per-lang text files + assets with mirror folder structure', () => {
    const m = buildZipManifest(edition);
    const paths = m.map((e) => e.path);
    expect(paths).toContain('FR/email.txt');
    expect(paths).toContain('EN/social.txt');
    expect(paths).toContain('DE/faq.md');
    expect(paths.some((p) => p.startsWith('FR/one-pager'))).toBe(true);
    expect(m.find((e) => e.assetPath === 'editions/rsa-2026/comm/logo/x.svg')).toBeTruthy();
    expect(m.find((e) => e.path === 'Assets/reglement-FR.pdf')).toBeTruthy();
  });
});
