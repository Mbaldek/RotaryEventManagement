import React, { useState } from "react";
import { RestaurantTable, Seat } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save, Users, CheckCircle2, Circle, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const colorClasses = {
  amber: "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-300",
  blue: "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300",
  green: "bg-gradient-to-br from-green-100 to-green-50 border-green-300",
  purple: "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-300",
  red: "bg-gradient-to-br from-red-100 to-red-50 border-red-300",
  pink: "bg-gradient-to-br from-pink-100 to-pink-50 border-pink-300",
  orange: "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-300",
  slate: "bg-gradient-to-br from-slate-100 to-slate-50 border-slate-300",
};

export default function FloorPlan() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: tables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: allSeats = [] } = useQuery({
    queryKey: ["allSeats"],
    queryFn: () => Seat.list(),
  });

  const [localTables, setLocalTables] = useState(tables);

  React.useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  const getOccupiedSeatsForTable = (tableId) => {
    return allSeats.filter(s => s.table_id === tableId && s.first_name).length;
  };
  
  const getReservedSeatsForTable = (tableId) => {
    return allSeats.filter(s => s.table_id === tableId && s.is_reserved).length;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localTables);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalTables(items);
    setHasChanges(true);
  };

  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < localTables.length; i++) {
        await RestaurantTable.update(localTables[i].id, {
          table_number: i + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTables"] });
      setHasChanges(false);
      toast.success("Disposition sauvegardée");
    },
  });

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl("Dashboard")}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-stone-800">Plan de salle interactif</h1>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">BETA</span>
              </div>
              <p className="text-sm text-stone-400">
                Glissez-déposez les tables pour réorganiser la disposition
              </p>
            </div>
          </div>
          {hasChanges && (
            <Button
              onClick={() => saveLayoutMutation.mutate()}
              disabled={saveLayoutMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder la disposition
            </Button>
          )}
        </div>

        {/* Floor Plan */}
        <div className="bg-white rounded-2xl border-2 border-stone-200 p-8">
          <div className="mb-6 flex items-center gap-4 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-stone-700 rounded" />
              <span>Estrade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
              <span>Fenêtre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span>Entrée</span>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="floor-plan">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 min-h-[400px] p-6 rounded-xl transition-colors ${
                    snapshot.isDraggingOver ? "bg-amber-50" : "bg-stone-50"
                  }`}
                >
                  {localTables.map((table, index) => {
                    const totalSeats = table.is_presidential ? 12 : 8;
                    const occupiedCount = getOccupiedSeatsForTable(table.id);
                    const reservedCount = getReservedSeatsForTable(table.id);
                    const freeCount = totalSeats - occupiedCount - reservedCount;
                    const colorClass = colorClasses[table.color || "amber"];
                    const isRound = (table.shape || "round") === "round";

                    return (
                      <Draggable key={table.id} draggableId={table.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white rounded-xl border-2 p-4 transition-all cursor-move ${
                              snapshot.isDragging
                                ? "border-amber-400 shadow-2xl scale-105"
                                : "border-stone-200 hover:border-amber-300 hover:shadow-lg"
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              {/* Visual Preview */}
                              <div
                                className={`w-20 h-20 ${isRound ? "rounded-full" : "rounded-xl"} ${colorClass} border-3 shadow-md flex items-center justify-center mb-3`}
                                style={{ transform: `rotate(${table.rotation || 0}deg)` }}
                              >
                                <span className="text-xl font-light text-stone-700">
                                  {table.is_presidential ? "★" : table.table_number}
                                </span>
                              </div>

                              {/* Table Info */}
                              <p className="text-sm font-semibold text-stone-800 mb-1">
                                {table.is_presidential ? "Présidentielle" : `Table ${table.table_number}`}
                              </p>

                              {/* Stats */}
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{occupiedCount}</span>
                                </div>
                                {reservedCount > 0 && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <BookmarkCheck className="w-3 h-3" />
                                    <span>{reservedCount}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-stone-400">
                                  <Circle className="w-3 h-3" />
                                  <span>{freeCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Astuce :</strong> Glissez et déposez les tables pour modifier leur ordre dans la salle. 
            Cliquez sur "Sauvegarder la disposition" pour enregistrer les changements.
          </p>
        </div>
      </div>
    </div>
  );
}