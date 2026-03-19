import React, { useState } from "react";
import { RestaurantTable, Seat, GlobalSettings, EventHistory, Reservation, getCurrentUser } from "@/lib/db";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Archive, Users, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LaunchEventWizard({ event, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [keepTables, setKeepTables] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ["globalSettings"],
    queryFn: async () => {
      const s = await GlobalSettings.list();
      return s[0] || null;
    },
  });

  const launchEvent = async () => {
    setIsProcessing(true);
    try {
      const currentUser = await getCurrentUser();

      // Step 1: Archive current event if there are occupied seats
      const occupiedSeats = allSeats.filter(s => s.first_name);
      if (occupiedSeats.length > 0) {
        const archiveData = {
          event_date: new Date().toISOString().split('T')[0],
          speaker_name: settings?.speaker_name || "",
          speaker_theme: settings?.speaker_theme || "",
          total_guests: occupiedSeats.length,
          seats_data: occupiedSeats,
          tables_data: tables,
          archived_by: currentUser?.email || "",
        };
        await EventHistory.create(archiveData);
      }

      // Step 2: Reset all seats
      for (const seat of allSeats) {
        if (seat.first_name || seat.is_reserved) {
          await Seat.update(seat.id, {
            first_name: "",
            last_name: "",
            job: "",
            email: "",
            phone: "",
            member_number: "",
            comment: "",
            guest_token: "",
            is_reserved: false,
            reserved_by: "",
            reservation_id: "",
          });
        }
      }

      // Step 3: Delete past reservations
      const today = new Date().toISOString().split('T')[0];
      const reservations = await Reservation.list();
      const pastReservations = reservations.filter(r => r.reservation_date < today);
      for (const res of pastReservations) {
        await Reservation.delete(res.id);
      }

      // Step 4: Delete all tables if user chose not to keep them
      if (!keepTables) {
        for (const table of tables) {
          if (!table.is_presidential) {
            await RestaurantTable.delete(table.id);
          }
        }
      }

      // Step 5: Update global settings with event info
      if (settings?.id) {
        await GlobalSettings.update(settings.id, {
          speaker_name: event.speaker_name || "",
          speaker_theme: event.speaker_theme || "",
          planning_url: event.planning_url || "",
        });
      } else {
        await GlobalSettings.create({
          speaker_name: event.speaker_name || "",
          speaker_theme: event.speaker_theme || "",
          planning_url: event.planning_url || "",
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      queryClient.invalidateQueries({ queryKey: ["globalSettings"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["eventHistory"] });

      toast.success("Événement lancé avec succès");
      onComplete();
    } catch (error) {
      toast.error("Erreur lors du lancement");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const occupiedCount = allSeats.filter(s => s.first_name).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-stone-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Lancer l'événement
            </CardTitle>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-xl"
              disabled={isProcessing}
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Event Info */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              {new Date(event.event_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            {event.speaker_name && (
              <p className="text-sm text-amber-800">
                <span className="font-medium">Conférencier :</span> {event.speaker_name}
              </p>
            )}
            {event.speaker_theme && (
              <p className="text-sm text-amber-700 mt-1">{event.speaker_theme}</p>
            )}
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 rounded ${step >= 1 ? 'bg-amber-600' : 'bg-stone-200'}`} />
            <div className={`flex-1 h-2 rounded ${step >= 2 ? 'bg-amber-600' : 'bg-stone-200'}`} />
            <div className={`flex-1 h-2 rounded ${step >= 3 ? 'bg-amber-600' : 'bg-stone-200'}`} />
          </div>

          {/* Step 1: Review Current State */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                État actuel
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <span className="text-sm text-stone-700">Convives enregistrés</span>
                  <span className="text-sm font-semibold text-stone-900">{occupiedCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <span className="text-sm text-stone-700">Tables configurées</span>
                  <span className="text-sm font-semibold text-stone-900">{tables.length}</span>
                </div>
              </div>
              {occupiedCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Les données actuelles seront archivées automatiquement
                  </p>
                </div>
              )}
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                Continuer
              </Button>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Configuration
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-stone-800">Conserver les tables existantes</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Garder la configuration actuelle des {tables.length} table{tables.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={keepTables}
                    onChange={(e) => setKeepTables(e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  disabled={isProcessing}
                >
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-stone-800 flex items-center gap-2">
                <Archive className="w-5 h-5 text-purple-500" />
                Confirmation
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">Actions qui seront effectuées :</p>
                <ul className="space-y-1 text-sm text-red-700">
                  {occupiedCount > 0 && <li>• Archivage de l'événement actuel ({occupiedCount} convives)</li>}
                  <li>• Réinitialisation de tous les sièges</li>
                  <li>• Suppression des réservations passées</li>
                  {!keepTables && <li>• Suppression des tables (sauf présidentielle)</li>}
                  <li>• Configuration de l'événement du {new Date(event.event_date).toLocaleDateString('fr-FR')}</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Retour
                </Button>
                <Button
                  onClick={launchEvent}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Lancement...
                    </>
                  ) : (
                    "Confirmer le lancement"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}