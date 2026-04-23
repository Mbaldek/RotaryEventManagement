import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, UserMinus } from "lucide-react";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const INK = "#3a3a52";
const MUTED = "#9090a8";

function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-[1.5px] block" style={{ background: GOLD, width: 28 }} aria-hidden />
      <span
        className="uppercase text-[10px] tracking-[0.18em] font-medium"
        style={{ color: GOLD }}
      >
        {children}
      </span>
    </div>
  );
}

function PickField({ label, required, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label
        className="block text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
        style={{ color: MUTED }}
      >
        {label}
        {required && <span style={{ color: GOLD }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[14px] outline-none transition-colors focus:border-[color:var(--b)]"
        style={{
          background: "white",
          border: `1px solid ${CREAM2}`,
          borderRadius: 4,
          color: NAVY,
          fontFamily: "Inter, sans-serif",
          ["--b"]: GOLD,
        }}
      />
    </div>
  );
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  job: "",
  email: "",
  phone: "",
  member_number: "",
  comment: "",
};

export default function SeatPickModal({
  open,
  seatNumber,
  seatData,
  onClose,
  onConfirm,
  onRemove,
}) {
  const isOccupied = !!seatData?.first_name;
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      first_name: seatData?.first_name || "",
      last_name: seatData?.last_name || "",
      job: seatData?.job || "",
      email: seatData?.email || "",
      phone: seatData?.phone || "",
      member_number: seatData?.member_number || "",
      comment: seatData?.comment || "",
    });
  }, [open, seatData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = form.first_name.trim() && form.last_name.trim();

  const heading = isOccupied ? (
    <>
      Modifier ma <span className="italic">place</span>
    </>
  ) : (
    <>
      Prenez <span className="italic">place</span>
    </>
  );

  const ctaLabel = isOccupied ? "Enregistrer" : "Confirmer ma place";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,31,61,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px] max-h-[90vh] overflow-auto"
            style={{ background: CREAM, border: `1px solid ${CREAM2}`, borderRadius: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-5 flex items-start justify-between gap-3"
              style={{ borderBottom: `1px solid ${CREAM2}` }}
            >
              <div>
                <Eyebrow>Siège {seatNumber}</Eyebrow>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  {heading}
                </h3>
                <p className="text-[12px] mt-1.5" style={{ color: INK }}>
                  Renseignez vos informations. Vous pourrez les modifier à tout moment.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 w-8 h-8 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                style={{ border: `1px solid ${CREAM2}`, borderRadius: 4 }}
              >
                <X className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) onConfirm({ ...form });
              }}
              className="px-6 py-5"
            >
              <div className="mb-5">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Identité
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PickField
                    label="Prénom"
                    required
                    value={form.first_name}
                    onChange={set("first_name")}
                    placeholder="Antoine"
                  />
                  <PickField
                    label="Nom"
                    required
                    value={form.last_name}
                    onChange={set("last_name")}
                    placeholder="Leroy"
                  />
                </div>
                <div className="mt-3">
                  <PickField
                    label="Profession"
                    value={form.job}
                    onChange={set("job")}
                    placeholder="Médecin cardiologue"
                  />
                </div>
              </div>

              <div className="mb-5">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Contact
                </div>
                <div className="space-y-3">
                  <PickField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="antoine.leroy@example.fr"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <PickField
                      label="Téléphone"
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+33 6…"
                    />
                    <PickField
                      label="N° membre"
                      value={form.member_number}
                      onChange={set("member_number")}
                      placeholder="034"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] font-medium mb-3"
                  style={{ color: GOLD }}
                >
                  — Remarques
                </div>
                <label
                  className="block text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
                  style={{ color: MUTED }}
                >
                  Commentaire
                </label>
                <textarea
                  value={form.comment}
                  onChange={set("comment")}
                  rows={2}
                  placeholder="Régime, allergie, invité par…"
                  className="w-full px-3 py-2 text-[14px] outline-none resize-none focus:border-[color:var(--b)]"
                  style={{
                    background: "white",
                    border: `1px solid ${CREAM2}`,
                    borderRadius: 4,
                    color: NAVY,
                    fontFamily: "Inter, sans-serif",
                    ["--b"]: GOLD,
                  }}
                />
              </div>

              <div
                className="flex gap-2 pt-4 flex-wrap"
                style={{ borderTop: `1px solid ${CREAM2}` }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all"
                  style={{
                    background: "transparent",
                    color: MUTED,
                    border: `1px solid ${CREAM2}`,
                    borderRadius: 4,
                  }}
                >
                  Annuler
                </button>
                {isOccupied && onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Libérer le siège"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all"
                    style={{
                      background: "transparent",
                      color: "#a04040",
                      border: `1px solid #d9b8b8`,
                      borderRadius: 4,
                    }}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Libérer
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: NAVY,
                    color: "white",
                    borderRadius: 4,
                  }}
                >
                  {ctaLabel}
                  <ArrowUpRight
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                    style={{ color: GOLD }}
                  />
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
