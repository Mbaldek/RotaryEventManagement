import { LANGS } from '@/lib/platform/i18n';
import { renderTextDeliverables } from './render';

const LANG_FOLDER = { fr: 'FR', en: 'EN', de: 'DE' };
const EXT = { email: 'txt', newsletter: 'md', social: 'txt', keymsg: 'txt', faq: 'md' };

function extOf(path) {
  const m = /\.([a-z0-9]+)$/i.exec(path || '');
  return m ? `.${m[1]}` : '';
}

// Manifest pur (testable sans navigateur) : décrit ce que le ZIP contiendra.
export function buildZipManifest(edition) {
  const entries = [];
  const texts = renderTextDeliverables(edition);
  for (const lang of LANGS) {
    const folder = LANG_FOLDER[lang];
    for (const [key, body] of Object.entries(texts[lang])) {
      entries.push({ path: `${folder}/${key}.${EXT[key] || 'txt'}`, content: body });
    }
    entries.push({ path: `${folder}/email.html`, content: `<pre>${texts[lang].email}</pre>` });
    entries.push({ path: `${folder}/one-pager.pdf`, onePagerLang: lang });
  }
  const assets = edition?.comm_pack_config?.assets || {};
  if (assets.logo_path) entries.push({ path: `Assets/logo${extOf(assets.logo_path)}`, assetPath: assets.logo_path });
  for (const lang of LANGS) {
    const poster = assets.poster?.[lang];
    if (poster) entries.push({ path: `Assets/affiche-${LANG_FOLDER[lang]}${extOf(poster)}`, assetPath: poster });
    const regl = assets.reglement?.[lang];
    if (regl) entries.push({ path: `Assets/reglement-${LANG_FOLDER[lang]}.pdf`, assetPath: regl });
  }
  return entries;
}

export { LANG_FOLDER };
