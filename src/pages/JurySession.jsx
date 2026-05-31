// JurySession — page jury-facing (façon RsaJuryHub) pour UNE session.
//
// Accès : /JurySession?session=<id>. Réservée (RPC SECURITY DEFINER
// rsa_jury_session_startups) aux jurés assignés, club_admin du club, ou admin.
// Affiche le roster des startups avec le DECK RETENU (spécifique session sinon
// inscription) + infos dossier. Lecture seule.
//
// Blueprint : docs/blueprints/session-admin-console.md §12.3.

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CREAM, CREAM2, NAVY, GOLD, MUTED, INK, SERIF } from '@/components/design/tokens';
import RotaryWheel from '@/components/design/RotaryWheel';

function deckUrl(path) {
  if (!path) return null;
  try { return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl; } catch { return null; }
}

function Field({ label, children }) {
  if (!children) return null;
  return (
    <div className="mt-2">
      <p className="uppercase tracking-[0.13em] text-[10px] mb-0.5" style={{ color: MUTED }}>{label}</p>
      <p className="text-[12.5px]" style={{ color: INK }}>{children}</p>
    </div>
  );
}

export default function JurySession() {
  const [params] = useSearchParams();
  const sessionId = params.get('session') || '';

  const q = useQuery({
    queryKey: ['rsa', 'jury-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rsa_jury_session_startups', { p_session_id: sessionId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
    retry: false,
  });

  return (
    <div className="min-h-screen p-5 md:p-8" style={{ background: CREAM }}>
      <div className="max-w-[860px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <RotaryWheel size={32} decorative />
          <span className="uppercase tracking-[0.18em] text-[10.5px] font-semibold" style={{ color: GOLD }}>Espace jury — session</span>
        </div>

        <h1 className="text-[24px] mb-1" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>Dossiers à évaluer</h1>
        <p className="text-[13px] mb-6" style={{ color: INK }}>Decks et dossiers des startups candidates de cette session.</p>

        {!sessionId && (
          <p className="text-[13px]" style={{ color: '#a23b2d' }}>Session manquante dans le lien.</p>
        )}

        {q.isLoading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: MUTED }} /></div>}

        {q.isError && (
          <div className="flex items-start gap-2.5 rounded-[6px] p-4" style={{ background: '#f6e7e3', border: `1px solid ${CREAM2}` }}>
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#a23b2d' }} />
            <p className="text-[13px]" style={{ color: INK }}>
              Accès refusé ou session introuvable. Connectez-vous avec le compte juré invité pour cette session.
            </p>
          </div>
        )}

        {!q.isLoading && !q.isError && (q.data || []).length === 0 && (
          <p className="text-[13px]" style={{ color: MUTED }}>Aucune startup pour cette session.</p>
        )}

        {!q.isLoading && !q.isError && (q.data || []).length > 0 && (
          <ul className="flex flex-col gap-3">
            {(q.data || []).map((s) => {
              const url = deckUrl(s.deck_path);
              return (
                <li key={s.id} className="rounded-[7px] p-5" style={{ background: 'white', border: `1px solid ${CREAM2}` }}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <h2 className="text-[17px] flex-1 min-w-[180px]" style={{ fontFamily: SERIF, color: NAVY, fontWeight: 500 }}>{s.name}</h2>
                    {url
                      ? <a href={url} target="_blank" rel="noreferrer noopener"
                          className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-[4px]"
                          style={{ color: NAVY, background: '#fdf6e8', border: `1px solid ${GOLD}` }}>
                          <FileText className="w-4 h-4" style={{ color: GOLD }} /> Ouvrir le deck
                        </a>
                      : <span className="text-[11.5px]" style={{ color: MUTED }}>deck non fourni</span>}
                  </div>
                  {Array.isArray(s.sectors) && s.sectors.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {s.sectors.map((sec) => (
                        <span key={sec} className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: '#eff1f6', color: NAVY, border: `1px solid ${CREAM2}` }}>{sec}</span>
                      ))}
                    </div>
                  )}
                  <Field label="Proposition de valeur">{s.value_proposition}</Field>
                  <Field label="Équipe">{s.team}</Field>
                  <Field label="Traction">{s.traction}</Field>
                  <Field label="Impact ESG">{s.esg_impact}</Field>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
