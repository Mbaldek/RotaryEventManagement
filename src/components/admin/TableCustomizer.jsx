import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Palette, RotateCw, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TableCustomizer({ table, onSave, onClose }) {
  const [shape, setShape] = useState(table?.shape || "round");
  const [color, setColor] = useState(table?.color || "amber");
  const [rotation, setRotation] = useState(table?.rotation || 0);

  const colors = [
    { value: "amber", label: "Ambre", class: "bg-amber-200" },
    { value: "blue", label: "Bleu", class: "bg-blue-200" },
    { value: "green", label: "Vert", class: "bg-green-200" },
    { value: "purple", label: "Violet", class: "bg-purple-200" },
    { value: "red", label: "Rouge", class: "bg-red-200" },
    { value: "pink", label: "Rose", class: "bg-pink-200" },
    { value: "orange", label: "Orange", class: "bg-orange-200" },
    { value: "slate", label: "Gris", class: "bg-slate-200" },
  ];

  const handleSave = () => {
    onSave({ shape, color, rotation });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-stone-800">
                {table?.is_presidential ? "Table Présidentielle" : `Table ${table?.table_number}`}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Shape */}
            <div>
              <Label className="text-sm text-stone-700 mb-2 flex items-center gap-2">
                <Square className="w-4 h-4" />
                Forme de la table
              </Label>
              <Select value={shape} onValueChange={setShape}>
                <SelectTrigger className="border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Ronde</SelectItem>
                  <SelectItem value="square">Carrée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div>
              <Label className="text-sm text-stone-700 mb-2 block">Couleur</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`h-12 ${c.class} rounded-lg border-2 transition-all ${
                      color === c.value
                        ? "border-stone-800 ring-2 ring-stone-800 ring-offset-2"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div>
              <Label className="text-sm text-stone-700 mb-2 flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                Rotation ({rotation}°)
              </Label>
              <Slider
                value={[rotation]}
                onValueChange={(vals) => setRotation(vals[0])}
                min={0}
                max={360}
                step={15}
                className="w-full"
              />
            </div>

            {/* Preview with room context */}
            <div className="bg-stone-50 rounded-xl p-6 relative">
              <p className="text-xs text-stone-500 mb-3 text-center">Aperçu avec orientation</p>
              
              {/* Room markers */}
              <div className="absolute top-6 right-6 bg-stone-700 text-white px-2 py-1 rounded text-[8px] font-medium">
                Estrade
              </div>
              <div className="absolute top-6 left-6 bg-blue-100 text-blue-700 px-2 py-1 rounded text-[8px] font-medium border border-blue-300">
                Fenêtre
              </div>
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-700 px-2 py-1 rounded text-[8px] font-medium border border-green-300">
                Entrée
              </div>

              {/* Table preview */}
              <div className="flex items-center justify-center h-32">
                <div
                  className={`w-24 h-24 ${
                    shape === "round" ? "rounded-full" : "rounded-2xl"
                  } bg-gradient-to-br ${
                    colors.find(c => c.value === color)?.class || "bg-amber-200"
                  } border-4 border-stone-300 shadow-lg flex items-center justify-center transition-all`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <span className="text-2xl font-light text-stone-600">
                    {table?.is_presidential ? "★" : table?.table_number}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-stone-200"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-stone-800 hover:bg-stone-900"
            >
              Enregistrer
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}