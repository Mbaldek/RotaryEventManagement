import React, { useState, useEffect } from "react";
import { RestaurantTable, Seat, GlobalSettings } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

import TableLayout from "../components/table/TableLayout";
import SeatForm from "../components/table/SeatForm";
import ChatPanel from "../components/table/ChatPanel";
import BroadcastBanner from "../components/table/BroadcastBanner";
import GuestCard from "../components/table/GuestCard";
import SeatListItem from "../components/table/SeatListItem";
import CalendarModal from "../components/calendar/CalendarModal";
import FeedbackButton from "../components/feedback/FeedbackButton";

export default function TableView() {
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const tableId = urlParams.get("id");

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSeatData, setSelectedSeatData] = useState(null);
  const [mySeatId, setMySeatId] = useState(() => localStorage.getItem("mySeatId") || null);
  const [chatTarget, setChatTarget] = useState(null);
  const [showGuests, setShowGuests] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const queryClient = useQueryClient();

  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    queryFn: async () => {
      const tables = await RestaurantTable.list();
      return tables.find(t => t.id === tableId);
    },
    enabled: !!tableId,
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", tableId],
    queryFn: () => Seat.filter({ table_id: tableId }),
    enabled: !!tableId,
    refetchInterval: 10000,
  });

  const { data: allTables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: settings } = useQuery({
    queryKey: ["globalSettings"],
    queryFn: async () => {
      const s = await GlobalSettings.list();
      return s[0] || {};
    },
  });

  const saveSeatMutation = useMutation({
    mutationFn: async ({ seatNumber, data }) => {
      const existing = seats.find(s => s.seat_number === seatNumber);
      const token = crypto.randomUUID().slice(0, 8);
      if (existing) {
        await Seat.update(existing.id, data);
        return existing.id;
      } else {
        const newSeat = await Seat.create({
          ...data,
          table_id: tableId,
          seat_number: seatNumber,
          guest_token: token,
        });
        return newSeat.id;
      }
    },
    onSuccess: (seatId) => {
      localStorage.setItem("mySeatId", seatId);
      setMySeatId(seatId);
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      setSelectedSeat(null);
    },
  });

  const removeSeatMutation = useMutation({
    mutationFn: async (seatData) => {
      await Seat.update(seatData.id, {
        first_name: "",
        last_name: "",
        job: "",
        email: "",
        phone: "",
        guest_token: "",
      });
      if (mySeatId === seatData.id) {
        localStorage.removeItem("mySeatId");
        setMySeatId(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seats", tableId] });
      setSelectedSeat(null);
    },
  });

  const handleSeatClick = (seatNumber, seatData) => {
    if (seatData?.first_name) {
      // Siège occupé: ne pas afficher le formulaire, juste scroll vers la liste
      setSelectedSeat(null);
      setSelectedSeatData(null);
    } else {
      // Siège vide: afficher le formulaire
      setSelectedSeat(seatNumber);
      setSelectedSeatData(seatData);
    }
    setChatTarget(null);
  };

  const broadcastMessage = table?.broadcast_message || settings?.global_broadcast || "";
  const planningUrl = table?.planning_url || settings?.planning_url || "";

  const occupiedSeats = seats.filter(s => s.first_name);

  if (!tableId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to={createPageUrl("Index")}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-amber-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-stone-800 mb-3">
              Sélectionnez votre <span className="font-semibold text-amber-600">table</span>
            </h1>
            <p className="text-stone-500 max-w-2xl mx-auto leading-relaxed">
              Choisissez la table à laquelle vous êtes assigné·e. Vous pourrez ensuite sélectionner votre siège 
              et vous enregistrer pour la séance.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
            <h3 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              Comment procéder ?
            </h3>
            <ol className="space-y-2 text-sm text-stone-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Cliquez sur votre numéro de table ci-dessous</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Sélectionnez votre siège (1 à 8) sur le plan de table</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>Enregistrez vos informations pour confirmer votre présence</span>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allTables.map(t => (
              <Link
                key={t.id}
                to={createPageUrl("TableView") + `?id=${t.id}`}
                className="bg-white rounded-2xl border border-stone-200 p-6 text-center hover:shadow-lg hover:border-amber-300 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl bg-stone-100 group-hover:bg-amber-50 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Users className="w-6 h-6 text-stone-400 group-hover:text-amber-600" />
                </div>
                <p className="text-lg font-semibold text-stone-800">Table {t.table_number}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={createPageUrl("TableView")}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Toutes les tables
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendar(true)}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendrier
            </button>
            <div className="flex items-center gap-1">
              {allTables.map(t => (
                <button
                  key={t.id}
                  onClick={() => navigate(createPageUrl("TableView") + `?id=${t.id}`)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                    t.id === tableId
                      ? "bg-stone-800 text-white"
                      : "bg-white border border-stone-200 text-stone-500 hover:border-amber-300"
                  }`}
                >
                  {t.table_number}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Broadcast */}
        <BroadcastBanner message={broadcastMessage} planningUrl={planningUrl} />

        {/* Table Layout */}
        <TableLayout
          seats={seats}
          onSeatClick={handleSeatClick}
          activeSeatId={mySeatId}
          tableNumber={table?.table_number}
          isPresidential={table?.is_presidential}
          shape={table?.shape}
          color={table?.color}
          rotation={table?.rotation}
        />

        {/* Seat Form (shown immediately for empty seats) */}
        <AnimatePresence>
          {selectedSeat && (
            <div className="flex justify-center">
              <SeatForm
                seatNumber={selectedSeat}
                seatData={selectedSeatData}
                onSave={(data) => saveSeatMutation.mutate({ seatNumber: selectedSeat, data })}
                onRemove={() => selectedSeatData && removeSeatMutation.mutate(selectedSeatData)}
                onClose={() => setSelectedSeat(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Seat List */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Liste des sièges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: table?.is_presidential ? 12 : 8 }, (_, i) => i + 1).map((seatNum) => {
              const seatData = seats.find(s => s.seat_number === seatNum);
              return (
                <SeatListItem
                  key={seatNum}
                  seatNumber={seatNum}
                  seatData={seatData}
                  onClick={() => handleSeatClick(seatNum, seatData)}
                  isActive={seatData?.id === mySeatId}
                  onModify={() => {
                    setSelectedSeat(seatNum);
                    setSelectedSeatData(seatData);
                  }}
                />
              );
            })}
          </div>
        </div>



        {/* Chat */}
        <AnimatePresence>
          {chatTarget && mySeatId && (
            <div className="fixed bottom-4 right-4 z-50">
              <ChatPanel
                mySeatId={mySeatId}
                targetSeat={chatTarget}
                onClose={() => setChatTarget(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
      <FeedbackButton />
    </div>
  );
}