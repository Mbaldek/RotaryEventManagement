import React, { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, User, FileText, Repeat, Archive as ArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CalendarView({ events, archives, onEventClick, onArchiveClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("upcoming"); // upcoming, all, archives

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date().toISOString().split('T')[0];

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if (!map[event.event_date]) map[event.event_date] = [];
      map[event.event_date].push({ ...event, type: 'event' });
    });
    if (viewMode === "all" || viewMode === "archives") {
      archives.forEach(archive => {
        if (!map[archive.event_date]) map[archive.event_date] = [];
        map[archive.event_date].push({ ...archive, type: 'archive' });
      });
    }
    return map;
  }, [events, archives, viewMode]);

  const filteredEvents = useMemo(() => {
    if (viewMode === "upcoming") {
      return events.filter(e => e.event_date >= today);
    }
    if (viewMode === "archives") {
      return archives;
    }
    return events;
  }, [events, archives, viewMode, today]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex gap-2 bg-stone-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode("upcoming")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === "upcoming" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          À venir
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Tous
        </button>
        <button
          onClick={() => setViewMode("archives")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === "archives" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <ArchiveIcon className="w-4 h-4 inline mr-1" />
          Archives
        </button>
      </div>

      {/* Event List for current view */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-stone-700">
          {viewMode === "archives" ? "Archives" : viewMode === "all" ? "Tous les événements" : "Événements à venir"}
        </h4>
        {filteredEvents.length === 0 ? (
          <Card className="border-stone-200">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-stone-400">Aucun événement</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.slice(0, 5).map((evt, index) => (
              <Card
                key={evt.id || index}
                className="border-stone-200 hover:border-amber-300 transition-colors cursor-pointer"
                onClick={() => evt.type === 'archive' ? onArchiveClick(evt) : onEventClick(evt)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      evt.type === 'archive' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {evt.type === 'archive' ? (
                        <ArchiveIcon className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-800">
                          {new Date(evt.event_date).toLocaleDateString('fr-FR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        {evt.is_recurring && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            Récurrent
                          </span>
                        )}
                      </div>
                      {evt.title && (
                        <p className="text-xs font-medium text-stone-700 mb-1">{evt.title}</p>
                      )}
                      {evt.speaker_name && (
                        <p className="text-xs text-stone-600 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {evt.speaker_name}
                        </p>
                      )}
                      {evt.speaker_theme && (
                        <p className="text-xs text-stone-500 mt-1 truncate">{evt.speaker_theme}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <Card className="border-stone-200">
        <CardContent className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-base font-semibold text-stone-800">
              {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              const dateStr = day.toISOString().split('T')[0];
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === today;
              const isPast = dateStr < today;

              return (
                <div
                  key={dateStr}
                  className={`aspect-square p-1 rounded-lg border transition-all ${
                    isToday ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-200'
                  } ${isPast ? 'opacity-60' : ''} ${dayEvents.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
                >
                  <div className="h-full flex flex-col">
                    <span className={`text-xs font-medium ${isToday ? 'text-amber-700' : 'text-stone-600'}`}>
                      {day.getDate()}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt, i) => (
                        <button
                          key={i}
                          onClick={() => evt.type === 'archive' ? onArchiveClick(evt) : onEventClick(evt)}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-left ${
                            evt.type === 'archive' 
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              : evt.event_date === today
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {evt.is_recurring && <Repeat className="w-2 h-2 inline mr-0.5" />}
                          {evt.title || evt.speaker_name || 'Événement'}
                        </button>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-stone-400 px-1">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event List for current view */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-stone-700">
          {viewMode === "archives" ? "Archives" : viewMode === "all" ? "Tous les événements" : "Événements à venir"}
        </h4>
        {filteredEvents.length === 0 ? (
          <Card className="border-stone-200">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-stone-400">Aucun événement</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.slice(0, 5).map((evt, index) => (
              <Card
                key={evt.id || index}
                className="border-stone-200 hover:border-amber-300 transition-colors cursor-pointer"
                onClick={() => evt.type === 'archive' ? onArchiveClick(evt) : onEventClick(evt)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      evt.type === 'archive' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      {evt.type === 'archive' ? (
                        <ArchiveIcon className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-800">
                          {new Date(evt.event_date).toLocaleDateString('fr-FR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        {evt.is_recurring && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            Récurrent
                          </span>
                        )}
                      </div>
                      {evt.title && (
                        <p className="text-xs font-medium text-stone-700 mb-1">{evt.title}</p>
                      )}
                      {evt.speaker_name && (
                        <p className="text-xs text-stone-600 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {evt.speaker_name}
                        </p>
                      )}
                      {evt.speaker_theme && (
                        <p className="text-xs text-stone-500 mt-1 truncate">{evt.speaker_theme}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}