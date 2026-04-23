import React, { useState } from "react";
import { Reservation, UpcomingEvent } from "@/lib/db";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Calendar, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ReservationRequest() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    event_id: "",
    reservation_date: "",
    number_of_people: 1,
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    member_number: "",
    notes: "",
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const futureEvents = upcomingEvents.filter(
    (ev) => ev.event_date && ev.event_date >= todayStr
  );

  const handleEventChange = (eventId) => {
    const selectedEvent = futureEvents.find((ev) => ev.id === eventId);
    setFormData({
      ...formData,
      event_id: eventId,
      reservation_date: selectedEvent?.event_date || "",
    });
  };

  const formatEventLabel = (ev) => {
    const d = new Date(ev.event_date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const title = ev.title || ev.speaker_name || "Déjeuner statutaire";
    return `${d} — ${title}`;
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      await Reservation.create(data);
    },
    onSuccess: () => {
      toast.success("Demande de réservation envoyée avec succès", {
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        description: "Vous recevrez une confirmation par email",
      });
      setTimeout(() => navigate(createPageUrl("Index")), 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.event_id || !formData.guest_name || !formData.guest_email) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createRequestMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to={createPageUrl("Index")}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">Demande de réservation</h1>
            <p className="text-sm text-stone-400">Pour un déjeuner statutaire du mercredi</p>
          </div>
        </div>

        {/* Form */}
        <Card className="border-stone-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Informations de réservation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event selection — drives reservation_date */}
                <div className="md:col-span-2">
                  <Label className="text-xs text-stone-500 mb-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Événement *
                  </Label>
                  <Select value={formData.event_id} onValueChange={handleEventChange}>
                    <SelectTrigger className="border-stone-200">
                      <SelectValue placeholder={futureEvents.length === 0 ? "Aucun événement planifié" : "Sélectionner un événement"} />
                    </SelectTrigger>
                    <SelectContent>
                      {futureEvents.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {formatEventLabel(ev)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {futureEvents.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Aucun événement à venir pour le moment — réessayez plus tard.
                    </p>
                  )}
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
                  <Label className="text-xs text-stone-500 mb-2 block">Nom complet *</Label>
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
                  <Label className="text-xs text-stone-500 mb-2 block">Email *</Label>
                  <Input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    placeholder="jean.dupont@email.com"
                    className="border-stone-200"
                    required
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
                <Label className="text-xs text-stone-500 mb-2 block">Notes / Demandes spéciales</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Allergies, préférences, invités..."
                  className="border-stone-200 resize-none"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 h-12"
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? "Envoi en cours..." : "Envoyer la demande"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">
            ℹ️ Votre demande sera examinée par l'équipe administrative. 
            Vous recevrez une confirmation par email une fois votre réservation validée.
          </p>
        </div>
      </div>
    </div>
  );
}