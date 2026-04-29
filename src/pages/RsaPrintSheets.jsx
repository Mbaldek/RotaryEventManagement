// Printable score sheet — ONE blank A4 template per session, FR.
// The organiser prints it once and photocopies it as needed (jury × startup).
// Earlier versions generated a personalised sheet per (juror × startup) — that
// produced 30-50 identical pages and was just noise to print.
//
// Open via /RsaPrintSheets?s=<session_id>. Browser Print (Ctrl/Cmd+P) → A4 PDF.

import React from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SESSION_BY_ID, CRITERIA, getCriterion, getSessionLabel } from "@/lib/rsa/constants";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const INK = "#3a3a52";

export default function RsaPrintSheets() {
  const [params] = useSearchParams();
  const sessionId = params.get("s");
  const session = sessionId ? SESSION_BY_ID[sessionId] : null;
  const lang = "fr";

  if (!sessionId || !session) {
    return (
      <div style={{ padding: 40, color: NAVY, fontFamily: "Inter, sans-serif" }}>
        URL manquante : ajoute <code>?s=&lt;session_id&gt;</code>.
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&display=swap');

        :root {
          --navy: ${NAVY};
          --gold: ${GOLD};
          --ink: ${INK};
        }

        body { background: #eee; }

        .toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          background: white;
          border-bottom: 1px solid #d0d0d0;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sheets {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }

        .sheet {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 14mm 16mm;
          box-shadow: 0 2px 12px rgba(0,0,0,.12);
          color: var(--navy);
          font-family: Inter, sans-serif;
          font-size: 11pt;
          line-height: 1.35;
          box-sizing: border-box;
        }

        .sheet header {
          border-bottom: 2px solid var(--gold);
          padding-bottom: 8px;
          margin-bottom: 12px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }

        .sheet h1 {
          font-family: 'Playfair Display', serif;
          font-size: 20pt;
          font-weight: 600;
          margin: 0;
          color: var(--navy);
        }

        .sheet .eyebrow {
          font-size: 8pt;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
        }

        .meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 12px 0 16px;
          font-size: 10pt;
        }

        .meta .field { display: flex; gap: 6px; align-items: baseline; }
        .meta .field-label { font-weight: 600; color: var(--ink); }
        .meta .field-value {
          flex: 1;
          border-bottom: 1px dotted #999;
          min-height: 14pt;
          font-family: 'Playfair Display', serif;
          font-size: 11pt;
          color: var(--navy);
        }

        .startup-name {
          font-family: 'Playfair Display', serif;
          font-size: 16pt;
          font-weight: 600;
          color: var(--navy);
        }

        .crit {
          margin-top: 10px;
          padding: 8px 10px;
          border: 1px solid #e8e0d0;
          border-radius: 3px;
          page-break-inside: avoid;
        }

        .crit-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .crit-title {
          font-weight: 600;
          font-size: 10.5pt;
          color: var(--navy);
        }

        .crit-weight {
          font-size: 8.5pt;
          color: var(--gold);
          font-weight: 600;
        }

        .crit-desc {
          font-size: 8.5pt;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .scale {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          margin-top: 4px;
        }

        .scale-cell {
          border: 1px solid #c0c0c0;
          padding: 3px 4px;
          font-size: 7pt;
          line-height: 1.2;
          text-align: center;
          min-height: 38pt;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 1px;
        }

        .scale-num {
          font-weight: 700;
          font-size: 10pt;
          color: var(--navy);
          font-family: 'Playfair Display', serif;
        }

        .comment {
          margin-top: 14px;
          page-break-inside: avoid;
        }

        .comment-label {
          font-size: 9pt;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .comment-box {
          border: 1px solid #ccc;
          min-height: 60pt;
          background:
            repeating-linear-gradient(
              transparent,
              transparent 17pt,
              #e0e0e0 17pt,
              #e0e0e0 18pt
            );
        }

        .footer-tot {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 10px;
          border-top: 1px solid #d0d0d0;
          font-size: 9pt;
          color: var(--ink);
        }

        .footer-tot .total-box {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: 'Playfair Display', serif;
        }

        .footer-tot .total-num {
          font-size: 18pt;
          font-weight: 600;
          color: var(--navy);
          border-bottom: 1.5px solid var(--gold);
          min-width: 40pt;
          text-align: center;
          padding: 0 6pt;
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .sheets { padding: 0; gap: 0; }
          .sheet {
            box-shadow: none;
            page-break-after: always;
            margin: 0;
          }
          .sheet:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="toolbar no-print">
        <Link
          to={createPageUrl("RsaAdmin") + `?session=${sessionId}`}
          style={{
            color: INK,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Retour admin
        </Link>
        <div style={{ fontSize: 13, color: INK }}>
          {session.emoji} <strong>{getSessionLabel(session, lang)}</strong> ·{" "}
          template vierge à photocopier
        </div>
        <button
          onClick={() => window.print()}
          style={{
            background: NAVY,
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <Printer style={{ width: 14, height: 14 }} />
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="sheets">
        <Sheet session={session} lang={lang} />
      </div>
    </div>
  );
}

function Sheet({ session, lang }) {
  return (
    <div className="sheet">
      <header>
        <div>
          <div className="eyebrow">
            Rotary Startup Award 2026 · {session.emoji} {getSessionLabel(session, lang)}
          </div>
          <h1>Feuille de scoring</h1>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: INK }}>
          {session.date}
        </div>
      </header>

      <div className="meta">
        <div className="field">
          <span className="field-label">Juré :</span>
          <span className="field-value">&nbsp;</span>
        </div>
        <div className="field">
          <span className="field-label">Startup :</span>
          <span className="field-value startup-name">&nbsp;</span>
        </div>
      </div>

      <div style={{ fontSize: 9, color: INK, marginBottom: 6 }}>
        Pour chaque critère, entourez votre note <strong>de 0 à 5</strong>.
        Pondération indiquée à droite. Total max = 5,00.
      </div>

      {CRITERIA.map((c) => {
        const tc = getCriterion(c, lang);
        return (
          <div key={c.id} className="crit">
            <div className="crit-head">
              <span className="crit-title">{tc.label}</span>
              <span className="crit-weight">poids ×{c.weight.toFixed(1)}</span>
            </div>
            <div className="crit-desc">{tc.desc}</div>
            <div className="scale">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="scale-cell">
                  <span className="scale-num">{n}</span>
                  <span>{tc.anchors[n]}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="comment">
        <div className="comment-label">Commentaire (optionnel) :</div>
        <div className="comment-box" />
      </div>

      <div className="footer-tot">
        <div>
          Signature :{" "}
          <span
            style={{
              borderBottom: "1px dotted #999",
              display: "inline-block",
              minWidth: 120,
              height: 14,
            }}
          />
        </div>
        <div className="total-box">
          <span>Total pondéré /5 :</span>
          <span className="total-num">&nbsp;</span>
        </div>
      </div>
    </div>
  );
}
