import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BroadcastBanner({ message, planningUrl }) {
  if (!message && !planningUrl) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3"
          >
            <Megaphone className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900 leading-relaxed">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {planningUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="border-stone-200 text-stone-600 hover:bg-stone-50 gap-2"
            onClick={() => window.open(planningUrl, "_blank")}
          >
            <CalendarDays className="w-4 h-4" />
            Voir le planning
            <ExternalLink className="w-3 h-3" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}