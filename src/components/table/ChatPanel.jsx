import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, MessageCircle } from "lucide-react";
import { ChatMessage } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-sm flex flex-col"
      style={{ height: "420px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {targetSeat?.first_name?.[0]}{targetSeat?.last_name?.[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {targetSeat?.first_name} {targetSeat?.last_name}
            </p>
            <p className="text-[10px] text-stone-400">{targetSeat?.job || "Convive"}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-stone-400">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-xs">Démarrer la conversation</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.from_seat_id === mySeatId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isMine
                    ? "bg-stone-800 text-white rounded-br-md"
                    : "bg-stone-100 text-stone-800 rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMine ? "text-stone-400" : "text-stone-400"}`}>
                  {format(new Date(msg.created_date), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-stone-100 flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 border-stone-200 focus:border-amber-400 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim()}
          className="bg-stone-800 hover:bg-stone-900 rounded-xl"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </motion.div>
  );
}