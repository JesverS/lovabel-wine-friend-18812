import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getEventDeepLink } from "@/lib/mobileAppUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, CreditCard, Calendar, MapPin, AlertCircle, CheckCircle2, Wine } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EventData {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  city: string | null;
  access_type: string;
  max_participants: number | null;
  private_token?: string | null;
}

type PageState = 
  | "loading" 
  | "auth_required" 
  | "event_not_found" 
  | "not_paid_event" 
  | "already_member" 
  | "event_full" 
  | "ready" 
  | "processing";

export default function PaymentGateway() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [pageState, setPageState] = useState<PageState>("loading");
  const [event, setEvent] = useState<EventData | null>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Check auth and load event data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPageState("auth_required");
      return;
    }

    if (!slug) {
      setPageState("event_not_found");
      return;
    }

    loadEventData();
  }, [user, authLoading, slug]);

  const loadEventData = async () => {
    if (!slug || !user) return;
    
    setPageState("loading");

    try {
      // Fetch event via edge function (handles private events too)
      const { data: eventResult, error: eventError } = await supabase.functions.invoke(
        "get-event-by-slug",
        { body: { slug } }
      );

      if (eventError || !eventResult?.event) {
        console.error("Event fetch error:", eventError);
        setPageState("event_not_found");
        return;
      }

      const eventData = eventResult.event as EventData;

      // Store private token for deep link usage after Stripe redirect
      if (eventData.private_token) {
        sessionStorage.setItem(`event_token_${eventData.slug}`, eventData.private_token);
      }

      // Check if event is paid
      if (eventData.access_type !== "paid") {
        setPageState("not_paid_event");
        setEvent(eventData);
        return;
      }

      // Check if user is already a member
      const { data: membership } = await supabase
        .from("user_event")
        .select("user_id")
        .eq("event_id", eventData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        setPageState("already_member");
        setEvent(eventData);
        return;
      }

      // Get participants count
      const { count } = await supabase
        .from("user_event")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventData.id);

      setParticipantsCount(count || 0);

      // Check if event is full
      if (eventData.max_participants && (count || 0) >= eventData.max_participants) {
        setPageState("event_full");
        setEvent(eventData);
        return;
      }

      setEvent(eventData);
      setPageState("ready");
    } catch (err) {
      console.error("Error loading event:", err);
      setError("Une erreur est survenue lors du chargement de l'événement.");
      setPageState("event_not_found");
    }
  };

  const handlePayment = async () => {
    if (!event || !user) return;

    setPageState("processing");

    try {
      const currentUrl = window.location.origin;
      const successUrl = `${currentUrl}/pay/${slug}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${currentUrl}/pay/${slug}/cancelled`;

      const { data, error } = await supabase.functions.invoke(
        "create-event-checkout-session",
        {
          body: {
            eventId: event.id,
            successUrl,
            cancelUrl,
          },
        }
      );

      if (error) {
        console.error("Checkout session error:", error);
        toast.error("Erreur lors de la création du paiement");
        setPageState("ready");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setPageState("ready");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Impossible de créer la session de paiement");
        setPageState("ready");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Une erreur est survenue");
      setPageState("ready");
    }
  };

  const handleAuthRedirect = () => {
    const returnUrl = `/pay/${slug}`;
    navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR",
    }).format(price);
  };

  const formatEventDate = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const formattedStart = format(start, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
    
    if (endDate) {
      const end = new Date(endDate);
      const formattedEnd = format(end, "HH:mm", { locale: fr });
      return `${formattedStart} - ${formattedEnd}`;
    }
    
    return formattedStart;
  };

  // Loading state
  if (pageState === "loading" || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Wine className="h-12 w-12 text-primary" />
            </div>
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth required state
  if (pageState === "auth_required") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Connexion requise | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Wine className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder au paiement de cet événement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAuthRedirect} className="w-full" size="lg">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Event not found state
  if (pageState === "event_not_found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Événement introuvable | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Événement introuvable</CardTitle>
            <CardDescription>
              {error || "Cet événement n'existe pas ou n'est plus disponible."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Not a paid event
  if (pageState === "not_paid_event" && event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>{event.name} | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Événement gratuit</CardTitle>
            <CardDescription>
              Cet événement n'est pas payant. Rejoignez-le directement depuis l'application.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Already a member
  if (pageState === "already_member" && event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>{event.name} | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Déjà inscrit</CardTitle>
            <CardDescription>
              Vous êtes déjà inscrit à cet événement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                const privateToken = event?.private_token || sessionStorage.getItem(`event_token_${slug}`);
                window.location.href = getEventDeepLink(slug || "", privateToken);
              }}
              className="w-full" 
              size="lg"
            >
              Ouvrir dans l'app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Event full
  if (pageState === "event_full" && event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>{event.name} | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-warning" />
            </div>
            <CardTitle>Événement complet</CardTitle>
            <CardDescription>
              Cet événement a atteint sa capacité maximale de participants.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Ready state - show payment form
  if ((pageState === "ready" || pageState === "processing") && event) {
    const remainingSpots = event.max_participants 
      ? event.max_participants - participantsCount 
      : null;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Helmet>
          <title>Paiement - {event.name} | Wine Note</title>
        </Helmet>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Wine className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-xl">{event.name}</CardTitle>
            <CardDescription>Récapitulatif de votre commande</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event details */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="capitalize">
                  {formatEventDate(event.start_date, event.end_date)}
                </span>
              </div>
              {event.city && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{event.city}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <span className="font-medium">Total à payer</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(event.price, event.currency)}
              </span>
            </div>

            {/* Remaining spots warning */}
            {remainingSpots !== null && remainingSpots <= 5 && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning-foreground">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  Plus que {remainingSpots} place{remainingSpots > 1 ? "s" : ""} disponible{remainingSpots > 1 ? "s" : ""} !
                </span>
              </div>
            )}

            {/* Payment button */}
            <Button 
              onClick={handlePayment}
              disabled={pageState === "processing"}
              className="w-full h-12 text-base"
              size="lg"
            >
              {pageState === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Redirection vers Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Payer {formatPrice(event.price, event.currency)}
                </>
              )}
            </Button>

            {/* Security note */}
            <p className="text-xs text-center text-muted-foreground">
              Paiement sécurisé par Stripe. Vos données bancaires ne sont jamais stockées sur nos serveurs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
