import JSZip from 'jszip';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { buildVariables } from './render';
import { buildZipManifest } from './manifest';
import OnePagerPdf from '@/components/rsa/comm-pack/OnePagerPdf';

const ONEPAGER_LABELS = {
  fr: { eyebrow: 'Kit incubateur', applications: 'Candidatures', awards: 'Dotations', eligibility: 'Éligibilité', format: 'Format', ceremony: 'Cérémonie', info: 'Infos & candidature' },
  en: { eyebrow: 'Incubator kit', applications: 'Applications', awards: 'Awards', eligibility: 'Eligibility', format: 'Format', ceremony: 'Ceremony', info: 'Info & apply' },
  de: { eyebrow: 'Inkubator-Kit', applications: 'Bewerbungen', awards: 'Preise', eligibility: 'Zulassung', format: 'Format', ceremony: 'Zeremonie', info: 'Infos & Bewerbung' },
};

// Build réel (navigateur) : génère les PDF + fetch les assets + zippe.
export async function buildCommPackZip(edition, { fetchAsset }) {
  const zip = new JSZip();
  const manifest = buildZipManifest(edition);
  for (const entry of manifest) {
    if (entry.content != null) {
      zip.file(entry.path, entry.content);
    } else if (entry.onePagerLang) {
      const vars = buildVariables(edition, entry.onePagerLang);
      const blob = await pdf(React.createElement(OnePagerPdf, { vars, labels: ONEPAGER_LABELS[entry.onePagerLang] })).toBlob();
      zip.file(entry.path, blob);
    } else if (entry.assetPath && typeof fetchAsset === 'function') {
      const blob = await fetchAsset(entry.assetPath);
      if (blob) zip.file(entry.path, blob);
    }
  }
  return zip.generateAsync({ type: 'blob' });
}

export { buildZipManifest };
