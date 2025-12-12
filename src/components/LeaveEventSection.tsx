import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";

interface LeaveEventSectionProps {
  eventId: string;
  eventName: string;
}

export function LeaveEventSection({ eventId, eventName }: LeaveEventSectionProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLeave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("leave-event", {
        body: { eventId }
      });

      if (error) {
        throw error;
      }

      toast.success("Vous avez quitté l'événement");
      navigate("/events");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la désinscription");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <h4 className="font-medium text-destructive mb-2">Zone de danger</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Quitter cet événement est une action irréversible.
      </p>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Quitter l'événement
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter l'événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de quitter "{eventName}". Cette action est irréversible.
              Vous devrez vous réinscrire si vous souhaitez participer à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Désinscription...
                </>
              ) : (
                "Confirmer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
