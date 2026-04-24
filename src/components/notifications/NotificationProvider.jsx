import React, { createContext, useContext, useEffect, useState } from "react";
import { Seat, Chat, GlobalSettings, RestaurantTable, Reservation } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UserCheck, MessageCircle, Megaphone, CalendarCheck, CalendarX } from "lucide-react";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// chat_messages is locked by RLS — Supabase Realtime won't deliver its rows to
// anon. We poll the SECURITY DEFINER `chat_recent_for` RPC every few seconds.
const CHAT_POLL_MS = 6000;

export default function NotificationProvider({ children }) {
  const [lastSeenTimestamp] = useState(Date.now());
  const [myToken, setMyToken] = useState(null);

  // Resolve the current seat's guest_token once on mount from localStorage.
  useEffect(() => {
    const mySeatId = localStorage.getItem("mySeatId");
    if (!mySeatId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("guest_token")
        .eq("id", mySeatId)
        .maybeSingle();
      if (!cancelled && !error && data?.guest_token) {
        setMyToken(data.guest_token);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chat toast polling — replaces the old realtime subscription.
  useEffect(() => {
    if (!myToken) return;
    let since = new Date(lastSeenTimestamp).toISOString();
    let stopped = false;

    const tick = async () => {
      try {
        const msgs = await Chat.recent(myToken, since);
        for (const m of msgs) {
          const label =
            m.scope === "table"
              ? `Table · ${m.from_name || "Convive"}`
              : `Nouveau message de ${m.from_name || "Convive"}`;
          toast.info(label, {
            icon: <MessageCircle className="w-5 h-5 text-blue-600" />,
            duration: 3000,
          });
          if (m.created_date > since) since = m.created_date;
        }
      } catch (err) {
        console.warn("[NotificationProvider:chat poll]", err);
      }
    };

    const iv = setInterval(() => {
      if (!stopped) tick();
    }, CHAT_POLL_MS);

    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [myToken, lastSeenTimestamp]);

  useEffect(() => {
    const unsubscribeSeat = Seat.subscribe((event) => {
      if (event.type === "update" && event.data?.first_name) {
        const seatData = event.data;
        if (new Date(seatData.updated_date).getTime() > lastSeenTimestamp) {
          toast.success(
            `${seatData.first_name} ${seatData.last_name} vient de s'installer`,
            {
              icon: <UserCheck className="w-5 h-5 text-green-600" />,
              duration: 4000,
            }
          );
        }
      }
    });

    const unsubscribeSettings = GlobalSettings.subscribe((event) => {
      if (event.type === "update" && event.data?.global_broadcast) {
        if (new Date(event.data.updated_date).getTime() > lastSeenTimestamp) {
          toast(
            event.data.global_broadcast,
            {
              icon: <Megaphone className="w-5 h-5 text-amber-600" />,
              duration: 6000,
            }
          );
        }
      }
    });

    const unsubscribeTable = RestaurantTable.subscribe((event) => {
      if (event.type === "update" && event.data?.broadcast_message) {
        if (new Date(event.data.updated_date).getTime() > lastSeenTimestamp) {
          toast(
            event.data.broadcast_message,
            {
              icon: <Megaphone className="w-5 h-5 text-amber-600" />,
              duration: 6000,
            }
          );
        }
      }
    });

    const unsubscribeReservation = Reservation.subscribe((event) => {
      if (event.type === "update" && event.data?.status) {
        if (new Date(event.data.updated_date).getTime() > lastSeenTimestamp) {
          if (event.data.status === "confirmed") {
            toast.success(
              `Réservation confirmée pour ${event.data.guest_name}`,
              {
                icon: <CalendarCheck className="w-5 h-5 text-green-600" />,
                duration: 4000,
              }
            );
          } else if (event.data.status === "cancelled") {
            toast.error(
              `Réservation annulée pour ${event.data.guest_name}`,
              {
                icon: <CalendarX className="w-5 h-5 text-red-600" />,
                duration: 4000,
              }
            );
          }
        }
      }
    });

    return () => {
      unsubscribeSeat();
      unsubscribeSettings();
      unsubscribeTable();
      unsubscribeReservation();
    };
  }, [lastSeenTimestamp]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}
