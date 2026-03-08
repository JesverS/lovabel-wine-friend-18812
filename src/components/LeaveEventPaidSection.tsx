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
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, RefreshCcw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaveEventPaidSectionProps {
  eventId: string;
  eventName: string;
  paidAmount: number;
  currency: string;
  hasPendingRefundRequest?: boolean;
  onRefundRequested?: () => void;
}

const PLATFORM_FEE_PERCENT = 10;

export function LeaveEventPaidSection({ 
  eventId, 
  eventName, 
  paidAmount, 
  currency,
  hasPendingRefundRequest = false,
  onRefundRequested
}: LeaveEventPaidSectionProps) {
  const [loading, setLoading] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const refundAmount = paidAmount * (1 - PLATFORM_FEE_PERCENT / 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR"
    }).format(amount);
  };

  const handleRequestRefund = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-event-refund", {
        body: { eventId, message: message.trim() || undefined }
      });

      if (error) {
        throw error;
      }

      toast.success("Demande de remboursement envoyée");
      setRefundDialogOpen(false);
      setMessage("");
      onRefundRequested?.();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la demande");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveWithoutRefund = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("leave-event-without-refund", {
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
      setLeaveDialogOpen(false);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <h4 className="font-medium text-destructive mb-2">Zone de danger</h4>
      <p className="text-sm text-muted-foreground mb-4">
        Vous avez payé {formatCurrency(paidAmount)} pour cet événement.
      </p>

      {hasPendingRefundRequest ? (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Votre demande de remboursement est en attente de traitement
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Bouton demander remboursement */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setRefundDialogOpen(true)}
            className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Demander un remboursement
          </Button>

          {/* Bouton quitter sans remboursement */}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setLeaveDialogOpen(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Quitter sans remboursement
          </Button>
        </div>
      )}

      {/* Dialog demande de remboursement */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander un remboursement</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Votre demande sera examinée par l'organisateur de "{eventName}".
                </p>
                <div className="p-3 bg-muted rounded-md space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Montant payé :</span>
                    <span className="font-medium">{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Remboursement si accepté :</span>
                    <span className="font-medium">{formatCurrency(refundAmount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Les frais de plateforme ({PLATFORM_FEE_PERCENT}%) ne sont pas remboursables.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="refund-message">Message (optionnel)</Label>
            <Textarea
              id="refund-message"
              placeholder="Expliquez la raison de votre demande..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestRefund}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Envoyer la demande"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog quitter sans remboursement */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Quitter sans remboursement ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous êtes sur le point de quitter "{eventName}" <strong>sans aucun remboursement</strong>.
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                  <p className="text-sm font-medium text-destructive">
                    Vous perdrez {formatCurrency(paidAmount)} définitivement.
                  </p>
                </div>
                <p className="text-sm">
                  Cette action est irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveWithoutRefund}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Désinscription...
                </>
              ) : (
                "Confirmer la perte"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
