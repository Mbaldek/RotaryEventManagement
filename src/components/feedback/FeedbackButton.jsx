import React, { useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/db";
import { toast } from "sonner";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const user = await getCurrentUser();
      console.log('Email would be sent:', {
        to: "feedback@rotary.com",
        subject: `Feedback utilisateur - ${user?.email || 'Anonyme'}`,
        body: `
          <h3>Nouveau feedback</h3>
          <p><strong>De:</strong> ${user?.full_name || 'Anonyme'} (${user?.email || 'email non fourni'})</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <hr>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      });
      toast.success("Merci pour votre retour !");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center"
        title="Envoyer un commentaire"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">Votre avis nous intéresse</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-stone-600 mb-4">
              Signalez une erreur, proposez une amélioration ou partagez vos commentaires.
            </p>

            <form onSubmit={handleSubmit}>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="border-stone-200 resize-none mb-4"
                rows={6}
                required
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!message.trim() || sending}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}