import React from "react";
import { Calendar, User, FileText, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserCalendarWidget({ events }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEvent = events.find(e => e.event_date === today);
  const upcomingEvents = events.filter(e => e.event_date > today).slice(0, 3);

  const eventTypeLabels = {
    dejeuner_statutaire: "Déjeuner statutaire",
    reunion_commission: "Réunion de commission",
    soiree: "Soirée",
    autre: "Autre"
  };

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          Calendrier des événements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayEvent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-green-800">Aujourd'hui</p>
              <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                {eventTypeLabels[todayEvent.event_type] || todayEvent.event_type}
              </span>
            </div>
            {todayEvent.title && (
              <p className="text-sm font-semibold text-green-900 mb-2">{todayEvent.title}</p>
            )}
            {(todayEvent.start_time || todayEvent.end_time) && (
              <p className="text-xs text-green-700 flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                {todayEvent.start_time && todayEvent.end_time ? `${todayEvent.start_time} - ${todayEvent.end_time}` : todayEvent.start_time || todayEvent.end_time}
              </p>
            )}
            {todayEvent.location && (
              <p className="text-xs text-green-700 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" />
                {todayEvent.location}
              </p>
            )}
            {/* Déjeuner statutaire */}
            {todayEvent.event_type === "dejeuner_statutaire" && todayEvent.speaker_name && (
              <div>
                <p className="text-sm text-green-900 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {todayEvent.speaker_name}
                </p>
                {todayEvent.speaker_title && (
                  <p className="text-xs text-green-700 ml-4">{todayEvent.speaker_title}</p>
                )}
              </div>
            )}
            {todayEvent.event_type === "dejeuner_statutaire" && todayEvent.speaker_theme && (
              <p className="text-xs text-green-700 mt-1">{todayEvent.speaker_theme}</p>
            )}

            {/* Réunion commission */}
            {todayEvent.event_type === "reunion_commission" && todayEvent.commission && (
              <p className="text-sm text-green-900 mt-1">Commission: {todayEvent.commission}</p>
            )}

            {/* Soirée */}
            {todayEvent.event_type === "soiree" && todayEvent.speaker_theme && (
              <p className="text-sm text-green-900 mt-1">{todayEvent.speaker_theme}</p>
            )}
            {todayEvent.event_type === "soiree" && todayEvent.other_info && (
              <p className="text-xs text-green-700 mt-1">{todayEvent.other_info}</p>
            )}

            {/* Autre */}
            {todayEvent.event_type === "autre" && todayEvent.speaker_theme && (
              <p className="text-sm text-green-900 mt-1">{todayEvent.speaker_theme}</p>
            )}
            {todayEvent.event_type === "autre" && todayEvent.commission && (
              <p className="text-xs text-green-700 mt-1">Commission: {todayEvent.commission}</p>
            )}
            {todayEvent.event_type === "autre" && todayEvent.other_info && (
              <p className="text-xs text-green-700 mt-1">{todayEvent.other_info}</p>
            )}
            {todayEvent.planning_url && (
              <a
                href={todayEvent.planning_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mt-2"
              >
                <FileText className="w-3 h-3" />
                Voir le planning
              </a>
            )}
          </div>
        ) : (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-center">
            <p className="text-xs text-stone-500">Aucun événement aujourd'hui</p>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-600 mb-2">À venir</p>
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="bg-stone-50 rounded-lg p-2">
                  <p className="text-xs font-medium text-stone-700">
                    {new Date(event.event_date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                  {event.title && (
                    <p className="text-xs text-stone-600 mt-0.5 font-medium">{event.title}</p>
                  )}
                  {!event.title && event.speaker_name && (
                    <p className="text-xs text-stone-600 mt-0.5">{event.speaker_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}