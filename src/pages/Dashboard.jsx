import React, { useState } from "react";
import { RestaurantTable, Seat, getCurrentUser } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutGrid, Settings, Users, CheckCircle2, Circle, CalendarCheck, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TableCard from "../components/dashboard/TableCard";
import TableCustomizer from "../components/admin/TableCustomizer";
import { toast } from "sonner";

export default function Dashboard() {
  const [customizingTable, setCustomizingTable] = useState(null);
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  // Customize table
  const customizeTableMutation = useMutation({
    mutationFn: async ({ tableId, data }) => {
      await RestaurantTable.update(tableId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      setCustomizingTable(null);
      toast.success("Table personnalisée");
    },
  });

  // Calculate stats
  const totalOccupied = allSeats.filter(s => s.first_name).length;
  const totalReserved = allSeats.filter(s => s.is_reserved).length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.is_presidential ? 12 : 8), 0);
  const totalTaken = totalOccupied + totalReserved;
  const occupancyRate = totalCapacity > 0 ? Math.round((totalTaken / totalCapacity) * 100) : 0;

  const getOccupiedSeatsForTable = (tableId) => {
    return allSeats.filter(s => s.table_id === tableId && s.first_name).length;
  };
  
  const getReservedSeatsForTable = (tableId) => {
    return allSeats.filter(s => s.table_id === tableId && s.is_reserved).length;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800">Vue d'ensemble</h1>
              <p className="text-sm text-stone-400">
                {tables.length} table{tables.length > 1 ? "s" : ""} · {totalOccupied} occupés · {totalReserved} réservés · {totalCapacity - totalTaken} libres
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("Reservations")}>
              <Button variant="outline" size="sm" className="border-stone-300">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Réservations
              </Button>
            </Link>
            {user?.role === 'admin' && (
              <Link to={createPageUrl("AdminControl")}>
                <Button variant="outline" size="sm" className="border-stone-300">
                  <Settings className="w-4 h-4 mr-2" />
                  Administration
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Nombre de tables</p>
                <p className="text-2xl font-semibold text-stone-800">{tables.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Sièges occupés</p>
                <p className="text-2xl font-semibold text-stone-800">{totalOccupied}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookmarkCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Sièges réservés</p>
                <p className="text-2xl font-semibold text-stone-800">{totalReserved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-stone-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500">Taux d'occupation</p>
                <p className="text-2xl font-semibold text-stone-800">{occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-4">Toutes les tables</h2>
          {tables.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <LayoutGrid className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 mb-2">Aucune table créée</p>
              {user?.role === 'admin' && (
                <Link to={createPageUrl("AdminControl")}>
                  <Button size="sm" className="bg-stone-800 hover:bg-stone-900">
                    Créer des tables
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tables.map(table => {
                const totalSeats = table.is_presidential ? 12 : 8;
                const occupiedCount = getOccupiedSeatsForTable(table.id);
                const reservedCount = getReservedSeatsForTable(table.id);
                return (
                  <TableCard
                    key={table.id}
                    table={table}
                    occupiedCount={occupiedCount}
                    reservedCount={reservedCount}
                    totalSeats={totalSeats}
                    onCustomize={setCustomizingTable}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table Customizer Modal */}
      {customizingTable && (
        <TableCustomizer
          table={customizingTable}
          onSave={(data) => customizeTableMutation.mutate({ tableId: customizingTable.id, data })}
          onClose={() => setCustomizingTable(null)}
        />
      )}
    </div>
  );
}