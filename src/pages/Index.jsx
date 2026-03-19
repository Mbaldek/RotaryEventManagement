import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { UpcomingEvent, RestaurantTable, getCurrentUser } from "@/lib/db";
import { ArrowRight, Calendar, Users, Sparkles, Settings, CalendarPlus, BookOpen, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserCalendarWidget from "../components/calendar/UserCalendarWidget";
import CalendarModal from "../components/calendar/CalendarModal";
import FeedbackButton from "../components/feedback/FeedbackButton";

export default function Index() {
  const [showCalendar, setShowCalendar] = useState(false);

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: () => UpcomingEvent.list("event_date"),
  });

  const { data: allTables = [] } = useQuery({
    queryKey: ["allTables"],
    queryFn: () => RestaurantTable.list("table_number"),
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  // Find today's or next upcoming dejeuner statutaire only
  const today = new Date().toISOString().split('T')[0];
  const todayEvent = upcomingEvents.find(e => e.event_date === today && e.event_type === 'dejeuner_statutaire');
  const nextEvent = todayEvent || upcomingEvents.find(e => e.event_date >= today && e.event_type === 'dejeuner_statutaire');
  
  const speakerName = nextEvent?.speaker_name || "À définir";
  const speakerTitle = nextEvent?.speaker_title || "";
  const speakerTheme = nextEvent?.speaker_theme || "À définir";
  const eventTitle = nextEvent?.title || "";
  const eventDate = nextEvent?.event_date;
  const isToday = eventDate === today;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Logo Rotary */}
        <div className="flex justify-center mb-8">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698886adec2381a5bebb878f/8eca9f2bf_rotaryinterrouecrop.png" 
            alt="Rotary International" 
            className="w-32 h-32 md:w-40 md:h-40 drop-shadow-lg"
          />
        </div>

        {/* Welcome */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-stone-800 mb-4 leading-tight">
            Bienvenue à votre déjeuner<br />
            <span className="font-semibold text-amber-600">statutaire hebdomadaire</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-stone-500 text-sm mb-6">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {/* Event Info */}
          {nextEvent && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl mx-auto shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isToday ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isToday ? "Aujourd'hui" : new Date(eventDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              {eventTitle && (
                <h2 className="text-xl font-semibold text-stone-800 mb-3">{eventTitle}</h2>
              )}
              {speakerName !== "À définir" && (
                <div className="space-y-1">
                  <p className="text-lg text-stone-700 font-medium">{speakerName}</p>
                  {speakerTitle && (
                    <p className="text-sm text-stone-500">{speakerTitle}</p>
                  )}
                  {speakerTheme !== "À définir" && (
                    <p className="text-sm text-amber-600 mt-2">{speakerTheme}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calendar Widget */}
        <div className="mb-8">
          <UserCalendarWidget events={upcomingEvents} />
          <button
            onClick={() => setShowCalendar(true)}
            className="mt-3 w-full text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-amber-50 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Voir le calendrier complet
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to={createPageUrl("Dashboard")}>
            <Button 
              size="lg"
              className="w-full bg-stone-800 hover:bg-stone-900 text-white h-14 text-base rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <Users className="w-5 h-5 mr-2" />
              Vue d'ensemble
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>

          <Link to={createPageUrl("TableView")}>
            <Button 
              size="lg"
              variant="outline"
              className="w-full border-stone-300 hover:bg-stone-50 h-14 text-base rounded-2xl"
            >
              Sélectionner une table
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </div>

        <Link to={createPageUrl("ReservationRequest")} className="block mt-4">
          <Button 
            size="lg"
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 h-12 text-sm rounded-2xl"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Demander une réservation
          </Button>
        </Link>

        {user?.role === 'admin' && (
          <Link to={createPageUrl("AdminControl")} className="block mt-4">
            <Button 
              size="lg"
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 h-12 text-sm rounded-2xl"
            >
              <Settings className="w-4 h-4 mr-2" />
              Panneau de contrôle admin
            </Button>
          </Link>
        )}

        {/* Table count */}
        <div className="text-center mt-8">
          <p className="text-sm text-stone-400">
            {allTables.length} table{allTables.length > 1 ? 's' : ''} disponible{allTables.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Documentation link */}
        <div className="text-center mt-6">
          <Link to={createPageUrl("Features")} className="text-sm text-stone-400 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation des fonctionnalités
          </Link>
        </div>
      </div>

      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
      <FeedbackButton />
    </div>
  );
}