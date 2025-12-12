import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Check, X, Clock, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RefundRequest {
  id: string;
  user_id: string;
  payment_id: string;
  status: string;
  message: string | null;
  refund_amount: number;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  user_profile?: {
    full_name: string | null;
    last_name: string | null;
    logo_adress: string | null;
  };
}

interface EventRefundRequestsManagementProps {
  eventId: string;
  currency: string;
}

export function EventRefundRequestsManagement({ 
  eventId, 
  currency 
}: EventRefundRequestsManagementProps) {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR"
    }).format(amount);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("event_refund_request")
        .select(`
          *,
          user_profile:user_id (
            full_name,
            last_name,
            logo_adress
          )
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests((data as any[]) || []);
    } catch (error) {
      console.error("Erreur lors du chargement des demandes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [eventId]);

  const handleProcess = async (requestId: string, action: "approve" | "reject") => {
    if (action === "reject") {
      const request = requests.find(r => r.id === requestId);
      setSelectedRequest(request || null);
      setRejectDialogOpen(true);
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase.functions.invoke("process-refund-request", {
        body: { requestId, action }
      });

      if (error) throw error;

      toast.success("Remboursement effectué avec succès");
      fetchRequests();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors du traitement");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase.functions.invoke("process-refund-request", {
        body: { 
          requestId: selectedRequest.id, 
          action: "reject",
          rejectionReason: rejectionReason.trim() || undefined
        }
      });

      if (error) throw error;

      toast.success("Demande refusée");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors du refus");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Demandes de remboursement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Demandes de remboursement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune demande de remboursement
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Demandes de remboursement
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length} en attente</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demandes en attente */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">En attente</h4>
              {pendingRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-start justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.user_profile?.logo_adress || undefined} />
                      <AvatarFallback>
                        {request.user_profile?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {request.user_profile?.full_name} {request.user_profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Demande le {format(new Date(request.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        Montant : {formatCurrency(request.refund_amount)}
                      </p>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{request.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleProcess(request.id, "reject")}
                      disabled={processingId === request.id}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleProcess(request.id, "approve")}
                      disabled={processingId === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Rembourser
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Demandes traitées */}
          {processedRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Historique</h4>
              {processedRequests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.user_profile?.logo_adress || undefined} />
                      <AvatarFallback>
                        {request.user_profile?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {request.user_profile?.full_name} {request.user_profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                      {request.rejection_reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Raison : {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={request.status === "approved" ? "default" : "destructive"}>
                    {request.status === "approved" ? "Remboursé" : "Refusé"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de refus */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la demande</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de refuser la demande de remboursement de{" "}
              {selectedRequest?.user_profile?.full_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Raison du refus (optionnel)</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Expliquez la raison du refus..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!!processingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer le refus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
