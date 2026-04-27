// QR + link modal for the juror scoring URL — handed out by the admin
// (slide projected at the start of the session, emailed J-3 with the brief,
// or shown to a walk-in who landed without having registered digitally).

import React, { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

export default function JurorLinkQR({ open, onClose, sessionId, sessionLabel, sessionEmoji }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const url = `${window.location.origin}/RsaScore?s=${sessionId}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Lien copié"),
      () => toast.error("Copie impossible")
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,31,61,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CREAM,
          border: `1px solid ${CREAM2}`,
          borderRadius: 8,
          maxWidth: 520,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(15,31,61,0.25)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${CREAM2}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: GOLD,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Lien juré
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22,
                fontWeight: 600,
                color: NAVY,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {sessionEmoji} {sessionLabel}
            </h2>
            <p style={{ fontSize: 12, color: INK, marginTop: 6, lineHeight: 1.45 }}>
              À afficher en intro de session ou à envoyer J-3 avec le brief.
              Les jurés scannent ou cliquent — ils choisissent leur nom dans la liste.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "white",
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X style={{ width: 16, height: 16, color: MUTED }} />
          </button>
        </div>

        <div
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              padding: 18,
              background: "white",
              border: `1px solid ${CREAM2}`,
              borderRadius: 6,
              boxShadow: "0 4px 18px rgba(15,31,61,0.06)",
            }}
          >
            <QRCodeSVG
              value={url}
              size={232}
              level="M"
              fgColor={NAVY}
              bgColor="white"
              marginSize={0}
            />
          </div>

          <div style={{ width: "100%" }}>
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: MUTED,
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              URL
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              <code
                style={{
                  flex: 1,
                  background: "white",
                  border: `1px solid ${CREAM2}`,
                  borderRadius: 4,
                  padding: "9px 12px",
                  fontSize: 12.5,
                  color: NAVY,
                  fontFamily: "'JetBrains Mono', monospace",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {url}
              </code>
              <button
                onClick={copy}
                style={{
                  background: "white",
                  border: `1px solid ${CREAM2}`,
                  borderRadius: 4,
                  padding: "0 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: INK,
                  fontFamily: "Inter, sans-serif",
                }}
                title="Copier"
              >
                <Copy style={{ width: 13, height: 13, color: GOLD }} />
                Copier
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "white",
                  border: `1px solid ${CREAM2}`,
                  borderRadius: 4,
                  padding: "0 10px",
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
                title="Ouvrir"
              >
                <ExternalLink style={{ width: 13, height: 13, color: GOLD }} />
              </a>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(201,168,76,0.08)",
              border: "1px solid #e8d090",
              borderRadius: 4,
              fontSize: 11.5,
              color: INK,
              lineHeight: 1.45,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Check
              style={{
                width: 12,
                height: 12,
                color: "#9a6400",
                display: "inline-block",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            <strong style={{ color: "#9a6400" }}>Astuce</strong> · Mettre ce QR dans
            les slides d'ouverture pour que les jurés se connectent en
            scannant directement avec leur téléphone, sans avoir à taper d'URL.
          </div>
        </div>
      </div>
    </div>
  );
}
