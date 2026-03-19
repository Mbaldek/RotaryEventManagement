import React, { useState } from "react";
import { UpcomingEvent, EventHistory, uploadFile } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Calendar, FileUp, ExternalLink, Plus, Trash2, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import LaunchEventWizard from "../components/admin/LaunchEventWizard";
import CalendarView from "../components/calendar/CalendarView";
import EventDetailsModal from "../components/calendar/EventDetailsModal";

export default function EventPlanning() {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    event_type: "dejeuner_statutaire",
    location: "",
    speaker_name: "",
    speaker_title: "",
    speaker_theme: "",
    commission: "",
    other_info: "",
    planning_url: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null, title: "", message: "" });
  const [launchingEvent, setLaunchingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("calendar"); // calendar or list

  const queryClient = useQueryClient();

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const { data: archives = [] } = useQuery({
    queryKey: ["eventHistory"],
    queryFn: () => EventHistory.list("-event_date"),
  });

  const eventTypeLabels = {
    dejeuner_statutaire: "Déjeuner statutaire",
    reunion_commission: "Réunion de commission",
    soiree: "Soirée",
    autre: "Autre"
  };

  // Create/Update event
  const saveEventMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEvent) {
        await UpcomingEvent.update(editingEvent.id, data);
      } else {
        await UpcomingEvent.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingEvents"] });
      setShowForm(false);
      setEditingEvent(null);
      setFormData({ event_date: "", speaker_name: "", speaker_theme: "", planning_url: "" });
      toast.success(editingEvent ? "Événement modifié" : "Événement créé");
    },
  });

  // Delete event
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      await UpcomingEvent.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingEvents"] });
      toast.success("Événement supprimé");
    },
  });

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      event_date: event.event_date,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      event_type: event.event_type || "dejeuner_statutaire",
      location: event.location || "",
      speaker_name: event.speaker_name || "",
      speaker_title: event.speaker_title || "",
      speaker_theme: event.speaker_theme || "",
      commission: event.commission || "",
      other_info: event.other_info || "",
      planning_url: event.planning_url || "",
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || "weekly",
    });
    setShowForm(true);
    setViewMode("list");
  };

  const handleDelete = (event) => {
    setConfirmDialog({
      isOpen: true,
      action: () => deleteEventMutation.mutate(event.id),
      title: "Supprimer l'événement",
      message: `Supprimer l'événement du ${new Date(event.event_date).toLocaleDateString('fr-FR')} ?`
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveEventMutation.mutate(formData);
  };

  const handlePlanningUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadFile(file);
    setFormData({ ...formData, planning_url: file_url });
    toast.success("Document uploadé");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to={createPageUrl("AdminControl")}
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-800">Gestion du planning</h1>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">BETA</span>
            </div>
            <p className="text-sm text-stone-400">
              Conférencier, thème et documents de l'événement
            </p>
          </div>
        </div>

        {/* Add Event Button */}
        {!showForm && (
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingEvent(null);
              setFormData({ title: "", event_date: "", start_time: "", end_time: "", event_type: "dejeuner_statutaire", location: "", speaker_name: "", speaker_title: "", speaker_theme: "", commission: "", other_info: "", planning_url: "", is_recurring: false, recurrence_pattern: "weekly" });
              setViewMode("list");
            }}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Planifier un événement
          </Button>
        )}

        {/* Event Form */}
        {showForm && (
          <Card className="border-amber-300 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</span>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingEvent(null);
                    setFormData({ title: "", event_date: "", start_time: "", end_time: "", event_type: "dejeuner_statutaire", location: "", speaker_name: "", speaker_title: "", speaker_theme: "", commission: "", other_info: "", planning_url: "", is_recurring: false, recurrence_pattern: "weekly" });
                  }}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-xs text-stone-500 mb-2 block">Titre de l'événement</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Déjeuner statutaire - Mars 2026"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="border-stone-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-500 mb-2 block">Date de l'événement</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="border-stone-200"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-stone-500 mb-2 block">Heure de début</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="border-stone-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-stone-500 mb-2 block">Heure de fin</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="border-stone-200"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-stone-500 mb-2 block">Type d'événement</Label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-stone-200 rounded-md"
                    required
                  >
                    <option value="dejeuner_statutaire">Déjeuner statutaire</option>
                    <option value="reunion_commission">Réunion de commission</option>
                    <option value="soiree">Soirée</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                {/* Déjeuner statutaire: conférencier, fonction, thème */}
                {formData.event_type === "dejeuner_statutaire" && (
                  <>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Nom du conférencier</Label>
                      <Input
                        value={formData.speaker_name}
                        onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                        placeholder="Monsieur Dupont"
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Fonction/Métier du conférencier</Label>
                      <Input
                        value={formData.speaker_title}
                        onChange={(e) => setFormData({ ...formData, speaker_title: e.target.value })}
                        placeholder="Directeur Général, Ingénieur..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Thème de la conférence</Label>
                      <Textarea
                        value={formData.speaker_theme}
                        onChange={(e) => setFormData({ ...formData, speaker_theme: e.target.value })}
                        placeholder="Sujet de la présentation..."
                        className="border-stone-200 resize-none"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Réunion commission: commission */}
                {formData.event_type === "reunion_commission" && (
                  <div>
                    <Label className="text-xs text-stone-500 mb-2 block">Commission</Label>
                    <Input
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                      placeholder="Commission Actions Jeunesse..."
                      className="border-stone-200"
                    />
                  </div>
                )}

                {/* Soirée: thème, lieu, autre info */}
                {formData.event_type === "soiree" && (
                  <>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Thème</Label>
                      <Input
                        value={formData.speaker_theme}
                        onChange={(e) => setFormData({ ...formData, speaker_theme: e.target.value })}
                        placeholder="Soirée gala, remise de prix..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Lieu</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Hôtel, Restaurant..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Autres informations</Label>
                      <Textarea
                        value={formData.other_info}
                        onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
                        placeholder="Informations supplémentaires..."
                        className="border-stone-200 resize-none"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Autre: thème, lieu, commission, autre info */}
                {formData.event_type === "autre" && (
                  <>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Thème</Label>
                      <Input
                        value={formData.speaker_theme}
                        onChange={(e) => setFormData({ ...formData, speaker_theme: e.target.value })}
                        placeholder="Thème de l'événement..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Lieu</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Lieu de l'événement..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Commission</Label>
                      <Input
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                        placeholder="Commission concernée..."
                        className="border-stone-200"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 mb-2 block">Autres informations</Label>
                      <Textarea
                        value={formData.other_info}
                        onChange={(e) => setFormData({ ...formData, other_info: e.target.value })}
                        placeholder="Informations supplémentaires..."
                        className="border-stone-200 resize-none"
                        rows={2}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label className="text-xs text-stone-500 mb-2 block">Document de planning (optionnel)</Label>
                  <Label
                    htmlFor="event-planning-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <FileUp className="w-5 h-5 text-stone-400" />
                    <span className="text-sm text-stone-500">
                      {formData.planning_url ? "Document chargé ✓" : "Uploader un document"}
                    </span>
                  </Label>
                  <input
                    id="event-planning-upload"
                    type="file"
                    className="hidden"
                    onChange={handlePlanningUpload}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-sm text-stone-700">Événement récurrent</span>
                  </label>
                  {formData.is_recurring && (
                    <select
                      value={formData.recurrence_pattern}
                      onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-stone-200 rounded-md mt-2"
                    >
                      <option value="weekly">Hebdomadaire</option>
                      <option value="biweekly">Bihebdomadaire</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEvent(null);
                      setFormData({ title: "", event_date: "", start_time: "", end_time: "", event_type: "dejeuner_statutaire", location: "", speaker_name: "", speaker_title: "", speaker_theme: "", commission: "", other_info: "", planning_url: "", is_recurring: false, recurrence_pattern: "weekly" });
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.event_date || saveEventMutation.isPending}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {editingEvent ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-stone-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "calendar" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Calendrier
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Liste
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <CalendarView
            events={upcomingEvents}
            archives={archives}
            onEventClick={setSelectedEvent}
            onArchiveClick={(archive) => setSelectedEvent({ ...archive, type: 'archive' })}
          />
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Événements planifiés</h3>
            {upcomingEvents.length === 0 ? (
              <Card className="border-stone-200">
                <CardContent className="py-8 text-center">
                  <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">Aucun événement planifié</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="border-stone-200 hover:border-amber-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {event.title && (
                            <p className="text-base font-semibold text-stone-900 mb-2">{event.title}</p>
                          )}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <p className="text-sm font-semibold text-stone-800">
                              {new Date(event.event_date).toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            {(event.start_time || event.end_time) && (
                              <span className="text-xs text-stone-500">
                                {event.start_time && event.end_time ? `${event.start_time} - ${event.end_time}` : event.start_time || event.end_time}
                              </span>
                            )}
                            <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                              {eventTypeLabels[event.event_type] || event.event_type}
                            </span>
                          </div>
                          {event.location && (
                            <p className="text-xs text-stone-500 mb-1">📍 {event.location}</p>
                          )}

                          {/* Déjeuner statutaire */}
                          {event.event_type === "dejeuner_statutaire" && event.speaker_name && (
                            <div className="mb-1">
                              <p className="text-sm text-stone-600">
                                <span className="font-medium">Conférencier :</span> {event.speaker_name}
                              </p>
                              {event.speaker_title && (
                                <p className="text-xs text-stone-500 ml-[90px]">{event.speaker_title}</p>
                              )}
                            </div>
                          )}
                          {event.event_type === "dejeuner_statutaire" && event.speaker_theme && (
                            <p className="text-sm text-stone-500 mb-2">Thème: {event.speaker_theme}</p>
                          )}

                          {/* Réunion commission */}
                          {event.event_type === "reunion_commission" && event.commission && (
                            <p className="text-sm text-stone-600 mb-1">
                              <span className="font-medium">Commission :</span> {event.commission}
                            </p>
                          )}

                          {/* Soirée */}
                          {event.event_type === "soiree" && event.speaker_theme && (
                            <p className="text-sm text-stone-600 mb-1">
                              <span className="font-medium">Thème :</span> {event.speaker_theme}
                            </p>
                          )}
                          {event.event_type === "soiree" && event.other_info && (
                            <p className="text-xs text-stone-500 mb-1">{event.other_info}</p>
                          )}

                          {/* Autre */}
                          {event.event_type === "autre" && event.speaker_theme && (
                            <p className="text-sm text-stone-600 mb-1">
                              <span className="font-medium">Thème :</span> {event.speaker_theme}
                            </p>
                          )}
                          {event.event_type === "autre" && event.commission && (
                            <p className="text-sm text-stone-600 mb-1">
                              <span className="font-medium">Commission :</span> {event.commission}
                            </p>
                          )}
                          {event.event_type === "autre" && event.other_info && (
                            <p className="text-xs text-stone-500 mb-1">{event.other_info}</p>
                          )}
                          {event.planning_url && (
                            <a
                              href={event.planning_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <FileUp className="w-3 h-3" />
                              Document disponible
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setLaunchingEvent(event)}
                            className="bg-green-600 hover:bg-green-700 text-xs h-7"
                          >
                            Lancer
                          </Button>
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-stone-400 hover:text-amber-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(event)}
                            className="text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Informations</h3>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Planifiez plusieurs événements à l'avance</li>
              <li>• L'événement du jour sera affiché automatiquement sur la page d'accueil</li>
              <li>• Les documents de planning sont accessibles depuis toutes les tables</li>
              <li>• Les événements sont archivés lors de la réinitialisation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {launchingEvent && (
        <LaunchEventWizard
          event={launchingEvent}
          onClose={() => setLaunchingEvent(null)}
          onComplete={() => {
            setLaunchingEvent(null);
            queryClient.invalidateQueries({ queryKey: ["upcomingEvents"] });
          }}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isArchive={selectedEvent.type === 'archive'}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLaunch={setLaunchingEvent}
        />
      )}
    </div>
  );
}