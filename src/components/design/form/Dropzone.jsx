// Dropzone — file upload (pitch deck, exec summary…). Lifts the drag/drop + size/
// type validation that was inline in src/pages/StartupUpload.jsx into a styled,
// copy-agnostic component. Dashed CREAM2 border, CREAM fill, GOLD upload icon; the
// border goes GOLD on drag-over. Shows filename + size + replace/remove once chosen,
// and a spinner + percent while uploading.
//
// Props:
//   accept     : string — e.g. ".pdf,.pptx,.ppt" (also used for client-side ext check).
//   maxSizeMb  : number — max file size in MB (default 50).
//   value      : { name, size?, url? } | File | null — current file (controlled).
//   onFile     : (File) => void — called with a valid file.
//   onRemove   : () => void — optional; shows a remove affordance when provided.
//   onError    : (code) => void — 'format' | 'size'; if omitted, errors surface via `error`.
//   uploading  : bool, progress : number (0..100).
//   disabled   : bool.
//   error      : node — external error to display under the zone (resolved copy).
//   labels     : { prompt, hint, uploading, replace, remove, errFormat, errSize }
//                — all resolved copy (FR/EN/DE). Sensible neutral defaults provided.
//   id, className.

import React, { useRef, useState, useCallback } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { NAVY, GOLD, CREAM, CREAM2, MUTED, INK } from "@/components/design/tokens";
import { DANGER } from "@/components/design/tokens.app";

const DEFAULT_LABELS = {
  prompt: "Déposez votre fichier ici",
  hint: "ou cliquez pour parcourir",
  uploading: "Envoi en cours…",
  replace: "Remplacer",
  remove: "Retirer",
  errFormat: "Format non supporté.",
  errSize: "Fichier trop volumineux.",
};

function extOf(name) {
  const m = (name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// Build the allowed-extension set from an `accept` string (".pdf,.pptx,…").
function allowedExts(accept) {
  return (accept || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."))
    .map((s) => s.slice(1));
}

function fmtSize(bytes) {
  if (bytes == null) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function Dropzone({
  accept = "",
  maxSizeMb = 50,
  value = null,
  onFile,
  onRemove,
  onError,
  uploading = false,
  progress = 0,
  disabled = false,
  error,
  labels = {},
  id,
  className = "",
}) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState(null);

  const exts = allowedExts(accept);
  const maxBytes = maxSizeMb * 1024 * 1024;
  const busy = uploading || disabled;

  const validateAndEmit = useCallback(
    (file) => {
      if (!file) return;
      setLocalErr(null);
      const ext = extOf(file.name);
      if (exts.length > 0 && !exts.includes(ext)) {
        if (onError) onError("format");
        else setLocalErr(L.errFormat);
        return;
      }
      if (file.size > maxBytes) {
        if (onError) onError("size");
        else setLocalErr(L.errSize);
        return;
      }
      onFile?.(file);
    },
    [exts, maxBytes, onError, onFile, L.errFormat, L.errSize],
  );

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const onKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !busy) {
      e.preventDefault();
      openPicker();
    }
  };

  const shownError = error || localErr;
  const fileName = value?.name;
  const fileSize = value?.size;

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy || undefined}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        className="text-center px-5 py-7 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-[#faf7f2]"
        style={{
          border: `2px dashed ${drag ? GOLD : CREAM2}`,
          borderRadius: 4,
          background: drag ? "#fdf6e8" : CREAM,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} aria-hidden />
            <div className="text-[14px] font-medium" style={{ color: NAVY }}>
              {L.uploading}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              {Math.round(progress)}%
            </div>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-1.5">
            {value?.url ? (
              <img
                src={value.url}
                alt=""
                className="w-20 h-20 rounded object-cover"
                style={{ border: `1px solid ${CREAM2}` }}
              />
            ) : (
              <FileUp className="w-6 h-6" style={{ color: GOLD }} aria-hidden />
            )}
            <div className="text-[14px] font-medium break-all" style={{ color: NAVY }}>
              {fileName}
            </div>
            {fileSize != null && (
              <div className="text-xs" style={{ color: MUTED }}>
                {fmtSize(fileSize)}
              </div>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium" style={{ color: INK }}>
                {L.replace}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium rounded-[4px] px-1.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#c9a84c]"
                  style={{ color: DANGER }}
                >
                  <X className="w-3 h-3" />
                  {L.remove}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <FileUp className="w-6 h-6" style={{ color: GOLD }} aria-hidden />
            <div className="text-[14px] font-medium" style={{ color: NAVY }}>
              {L.prompt}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              {L.hint}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept || undefined}
          className="hidden"
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
      </div>

      {shownError && (
        <p className="text-xs mt-1.5" style={{ color: DANGER }} role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}
