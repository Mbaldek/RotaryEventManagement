import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, Briefcase, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuestCard({ seat, onChat, canChat }) {
  if (!seat?.first_name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">
            {seat.first_name?.[0]}{seat.last_name?.[0]}
          </span>
        </div>
        <div>
          <p className="font-medium text-stone-800 text-sm">
            {seat.first_name} {seat.last_name}
          </p>
          <div className="space-y-0.5 mt-1">
            <div className="flex items-center gap-3 text-[11px] text-stone-400">
              {seat.job && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {seat.job}
                </span>
              )}
              {seat.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {seat.email}
                </span>
              )}
              {seat.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {seat.phone}
                </span>
              )}
            </div>
            {(seat.member_number || seat.comment) && (
              <div className="flex items-center gap-2 text-[11px]">
                {seat.member_number && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    Membre n°{seat.member_number}
                  </span>
                )}
                {seat.comment && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {seat.comment}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {canChat && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChat(seat)}
          className="rounded-full text-stone-400 hover:text-amber-600 hover:bg-amber-50"
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
}