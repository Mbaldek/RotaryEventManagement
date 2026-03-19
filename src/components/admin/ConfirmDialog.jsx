import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  const [input, setInput] = useState("");

  const handleConfirm = () => {
    if (input.toUpperCase() === "VALIDER") {
      onConfirm();
      setInput("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
            <p className="text-sm text-stone-500 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-800 font-medium">
            Pour valider l'action, tapez <span className="font-bold">VALIDER</span>
          </p>
        </div>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tapez VALIDER"
          className="mb-4 border-stone-300 focus:border-red-400"
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={input.toUpperCase() !== "VALIDER"}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400"
          >
            Confirmer
          </Button>
        </div>
      </motion.div>
    </div>
  );
}