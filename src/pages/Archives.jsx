import React, { useState } from "react";
import { EventHistory } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Archive, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Archives() {
  const [expandedArchive, setExpandedArchive] = useState(null);

  const { data: archives = [] } = useQuery({
    queryKey: ["eventHistory"],
    queryFn: () => EventHistory.list("-event_date"),
  });

  const toggleExpand = (id) => {
    setExpandedArchive(expandedArchive === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to={createPageUrl("AdminControl")}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">Archives</h1>
            <p className="text-sm text-stone-400">
              Historique des événements archivés
            </p>
          </div>
        </div>

        {/* Archives List */}
        {archives.length === 0 ? (
          <Card className="border-stone-200">
            <CardContent className="py-12 text-center">
              <Archive className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">Aucun événement archivé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {archives.map((archive) => {
              const isExpanded = expandedArchive === archive.id;
              const seatsData = archive.seats_data || [];
              const tablesData = archive.tables_data || [];

              return (
                <Card key={archive.id} className="border-stone-200">
                  <CardHeader className="cursor-pointer" onClick={() => toggleExpand(archive.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {new Date(archive.event_date).toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </CardTitle>
                          <p className="text-sm text-stone-500 mt-1">
                            {archive.speaker_name || "Non spécifié"} · {archive.total_guests} convive{archive.total_guests > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-stone-400" />
                      )}
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      {/* Event Details */}
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <h3 className="text-xs uppercase tracking-wider text-amber-700 font-medium mb-2">
                          Conférence
                        </h3>
                        <p className="text-sm text-stone-700 font-medium">
                          {archive.speaker_name || "Non spécifié"}
                        </p>
                        {archive.speaker_theme && (
                          <p className="text-sm text-stone-600 mt-1">
                            {archive.speaker_theme}
                          </p>
                        )}
                      </div>

                      {/* Archived By */}
                      {archive.archived_by && (
                        <div className="text-xs text-stone-400">
                          Archivé par : {archive.archived_by}
                        </div>
                      )}

                      {/* Tables Summary */}
                      <div>
                        <h3 className="text-sm font-medium text-stone-700 mb-3">
                          Tables ({tablesData.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {tablesData.map((table) => {
                            const tableSeats = seatsData.filter(s => s.table_id === table.id);
                            return (
                              <div
                                key={table.id}
                                className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-center"
                              >
                                <p className="text-sm font-semibold text-stone-800">
                                  {table.is_presidential ? "★ Table Prés." : `Table ${table.table_number}`}
                                </p>
                                <p className="text-xs text-stone-400 mt-1">
                                  {tableSeats.length} convive{tableSeats.length > 1 ? 's' : ''}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Guests List */}
                      <div>
                        <h3 className="text-sm font-medium text-stone-700 mb-3">
                          Convives ({seatsData.length})
                        </h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {seatsData.map((seat, idx) => {
                            const table = tablesData.find(t => t.id === seat.table_id);
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-stone-800 truncate">
                                    {seat.first_name} {seat.last_name}
                                  </p>
                                  <p className="text-xs text-stone-500 truncate">
                                    {seat.job || "—"}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                  <p className="text-xs text-stone-400">
                                    Table {table?.table_number || "?"} · Siège {seat.seat_number}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}