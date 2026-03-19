import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, X } from "lucide-react";

export default function ReservationForm({ tables, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    table_id: "",
    table_number: "",
    reservation_date: "",
    number_of_people: 1,
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    member_number: "",
    notes: "",
  });

  // Get next Wednesdays
  const getNextWednesdays = () => {
    const wednesdays = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + (i * 7));
      const day = date.getDay();
      const daysUntilWednesday = (3 - day + 7) % 7;
      date.setDate(date.getDate() + daysUntilWednesday);
      if (date >= today) {
        wednesdays.push(date.toISOString().split('T')[0]);
      }
    }
    return wednesdays;
  };

  const nextWednesdays = getNextWednesdays();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.table_id || !formData.reservation_date || !formData.guest_name) {
      return;
    }
    onSubmit(formData);
  };

  const handleTableChange = (tableId) => {
    const selectedTable = tables.find(t => t.id === tableId);
    setFormData({
      ...formData,
      table_id: tableId,
      table_number: selectedTable?.table_number || 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-stone-800">Nouvelle réservation</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Table Selection */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">Table *</Label>
            <Select value={formData.table_id} onValueChange={handleTableChange}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Sélectionner une table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.is_presidential ? "Table Présidentielle" : `Table ${table.table_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date - Wednesdays only */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date (Mercredi) *
            </Label>
            <Select value={formData.reservation_date} onValueChange={(value) => setFormData({ ...formData, reservation_date: value })}>
              <SelectTrigger className="border-stone-200">
                <SelectValue placeholder="Sélectionner un mercredi" />
              </SelectTrigger>
              <SelectContent>
                {nextWednesdays.map(date => (
                  <SelectItem key={date} value={date}>
                    {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of people */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block flex items-center gap-1">
              <Users className="w-3 h-3" />
              Nombre de personnes *
            </Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={formData.number_of_people}
              onChange={(e) => setFormData({ ...formData, number_of_people: parseInt(e.target.value) || 1 })}
              className="border-stone-200"
              required
            />
          </div>

          {/* Guest Name */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">Nom du réservant *</Label>
            <Input
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              placeholder="Jean Dupont"
              className="border-stone-200"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">Email</Label>
            <Input
              type="email"
              value={formData.guest_email}
              onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
              placeholder="jean.dupont@email.com"
              className="border-stone-200"
            />
          </div>

          {/* Phone */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">Téléphone</Label>
            <Input
              type="tel"
              value={formData.guest_phone}
              onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
              className="border-stone-200"
            />
          </div>

          {/* Member Number */}
          <div>
            <Label className="text-xs text-stone-500 mb-2 block">Numéro de membre</Label>
            <Input
              value={formData.member_number}
              onChange={(e) => setFormData({ ...formData, member_number: e.target.value })}
              placeholder="12345"
              className="border-stone-200"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs text-stone-500 mb-2 block">Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Allergies, préférences, demandes spéciales..."
            className="border-stone-200 resize-none"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-stone-300"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            Créer la réservation
          </Button>
        </div>
      </form>
    </motion.div>
  );
}