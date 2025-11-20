import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wineId: string;
  wineName: string;
}

export function FeedbackDialog({ open, onOpenChange, wineId, wineName }: FeedbackDialogProps) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un feedback");
      return;
    }

    if (feedback.trim().length < 10) {
      toast.error("Votre message doit contenir au moins 10 caractères");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_game_proposition")
        .insert({
          user_id: user.id,
          wine_id: wineId,
          question: feedback.trim(),
        });

      if (error) throw error;

      toast.success("Merci pour votre contribution ! 🎉");
      setFeedback("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Erreur lors de l'envoi de votre message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Proposer une question ou donner un avis
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à améliorer le jeu en proposant de nouvelles questions ou en nous donnant vos impressions sur <span className="font-semibold">{wineName}</span> !
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">Votre message</Label>
            <Textarea
              id="feedback"
              placeholder="Exemple : Il faudrait une question sur les arômes de ce vin..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {feedback.length} caractères (minimum 10)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || feedback.trim().length < 10}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              "Envoyer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
