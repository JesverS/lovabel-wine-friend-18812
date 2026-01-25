import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ExternalLink, Wine, AlertCircle } from "lucide-react";
import { getEventDeepLink, getStoreUrl, isMobileDevice } from "@/lib/mobileAppUtils";

type VerificationState = "verifying" | "success" | "pending" | "error";

export default function PaymentSuccess() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [state, setState] = useState<VerificationState>("verifying");
  const [eventName, setEventName] = useState<string>("");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!slug || !user) return;
    verifyPayment();
  }, [slug, user, sessionId]);

  const verifyPayment = async () => {
    if (!slug || !user) return;

    try {
      // First, get the event to verify membership
      const { data: eventResult } = await supabase.functions.invoke(
        "get-event-by-slug",
        { body: { slug } }
      );

      if (eventResult?.event) {
        setEventName(eventResult.event.name);

        // Check if user is now a member (payment completed via webhook)
        const { data: membership } = await supabase
          .from("user_event")
          .select("user_id")
          .eq("event_id", eventResult.event.id)
          .eq("user_id", user.id)
          .single();

        if (membership) {
          setState("success");
          return;
        }

        // If not yet a member, check payment status
        const { data: payment } = await supabase
          .from("event_payment")
          .select("status")
          .eq("event_id", eventResult.event.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (payment?.status === "completed") {
          setState("success");
        } else if (payment?.status === "pending") {
          // Payment still processing, wait a bit and retry
          setState("pending");
          setTimeout(verifyPayment, 2000);
        } else {
          setState("error");
        }
      } else {
        setState("error");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setState("error");
    }
  };

  const handleOpenInApp = () => {
    const deepLink = getEventDeepLink(slug || "", null);
    // Add payment success parameter for app to refresh
    const deepLinkWithPayment = deepLink + (deepLink.includes("?") ? "&" : "?") + "payment=success";
    window.location.href = deepLinkWithPayment;
    
    // Fallback to store after delay if app doesn't open
    if (isMobileDevice()) {
      const storeUrl = getStoreUrl();
      if (storeUrl) {
        setTimeout(() => {
          if (document.visibilityState !== "hidden") {
            window.location.href = storeUrl;
          }
        }, 2000);
      }
    }
  };

  // Verifying state
  if (state === "verifying" || state === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Vérification du paiement | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Wine className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <CardTitle>
              {state === "pending" ? "Traitement en cours..." : "Vérification du paiement..."}
            </CardTitle>
            <CardDescription>
              {state === "pending" 
                ? "Votre paiement est en cours de traitement. Veuillez patienter."
                : "Nous vérifions que votre paiement a bien été effectué."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Erreur de paiement | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Paiement non confirmé</CardTitle>
            <CardDescription>
              Nous n'avons pas pu confirmer votre paiement. Si vous avez été débité, 
              veuillez contacter notre support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => window.location.href = `/pay/${slug}`}
              className="w-full"
              variant="outline"
            >
              Réessayer le paiement
            </Button>
            <Button 
              onClick={handleOpenInApp}
              className="w-full"
              variant="ghost"
            >
              Retour à l'app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Paiement réussi | Wine Note</title>
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <CheckCircle2 className="h-16 w-16 text-primary relative" />
            </div>
          </div>
          <CardTitle className="text-2xl text-primary">
            Paiement réussi !
          </CardTitle>
          <CardDescription className="text-base">
            {eventName ? (
              <>Vous êtes maintenant inscrit à <strong>{eventName}</strong></>
            ) : (
              "Votre inscription a été confirmée"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-primary">
              Vous avez maintenant accès à toutes les informations de l'événement, 
              y compris l'adresse exacte et les coordonnées de l'organisateur.
            </p>
          </div>

          <Button 
            onClick={handleOpenInApp}
            className="w-full h-12 text-base"
            size="lg"
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Ouvrir dans l'app Wine Note
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Un email de confirmation vous a été envoyé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
