import React, { useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CalendarView from "./CalendarView";
import { useQuery } from "@tanstack/react-query";
import { UpcomingEvent, EventHistory } from "@/lib/db";
import EventDetailsModal from "./EventDetailsModal";

export default function CalendarModal({ isOpen, onClose }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const { data: archives = [] } = useQuery({
    queryKey: ["eventHistory"],
    queryFn: () => EventHistory.list("-event_date"),
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-stone-800">Calendrier des événements</h2>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <CalendarView
              events={upcomingEvents}
              archives={archives}
              onEventClick={setSelectedEvent}
              onArchiveClick={(archive) => setSelectedEvent({ ...archive, type: 'archive' })}
            />
          </div>

          <div className="p-4 border-t border-stone-200">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isArchive={selectedEvent.type === 'archive'}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}