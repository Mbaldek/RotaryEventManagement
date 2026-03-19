import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, FileText, Repeat, Edit2, Trash2, Rocket, Archive as ArchiveIcon, MapPin, Clock } from "lucide-react";

export default function EventDetailsModal({ event, isArchive, onClose, onEdit, onDelete, onLaunch }) {
  if (!event) return null;

  const eventTypeLabels = {
    dejeuner_statutaire: "Déjeuner statutaire",
    reunion_commission: "Réunion de commission",
    soiree: "Soirée",
    autre: "Autre"
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="border-b border-stone-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {isArchive ? (
                <>
                  <ArchiveIcon className="w-5 h-5 text-purple-600" />
                  Événement archivé
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Détails de l'événement
                </>
              )}
            </CardTitle>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 text-xl"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-stone-500" />
              <p className="text-sm font-semibold text-stone-900">
                {new Date(event.event_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-stone-500" />
                <p className="text-sm text-stone-700">
                  {event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.start_time || event.end_time}
                </p>
              </div>
            )}

            {event.event_type && (
              <div className="mb-3 inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                {eventTypeLabels[event.event_type] || event.event_type}
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-stone-500" />
                <p className="text-sm text-stone-700">{event.location}</p>
              </div>
            )}

            {event.speaker_name && (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-stone-500" />
                  <p className="text-sm text-stone-700">
                    <span className="font-medium">Conférencier :</span> {event.speaker_name}
                  </p>
                </div>
                {event.speaker_title && (
                  <p className="text-xs text-stone-500 ml-6">{event.speaker_title}</p>
                )}
              </div>
            )}

            {event.speaker_theme && (
              <div className="mt-3 p-3 bg-white rounded border border-stone-200">
                <p className="text-xs font-medium text-stone-500 mb-1">Thème</p>
                <p className="text-sm text-stone-700">{event.speaker_theme}</p>
              </div>
            )}

            {event.is_recurring && (
              <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded">
                <Repeat className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Événement récurrent ({event.recurrence_pattern === 'weekly' ? 'Hebdomadaire' : event.recurrence_pattern === 'biweekly' ? 'Bihebdomadaire' : 'Mensuel'})
                </span>
              </div>
            )}

            {event.planning_url && (
              <div className="mt-3">
                <a
                  href={event.planning_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  Voir le document de planning
                </a>
              </div>
            )}

            {isArchive && (
              <div className="mt-3 pt-3 border-t border-stone-200">
                <p className="text-xs text-stone-500">
                  <span className="font-medium">Convives :</span> {event.total_guests || 0}
                </p>
                {event.archived_by && (
                  <p className="text-xs text-stone-500 mt-1">
                    <span className="font-medium">Archivé par :</span> {event.archived_by}
                  </p>
                )}
              </div>
            )}
          </div>

          {!isArchive && (
            <div className="flex gap-2">
              {onLaunch && (
                <Button
                  onClick={() => {
                    onLaunch(event);
                    onClose();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Lancer
                </Button>
              )}
              {onEdit && (
                <Button
                  onClick={() => {
                    onEdit(event);
                    onClose();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              )}
              {onDelete && (
                <Button
                  onClick={() => {
                    onDelete(event);
                    onClose();
                  }}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}