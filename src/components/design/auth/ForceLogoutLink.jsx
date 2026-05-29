// ForceLogoutLink — F10. Bouton subtil "Réinitialiser ma session" sous le login.
//
// Cas d'usage : un user "stuck" — JWT expiré mais cookie/storage Supabase encore
// présent, ou bien un onAuthStateChange qui ne fire jamais (rare mais observé en
// prod sur certains téléphones quand l'écran a été en veille pendant >24h).
// Plutôt que de demander à l'utilisateur de "vider son cache", on lui propose
// un bouton qui :
//   1. appelle supabase.auth.signOut() (révoque la session côté Supabase),
//   2. vide les clés du storage liées à supabase-js (sb-*-auth-token, …),
//   3. recharge la page.
//
// i18n FR/EN/DE via useLang (cf. lib/platform/i18n).
//
// Wording (subtil, Élysée, sans ton catastrophiste — on ne veut pas alarmer
// l'utilisateur qui n'est pas en panne) :
//   FR : "Problème de connexion ? Réinitialiser ma session"
//   EN : "Connection issue? Reset session"
//   DE : "Anmeldeproblem? Sitzung zurücksetzen"
//
// Style : link sous le footer "Rotary Startup Award 2026", couleur MUTED,
// underline-offset Élysée, focus-ring GOLD.

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/platform/i18n';
import { MUTED } from '@/components/design/tokens';

const T = {
  cta: {
    fr: 'Problème de connexion ? Réinitialiser ma session',
    en: 'Connection issue? Reset session',
    de: 'Anmeldeproblem? Sitzung zurücksetzen',
  },
  resetting: {
    fr: 'Réinitialisation…',
    en: 'Resetting…',
    de: 'Wird zurückgesetzt…',
  },
};

// Préfixes de clés storage utilisées par supabase-js (auth token, refresh, etc.).
// On les wipe AVANT signOut() pour qu'un éventuel onAuthStateChange race ne re-pose
// pas un état "encore connecté" avant le reload.
const SUPABASE_STORAGE_PREFIXES = ['sb-', 'supabase.auth.'];

function wipeSupabaseStorage() {
  try {
    if (typeof window === 'undefined') return;
    const stores = [window.localStorage, window.sessionStorage].filter(Boolean);
    for (const store of stores) {
      // On itère sur une copie des clés (Object.keys) : modifier le storage
      // pendant qu'on itère via store.key(i) saute des entrées.
      const keys = Object.keys(store);
      for (const k of keys) {
        if (SUPABASE_STORAGE_PREFIXES.some((p) => k.startsWith(p))) {
          try { store.removeItem(k); } catch { /* quota / mode privé */ }
        }
      }
    }
  } catch {
    /* localStorage indisponible (Safari ITP, mode privé) — on continue, le reload suffira. */
  }
}

export default function ForceLogoutLink({ className = '' }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Signal cross-provider — AuthContext hérité écoute `rsa-signout` et
      //    reset son state immédiatement (cf. F8 dans AuthContext.jsx).
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('rsa-signout')); } catch { /* ok */ }
      }
      // 2) Révoque la session côté Supabase. On NE throw PAS si ça plante
      //    (l'utilisateur veut juste se débloquer ; un échec signOut n'est
      //    pas critique tant qu'on wipe le storage local).
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[ForceLogoutLink] signOut failed (continuing):', err?.message || err);
      }
      // 3) Wipe storage Supabase pour casser une session zombie.
      wipeSupabaseStorage();
      // 4) Reload — l'app repart sur un état propre, /Login monte un formulaire vide.
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      // Pas vraiment utile (reload), mais propre si on monkeypatch reload en tests.
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        'mt-2 text-[11px] underline underline-offset-4 rounded-[4px] px-1 transition-colors ' +
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2] ' +
        'disabled:opacity-60 disabled:cursor-not-allowed ' +
        className
      }
      style={{ color: MUTED }}
    >
      {busy ? t(T.resetting) : t(T.cta)}
    </button>
  );
}
