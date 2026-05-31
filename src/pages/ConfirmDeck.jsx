// ConfirmDeck — page PUBLIQUE (pas d'auth) de confirmation du pitch deck par session.
//
// Accessible via le lien à token envoyé aux startups : /ConfirmDeck?token=<uuid>.
// L'authentification est le token (une ligne startups = un token unique). Toute la
// logique sécurisée vit dans l'edge function `confirm-deck` (service_role) ; cette
// page ne fait qu'appeler ses 4 actions (info / keep / upload-url / confirm-upload).
//
// Blueprint : docs/blueprints/session-admin-console.md §12.1.

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, UploadCloud, FileCheck2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CREAM, CREAM2, NAVY, GOLD, MUTED, INK, SERIF } from '@/components/design/tokens';
import RotaryWheel from '@/components/design/RotaryWheel';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function getInfo(token) {
  const res = await fetch(`${SUPA_URL}/functions/v1/confirm-deck?token=${encodeURIComponent(token)}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  return res.json();
}

export default function ConfirmDeck() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const fileRef = useRef(null);

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'kept' | 'uploaded'
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setError('Lien invalide (token manquant).'); setLoading(false); return; }
      try {
        const r = await getInfo(token);
        if (!alive) return;
        if (!r?.ok) setError('Lien invalide ou expiré.');
        else setInfo(r);
      } catch {
        if (alive) setError('Connexion impossible.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  async function keepInscription() {
    setBusy(true); setError(null);
    const { data, error: e } = await supabase.functions.invoke('confirm-deck', { body: { token, action: 'keep' } });
    setBusy(false);
    if (e || !data?.ok) setError('Échec de la confirmation.');
    else setDone('kept');
  }

  async function uploadSpecific(file) {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const { data: u } = await supabase.functions.invoke('confirm-deck', {
        body: { token, action: 'upload-url', filename: file.name },
      });
      if (!u?.ok) throw new Error('signed_url');
      const up = await supabase.storage.from('uploads').uploadToSignedUrl(u.path, u.signed_token, file);
      if (up.error) throw up.error;
      const { data: c } = await supabase.functions.invoke('confirm-deck', {
        body: { token, action: 'confirm-upload', path: u.path },
      });
      if (!c?.ok) throw new Error('confirm');
      setDone('uploaded');
    } catch {
      setError('Échec de l’envoi du fichier.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: CREAM }}>
      <div className="w-full max-w-[520px] rounded-[8px] p-7" style={{ background: 'white', border: `1px solid ${CREAM2}`, boxShadow: '0 18px 50px rgba(15,31,61,.08)' }}>
        <div className="flex items-center gap-3 mb-5">
          <RotaryWheel size={34} decorative />
          <span className="uppercase tracking-[0.18em] text-[10.5px] font-semibold" style={{ color: GOLD }}>Rotary Startup Awards</span>
        </div>

        {loading && (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: MUTED }} /></div>
        )}

        {!loading && error && !done && (
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#a23b2d' }} />
            <p className="text-[14px]" style={{ color: INK }}>{error}</p>
          </div>
        )}

        {!loading && info && !done && (
          <>
            <h1 className="text-[22px] mb-1.5" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>
              Confirmez votre pitch deck
            </h1>
            <p className="text-[13.5px] mb-1" style={{ color: INK }}>
              Bonjour {info.contact_person || info.startup_name}, pour votre session de pitch, indiquez le deck que vous présenterez.
            </p>
            {info.confirmed && (
              <p className="text-[12px] mb-4 px-3 py-2 rounded-[4px]" style={{ background: '#ecf1e5', color: '#1d6b4f', border: `1px solid ${CREAM2}` }}>
                Vous avez déjà confirmé — vous pouvez changer votre choix ci-dessous.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <button type="button" onClick={keepInscription} disabled={busy}
                className="flex items-center gap-3 text-left rounded-[6px] px-4 py-3.5 disabled:opacity-50"
                style={{ background: '#fdf6e8', border: `1px solid ${GOLD}` }}>
                <FileCheck2 className="w-5 h-5 shrink-0" style={{ color: GOLD }} />
                <span>
                  <span className="block text-[14px] font-medium" style={{ color: NAVY }}>Je garde mon deck d’inscription</span>
                  <span className="block text-[12px]" style={{ color: MUTED }}>Le deck de votre dossier sera présenté au jury.</span>
                </span>
              </button>

              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="flex items-center gap-3 text-left rounded-[6px] px-4 py-3.5 disabled:opacity-50"
                style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
                <UploadCloud className="w-5 h-5 shrink-0" style={{ color: NAVY }} />
                <span>
                  <span className="block text-[14px] font-medium" style={{ color: NAVY }}>Je charge un deck spécifique à la session</span>
                  <span className="block text-[12px]" style={{ color: MUTED }}>PDF recommandé. Il remplacera le deck d’inscription pour cette session.</span>
                </span>
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.key" className="hidden"
                onChange={(e) => uploadSpecific(e.target.files?.[0])} />
            </div>

            {busy && <div className="mt-4 flex items-center gap-2 text-[12.5px]" style={{ color: MUTED }}><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</div>}
            {error && <p className="text-[12.5px] mt-3" style={{ color: '#a23b2d' }}>{error}</p>}
          </>
        )}

        {done && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: '#1d6b4f' }} />
            <div>
              <h1 className="text-[20px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>Merci, c’est confirmé.</h1>
              <p className="text-[13.5px]" style={{ color: INK }}>
                {done === 'kept'
                  ? 'Votre deck d’inscription sera présenté au jury.'
                  : 'Votre deck spécifique a bien été enregistré et sera transmis au jury.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
