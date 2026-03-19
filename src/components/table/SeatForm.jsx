import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, UserPlus, UserMinus } from "lucide-react";

export default function SeatForm({ seatNumber, seatData, onSave, onRemove, onClose }) {
  const [form, setForm] = useState({
    first_name: seatData?.first_name || "",
    last_name: seatData?.last_name || "",
    job: seatData?.job || "",
    email: seatData?.email || "",
    phone: seatData?.phone || "",
    member_number: seatData?.member_number || "",
    comment: seatData?.comment || "",
  });

  const isOccupied = seatData?.first_name;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 max-w-sm w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-stone-800">Siège {seatNumber}</h3>
          <p className="text-xs text-stone-400">
            {isOccupied ? "Modifier ou libérer ce siège" : "Prendre ce siège"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-stone-500">Prénom</Label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Jean"
              className="mt-1 border-stone-200 focus:border-amber-400"
            />
          </div>
          <div>
            <Label className="text-xs text-stone-500">Nom</Label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Dupont"
              className="mt-1 border-stone-200 focus:border-amber-400"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-stone-500">Métier</Label>
          <Input
            value={form.job}
            onChange={(e) => setForm({ ...form, job: e.target.value })}
            placeholder="Architecte"
            className="mt-1 border-stone-200 focus:border-amber-400"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jean@example.com"
            className="mt-1 border-stone-200 focus:border-amber-400"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Téléphone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+33 6 12 34 56 78"
            className="mt-1 border-stone-200 focus:border-amber-400"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Numéro de membre</Label>
          <Input
            value={form.member_number}
            onChange={(e) => setForm({ ...form, member_number: e.target.value })}
            placeholder="12345"
            className="mt-1 border-stone-200 focus:border-amber-400"
          />
        </div>
        <div>
          <Label className="text-xs text-stone-500">Commentaire</Label>
          <Input
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder="Invité, autre club, etc."
            className="mt-1 border-stone-200 focus:border-amber-400"
          />
        </div>

        <div className="flex gap-2 pt-3">
          <Button
            type="submit"
            className="flex-1 bg-stone-800 hover:bg-stone-900 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isOccupied ? "Modifier" : "S'installer"}
          </Button>
          {isOccupied && (
            <Button
              type="button"
              variant="outline"
              onClick={onRemove}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <UserMinus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>
    </motion.div>
  );
}