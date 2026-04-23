import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import { ChatMessage } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const NAVY = "#0f1f3d";
const GOLD = "#c9a84c";
const CREAM = "#faf7f2";
const CREAM2 = "#e8e3d9";
const MUTED = "#9090a8";

function getInitials(first, last) {
  const a = (first || "").trim().charAt(0);
  const b = (last || "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

export default function ChatPanel({ mySeatId, targetSeat, onClose }) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", mySeatId, targetSeat?.id],
    queryFn: async () => {
      const all = await ChatMessage.list("-created_date", 200);
      return all.filter(
        (m) =>
          (m.from_seat_id === mySeatId && m.to_seat_id === targetSeat?.id) ||
          (m.from_seat_id === targetSeat?.id && m.to_seat_id === mySeatId)
      ).reverse();
    },
    refetchInterval: 3000,
    enabled: !!mySeatId && !!targetSeat?.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content) =>
      ChatMessage.create({
        from_seat_id: mySeatId,
        to_seat_id: targetSeat.id,
        from_name: "Moi",
        to_name: targetSeat.first_name || "Convive",
        content,
        table_id: targetSeat.table_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", mySeatId, targetSeat?.id] });
      setMessage("");
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  if (!targetSeat) return null;

  const headerEyebrow = targetSeat.table_number
    ? `Table ${targetSeat.table_number}`
    : `Siège ${targetSeat.seat_number ?? ""}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-[min(380px,calc(100vw-2rem))] h-[460px] flex flex-col"
        style={{
          background: "white",
          border: `1px solid ${CREAM2}`,
          borderRadius: 4,
          boxShadow: "0 12px 32px rgba(15,31,61,0.18)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${CREAM2}` }}
        >
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: NAVY,
              color: "white",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {getInitials(targetSeat.first_name, targetSeat.last_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.15em] font-medium"
              style={{ color: GOLD }}
            >
              {headerEyebrow}
            </div>
            <div
              className="text-[14px] leading-tight truncate"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: NAVY,
                fontWeight: 500,
              }}
            >
              {targetSeat.first_name} {targetSeat.last_name}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 w-7 h-7 flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{ borderRadius: 3 }}
          >
            <X className="w-4 h-4" style={{ color: MUTED }} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ background: CREAM }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: MUTED }}>
              <MessageCircle className="w-7 h-7 mb-2" style={{ color: GOLD }} />
              <p
                className="text-[12px] italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Démarrez la conversation
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.from_seat_id === mySeatId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] px-3 py-2 text-[13px] leading-snug"
                  style={
                    isMine
                      ? {
                          background: NAVY,
                          color: "white",
                          borderRadius: "3px 3px 0 3px",
                          fontFamily: "Inter, sans-serif",
                        }
                      : {
                          background: "white",
                          color: NAVY,
                          border: `1px solid ${CREAM2}`,
                          borderRadius: "3px 3px 3px 0",
                          fontFamily: "Inter, sans-serif",
                        }
                  }
                >
                  {msg.content}
                  <div
                    className="text-[9px] uppercase tracking-[0.12em] mt-1"
                    style={{ color: isMine ? "rgba(255,255,255,0.5)" : MUTED }}
                  >
                    {format(new Date(msg.created_date), "HH:mm")}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="p-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${CREAM2}`, background: "white" }}
        >
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écrire un mot…"
            className="flex-1 bg-transparent text-[13px] px-3 py-2 outline-none"
            style={{
              color: NAVY,
              border: `1px solid ${CREAM2}`,
              borderRadius: 4,
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            aria-label="Envoyer"
            className="w-9 h-9 flex items-center justify-center transition-all hover:-translate-y-[1px] disabled:opacity-50"
            style={{
              background: NAVY,
              borderRadius: 4,
            }}
          >
            <Send className="w-3.5 h-3.5" style={{ color: GOLD }} />
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
