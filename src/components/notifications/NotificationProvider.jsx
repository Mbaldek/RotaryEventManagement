import React, { createContext, useContext, useEffect, useState } from "react";
import { Seat, ChatMessage, GlobalSettings, RestaurantTable, Reservation } from "@/lib/db";
import { toast } from "sonner";
import { UserCheck, MessageCircle, Megaphone, CalendarCheck, CalendarX } from "lucide-react";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export default function NotificationProvider({ children }) {
  const [lastSeenTimestamp] = useState(Date.now());

  useEffect(() => {
    // Subscribe to Seat changes (occupation)
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

    // Subscribe to ChatMessage changes
    const unsubscribeChat = ChatMessage.subscribe((event) => {
      if (event.type === "create") {
        const msgData = event.data;
        if (new Date(msgData.created_date).getTime() > lastSeenTimestamp) {
          toast.info(
            `Nouveau message de ${msgData.from_name}`,
            {
              icon: <MessageCircle className="w-5 h-5 text-blue-600" />,
              duration: 3000,
            }
          );
        }
      }
    });

    // Subscribe to GlobalSettings changes (broadcast)
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

    // Subscribe to RestaurantTable changes (broadcast)
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

    // Subscribe to Reservation changes
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
      unsubscribeChat();
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