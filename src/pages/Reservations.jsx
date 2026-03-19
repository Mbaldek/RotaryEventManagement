import React, { useState } from "react";
import { Reservation, RestaurantTable, Seat } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Plus, Calendar, Users, Phone, Mail, MessageSquare, Check, X, Play, Square, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReservationForm from "../components/reservations/ReservationForm";

export default function Reservations() {
  const [showForm, setShowForm] = useState(false);
  const [launchingReservation, setLaunchingReservation] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const queryClient = useQueryClient();

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations"],
    queryFn: () => Reservation.list("-reservation_date"),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data) => {
      await Reservation.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setShowForm(false);
      toast.success("Réservation créée avec succès", {
        icon: <Check className="w-5 h-5 text-green-600" />,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await Reservation.update(id, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      const statusText = variables.status === "confirmed" ? "confirmée" : "annulée";
      toast.success(`Réservation ${statusText}`, {
        icon: variables.status === "confirmed" ? 
          <Check className="w-5 h-5 text-green-600" /> : 
          <X className="w-5 h-5 text-red-600" />,
      });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id) => {
      await Reservation.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Réservation supprimée");
    },
  });

  const launchReservationMutation = useMutation({
    mutationFn: async ({ reservation, tableId }) => {
      const allSeats = await Seat.list();
      const selectedTable = tables.find(t => t.id === tableId);
      
      if (!selectedTable) {
        throw new Error("Table introuvable");
      }

      const maxSeats = selectedTable.is_presidential ? 12 : 8;
      const tableSeats = allSeats.filter(s => s.table_id === tableId);
      const occupiedNumbers = tableSeats.map(s => s.seat_number);
      
      const available = [];
      for (let i = 1; i <= maxSeats; i++) {
        if (!occupiedNumbers.includes(i)) {
          available.push(i);
        }
      }
      
      if (available.length < reservation.number_of_people) {
        throw new Error(`Table ${selectedTable.table_number} n'a que ${available.length} place(s) disponible(s)`);
      }

      const availableSeatNumbers = available.slice(0, reservation.number_of_people);

      // Create reserved seats
      const seatsToCreate = [];
      for (let idx = 0; idx < reservation.number_of_people; idx++) {
        const seatNumber = availableSeatNumbers[idx];
        seatsToCreate.push({
          table_id: tableId,
          seat_number: seatNumber,
          is_reserved: true,
          reserved_by: reservation.guest_name,
          reservation_id: reservation.id,
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          member_number: "",
          comment: "",
          guest_token: crypto.randomUUID().slice(0, 8),
        });
      }
      
      await Seat.bulkCreate(seatsToCreate);
      
      // Update reservation with assigned table
      await Reservation.update(reservation.id, { 
        status: "launched",
        table_id: tableId,
        table_number: selectedTable.table_number
      });
      
      return selectedTable;
    },
    onSuccess: (selectedTable) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      toast.success(`Réservation lancée - Table ${selectedTable.table_number} assignée`, {
        icon: <Play className="w-5 h-5 text-blue-600" />,
      });
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors du lancement", {
        description: "Vérifiez la disponibilité des tables",
      });
    },
  });

  const releaseReservationMutation = useMutation({
    mutationFn: async (reservation) => {
      const seats = await Seat.filter({ reservation_id: reservation.id });
      await Promise.all(seats.map(seat => Seat.delete(seat.id)));
      await Reservation.update(reservation.id, { 
        status: "confirmed",
        table_id: null,
        table_number: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["allSeats"] });
      toast.success("Réservation libérée - Sièges supprimés", {
        icon: <Square className="w-5 h-5 text-orange-600" />,
      });
    },
  });

  const handleShowAvailableTables = async (reservation) => {
    const allSeats = await Seat.list();
    const available = [];
    
    for (const table of tables) {
      const maxSeats = table.is_presidential ? 12 : 8;
      const tableSeats = allSeats.filter(s => s.table_id === table.id);
      const occupiedCount = tableSeats.length;
      const freeSeats = maxSeats - occupiedCount;
      
      if (freeSeats >= reservation.number_of_people) {
        available.push({
          ...table,
          freeSeats,
          maxSeats
        });
      }
    }
    
    setAvailableTables(available);
    setLaunchingReservation(reservation);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    confirmed: "bg-green-100 text-green-700 border-green-300",
    launched: "bg-blue-100 text-blue-700 border-blue-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };

  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmée",
    launched: "Lancée",
    cancelled: "Annulée",
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl("Index")}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800">Réservations</h1>
              <p className="text-sm text-stone-400">
                {reservations.length} réservation{reservations.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle réservation
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <ReservationForm
            tables={tables}
            onSubmit={(data) => createReservationMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Reservations List */}
        <div className="grid gap-4">
          {reservations.length === 0 ? (
            <Card className="border-stone-200">
              <CardContent className="p-8 text-center">
                <p className="text-stone-400 italic">Aucune réservation pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            reservations.map((reservation) => (
              <Card key={reservation.id} className="border-stone-200 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {reservation.table_number ? `Table ${reservation.table_number} - ` : ""}{reservation.guest_name}
                        </CardTitle>
                        <p className="text-xs text-stone-500 mt-1">
                          {new Date(reservation.reservation_date).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${statusColors[reservation.status]} border`}>
                      {statusLabels[reservation.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reservation.status === "launched" && reservation.table_number && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-blue-800">
                        ✓ Table assignée : <span className="font-bold">Table {reservation.table_number}</span>
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Users className="w-4 h-4 text-stone-400" />
                      <span>{reservation.number_of_people} personne{reservation.number_of_people > 1 ? "s" : ""}</span>
                    </div>
                    {reservation.guest_email && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <Mail className="w-4 h-4 text-stone-400" />
                        <span className="truncate">{reservation.guest_email}</span>
                      </div>
                    )}
                  </div>

                  {reservation.guest_phone && (
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Phone className="w-4 h-4 text-stone-400" />
                      <span>{reservation.guest_phone}</span>
                    </div>
                  )}

                  {reservation.notes && (
                    <div className="flex items-start gap-2 text-sm text-stone-600 bg-stone-50 rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-stone-400 mt-0.5" />
                      <span>{reservation.notes}</span>
                    </div>
                  )}

                  {reservation.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: "confirmed" })}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: "cancelled" })}
                        className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  )}

                  {reservation.status === "confirmed" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleShowAvailableTables(reservation)}
                        className="bg-blue-600 hover:bg-blue-700 flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Lancer (choisir table)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteReservationMutation.mutate(reservation.id)}
                        className="text-stone-500 hover:text-red-600 hover:border-red-300"
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}

                  {reservation.status === "launched" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => releaseReservationMutation.mutate(reservation)}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 flex-1"
                      >
                        <Square className="w-4 h-4 mr-1" />
                        Libérer (supprimer sièges)
                      </Button>
                    </div>
                  )}

                  {reservation.status === "cancelled" && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteReservationMutation.mutate(reservation.id)}
                        className="w-full text-stone-500 hover:text-red-600 hover:border-red-300"
                      >
                        Supprimer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Table Selection Modal */}
        {launchingReservation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6 border-b border-stone-200">
                <h2 className="text-xl font-semibold text-stone-800">
                  Choisir une table pour {launchingReservation.guest_name}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {launchingReservation.number_of_people} personne{launchingReservation.number_of_people > 1 ? "s" : ""} · {availableTables.length} table{availableTables.length > 1 ? "s" : ""} disponible{availableTables.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-6 space-y-3">
                {availableTables.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-stone-500">
                      Aucune table disponible avec {launchingReservation.number_of_people} places libres
                    </p>
                  </div>
                ) : (
                  availableTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => {
                        launchReservationMutation.mutate({ 
                          reservation: launchingReservation, 
                          tableId: table.id 
                        });
                        setLaunchingReservation(null);
                        setAvailableTables([]);
                      }}
                      className="w-full bg-white border-2 border-stone-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-semibold text-stone-800">
                          {table.is_presidential ? "Table Présidentielle" : `Table ${table.table_number}`}
                        </p>
                        <p className="text-sm text-stone-500">
                          {table.freeSeats} place{table.freeSeats > 1 ? "s" : ""} disponible{table.freeSeats > 1 ? "s" : ""} sur {table.maxSeats}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-blue-600" />
                    </button>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-stone-200">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setLaunchingReservation(null);
                    setAvailableTables([]);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}