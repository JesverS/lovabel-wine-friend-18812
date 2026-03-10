import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp, Trash2, Copy, AlertTriangle, Lock, CreditCard, Globe, Users, Eye, EyeOff, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { WineDetailsDialog } from "@/components/WineDetailsDialog";
import { AddDomainToEventDialog } from "@/components/AddDomainToEventDialog";
import { AddWineToEventDialog } from "@/components/AddWineToEventDialog";
import { EditEventDialog } from "@/components/EditEventDialog";
import { InviteMemberToEventDialog } from "@/components/InviteMemberToEventDialog";
import { EventAdministration } from "@/components/EventAdministration";
import { EventAccessRequestDialog } from "@/components/EventAccessRequestDialog";
import { EventAccessRequestsManagement } from "@/components/EventAccessRequestsManagement";
import { EventPaymentButton } from "@/components/EventPaymentButton";
import { EventJoinButton } from "@/components/EventJoinButton";
import { LeaveEventSection } from "@/components/LeaveEventSection";
import { LeaveEventPaidSection } from "@/components/LeaveEventPaidSection";
import { EventRefundRequestsManagement } from "@/components/EventRefundRequestsManagement";
import { OrganizerStripeSetup } from "@/components/OrganizerStripeSetup";
import { EventRevenueDashboard } from "@/components/EventRevenueDashboard";
import { OpenInAppBanner } from "@/components/OpenInAppBanner";
import { getEventDeepLink } from "@/lib/mobileAppUtils";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventPosts } from "@/components/EventPosts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Mapping ID type vers label pour affichage
const WINE_TYPE_LABELS: Record<number, string> = {
  1: 'Rouge',
  2: 'Blanc',
  5: 'Rosé',
  7: 'Autre',
  8: 'Effervescent',
};

interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  city: string | null;
  address: string | null;
  location: string | null;
  banner_url: string | null;
  registration_link: string | null;
  is_public: boolean | null;
  private_token: string | null;
  access_type: 'public' | 'paid' | 'request_based' | 'invite_only';
  confidential_address: boolean | null;
  confidential_phone: boolean | null;
  confidential_email: boolean | null;
  confidential_participant_list: boolean | null;
  confidential_documents: string[] | null;
  price: number | null;
  currency: string | null;
  max_participants: number | null;
  contact_phone: string | null;
  participants_count?: number;
  contact_email: string | null;
}

interface Domain {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Wine {
  id: string;
  name: string;
  year: number | null;
  label_url: string | null;
  description: string | null;
  domain_id: string;
  price: number | null;
  volume_ml: number | null;
  alcohol_percentage: number | null;
  characteristics: any;
  type: number | null;
  mode_culture: number | null;
  wine_classification: number | null;
  website_order_url: string | null;
  wine_type?: { type: string } | null;
  wine_classification_data?: { nom: string } | null;
}

interface DomainWithWines {
  domain: Domain;
  wines: Wine[];
}

// Fonction de fetch extraite pour réutilisation (prefetch)
export const fetchEventBySlug = async (slug: string, token: string | null) => {
  const { data, error } = await supabase.functions.invoke('get-event-by-slug', {
    body: { slug, token }
  });
  if (error || !data?.event) {
    const errorCode = data?.code || error?.status;
    throw { code: errorCode, message: data?.error || 'Erreur serveur' };
  }
  return data;
};

const EventDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const privateToken = new URLSearchParams(window.location.search).get('token');

  // React Query avec cache stale-while-revalidate
  const { data: queryData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['event', slug, privateToken],
    queryFn: () => fetchEventBySlug(slug!, privateToken),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000, // 30 min
    retry: false,
  });

  // Dériver toutes les valeurs depuis queryData
  const event = queryData?.event as Event | null ?? null;
  const domainsWithWines: DomainWithWines[] = queryData?.domainsWithWines || [];
  const hasHiddenContactInfo = queryData?.hasHiddenContactInfo || false;
  const hasHiddenAddress = queryData?.hasHiddenAddress || false;
  const participantsCount = event?.participants_count || 0;

  const role = queryData?.userRole;
  const userRole = role as 'organizer' | 'co_organizer' | 'admin' | 'participant' | null ?? null;
  const canEdit = role && ['organizer', 'co_organizer', 'admin'].includes(role);
  const canManageMembers = role && ['organizer', 'co_organizer'].includes(role);
  const canDeleteEvent = role === 'organizer';
  const hasAccess = queryData?.hasAccess || false;
  const hasAccessRequest = queryData?.hasAccessRequest || false;
  const hasPendingPayment = queryData?.hasPendingPayment || false;
  const userPaymentAmount = queryData?.userPaymentAmount || null;
  const hasPendingRefundRequest = queryData?.hasPendingRefundRequest || false;

  // Error state dérivé
  const errorState = queryError ? {
    type: (queryError as any)?.code === 403 ? 'access_denied' as const : 'not_found' as const,
    message: (queryError as any)?.code === 403 ? 'Vous n\'avez pas accès à cet événement' : 'Événement inexistant',
  } : null;

  // Local UI states
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'domain' | 'wine', id: string, domainId?: string, name: string } | null>(null);
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
  const [eventNameConfirmation, setEventNameConfirmation] = useState('');
  const [leaveEventDialogOpen, setLeaveEventDialogOpen] = useState(false);

  // Handle payment status from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast({
        title: 'Paiement réussi !',
        description: 'Vous avez maintenant accès à cet événement.',
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      const newUrl = newParams.toString() 
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Invalider le cache pour forcer un refetch avec le nouvel accès
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: 'Paiement annulé',
        description: 'Votre paiement a été annulé.',
        variant: 'destructive',
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment');
      const newUrl = newParams.toString() 
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const refetchData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event', slug] });
  }, [queryClient, slug]);

  const toggleDomain = (domainId: string) => {
    setOpenDomains((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  const handleDeleteDomain = async () => {
    if (!deletingItem || deletingItem.type !== 'domain' || !event) return;

    try {
      // Delete all wines of this domain from the event
      const { error: winesError } = await supabase
        .from('event_domain_wine')
        .delete()
        .eq('event_id', event.id)
        .eq('domain_id', deletingItem.id);

      if (winesError) throw winesError;

      // Delete domain from event
      const { error: domainError } = await supabase
        .from('event_domain')
        .delete()
        .eq('event_id', event.id)
        .eq('domain_id', deletingItem.id);

      if (domainError) throw domainError;

      toast({
        title: 'Succès',
        description: 'Domaine et ses vins supprimés de l\'événement',
      });

      refetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le domaine',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleDeleteWine = async () => {
    if (!deletingItem || deletingItem.type !== 'wine' || !event || !deletingItem.domainId) return;

    try {
      const { error } = await supabase
        .from('event_domain_wine')
        .delete()
        .eq('event_id', event.id)
        .eq('domain_id', deletingItem.domainId)
        .eq('wine_id', deletingItem.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vin supprimé de l\'événement',
      });

      refetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le vin',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const openDeleteDialog = (type: 'domain' | 'wine', id: string, name: string, domainId?: string) => {
    setDeletingItem({ type, id, name, domainId });
    setDeleteDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    try {
      // 1. Récupérer l'événement pour obtenir le banner_url
      const { data: eventData, error: fetchError } = await supabase
        .from('event')
        .select('banner_url')
        .eq('id', event.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // 2. Supprimer tous les fichiers du dossier de l'événement
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('event')
          .list(event.id);

        if (listError) {
          console.warn('Erreur lors de la liste des fichiers:', listError);
        } else if (files && files.length > 0) {
          const filePaths = files.map(file => `${event.id}/${file.name}`);
          const { error: deleteError } = await supabase.storage
            .from('event')
            .remove(filePaths);

          if (deleteError) {
            console.warn('Erreur lors de la suppression des fichiers:', deleteError);
          }
        }
      } catch (storageError) {
        console.warn('Erreur lors de la suppression du dossier event:', storageError);
      }

      // 3. Supprimer l'événement de la base de données
      const { error } = await supabase
        .from('event')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Événement et fichiers associés supprimés',
      });
      navigate('/events');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    } finally {
      setDeleteEventDialogOpen(false);
      setEventNameConfirmation('');
    }
  };

  const handleLeaveEvent = async () => {
    if (!user || !event) return;
    
    try {
      const { error } = await supabase
        .from('user_event')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Succès',
        description: 'Vous avez quitté l\'équipe organisatrice',
      });
      navigate('/events');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de quitter l\'équipe',
        variant: 'destructive',
      });
    } finally {
      setLeaveEventDialogOpen(false);
    }
  };

  // Helper pour obtenir les infos du badge selon le type d'accès
  const getAccessTypeBadge = () => {
    if (!event) return null;
    
    const formatPrice = (price: number, currency: string) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency,
      }).format(price);
    };

    switch (event.access_type) {
      case 'public':
        return {
          label: 'Public',
          icon: <Globe className="w-3 h-3" />,
          className: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400',
        };
      case 'paid':
        return {
          label: event.price ? `Payant - ${formatPrice(event.price, event.currency || 'EUR')}` : 'Payant',
          icon: <CreditCard className="w-3 h-3" />,
          className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
        };
      case 'request_based':
        return {
          label: 'Sur demande',
          icon: <Users className="w-3 h-3" />,
          className: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400',
        };
      case 'invite_only':
        return {
          label: 'Sur invitation',
          icon: <Lock className="w-3 h-3" />,
          className: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400',
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-20 container mx-auto px-4 py-16 flex-grow min-h-screen">
          <div className="text-center">Chargement...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    if (errorState) {
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="pt-20 flex-grow flex items-center justify-center min-h-[calc(100vh-80px)]">
            <Card className="p-8 max-w-md w-full mx-4 text-center">
              <div className="space-y-4">
                {errorState.type === 'not_found' ? (
                  <>
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-semibold">
                      {errorState.message}
                    </h2>
                    <p className="text-muted-foreground">
                      L'événement que vous recherchez n'existe pas ou a été supprimé.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-semibold">
                      {errorState.message}
                    </h2>
                    <p className="text-muted-foreground">
                      Cet événement est privé. Vous devez disposer d'un lien d'invitation valide pour y accéder.
                    </p>
                  </>
                )}
                <Button 
                  onClick={() => navigate('/events')}
                  className="w-full mt-4"
                >
                  Voir tous les événements
                </Button>
              </div>
            </Card>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-20 flex-grow flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="p-8 max-w-md w-full mx-4 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold">
                Événement inexistant
              </h2>
              <p className="text-muted-foreground">
                L'événement que vous recherchez n'existe pas ou a été supprimé.
              </p>
              <Button 
                onClick={() => navigate('/events')}
                className="w-full mt-4"
              >
                Voir tous les événements
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Schema.org Event structured data
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "startDate": event.start_date,
    "endDate": event.end_date || event.start_date,
    "location": {
      "@type": "Place",
      "name": event.city || event.location || "À déterminer",
      "address": event.address || event.city || ""
    },
    "description": event.description || `Événement viticole - ${event.name}`,
    "image": event.banner_url || undefined,
    "organizer": {
      "@type": "Organization",
      "name": "Wine Note",
      "url": "https://winenote.me"
    },
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{event.name} | Événement - Wine Note</title>
        <meta name="description" content={event.description?.slice(0, 155) || `Détails de l'événement ${event.name}`} />
        <link rel="canonical" href={`https://winenote.me/event/${event.slug}`} />
        <meta property="og:title" content={event.name} />
        <meta property="og:description" content={event.description?.slice(0, 155) || `Événement viticole - ${event.name}`} />
        <meta property="og:url" content={`https://winenote.me/event/${event.slug}`} />
        {event.banner_url && <meta property="og:image" content={event.banner_url} />}
        <meta property="og:type" content="event" />
        <script type="application/ld+json">
          {JSON.stringify(eventSchema)}
        </script>
      </Helmet>

      <OpenInAppBanner deepLink={getEventDeepLink(event.slug, searchParams.get('token') || event.private_token)} />
      <Header />
      <main className="pt-20 flex-grow min-h-screen">
        {event.banner_url && (
          <div className="w-full h-48 md:h-64 lg:h-96 overflow-hidden">
            <img
              src={event.banner_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <section className="container mx-auto px-4 py-16 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Accueil</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/events">Événements</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{event.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl md:text-5xl font-serif font-bold break-words">
                    {event.name}
                  </h1>
                  {(() => {
                    const accessBadge = getAccessTypeBadge();
                    return accessBadge ? (
                      <Badge 
                        variant="outline" 
                        className={`${accessBadge.className} flex items-center gap-1.5 text-xs font-medium`}
                      >
                        {accessBadge.icon}
                        {accessBadge.label}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>
              {canEdit && (
                <div className="w-full md:w-auto">
                  <EditEventDialog 
                    eventId={event.id} 
                    onEventUpdated={refetchData}
                  />
                </div>
              )}
            </div>

            {/* Carte récapitulative pour les organisateurs */}
            {canEdit && (
              <Card className="p-4 mb-6 bg-muted/30 border-dashed">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Configuration de l'événement</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Type d'accès</span>
                    <span className="font-medium capitalize">
                      {event.access_type === 'public' && 'Public'}
                      {event.access_type === 'paid' && 'Payant'}
                      {event.access_type === 'request_based' && 'Sur demande'}
                      {event.access_type === 'invite_only' && 'Sur invitation'}
                    </span>
                  </div>
                  {event.access_type === 'paid' && (
                    <div>
                      <span className="text-muted-foreground block">Prix</span>
                      <span className="font-medium">
                        {event.price ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: event.currency || 'EUR' }).format(event.price) : 'Non défini'}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground block">Places max</span>
                    <span className="font-medium">{event.max_participants || 'Illimité'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Confidentialité</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {event.confidential_address && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Adresse
                        </Badge>
                      )}
                      {event.confidential_phone && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Téléphone
                        </Badge>
                      )}
                      {event.confidential_participant_list && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Participants
                        </Badge>
                      )}
                      {event.confidential_email && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Email
                        </Badge>
                      )}
                      {event.confidential_documents && event.confidential_documents.length > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Documents
                        </Badge>
                      )}
                      {!event.confidential_address && !event.confidential_phone && !event.confidential_email && !event.confidential_participant_list && (!event.confidential_documents || event.confidential_documents.length === 0) && (
                        <span className="text-muted-foreground text-xs">Aucune option activée</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Tabs defaultValue="presentation" className="mt-8">
              <TabsList className="mb-6">
                <TabsTrigger value="presentation">Présentation</TabsTrigger>
                <TabsTrigger value="actualites" className="gap-1.5">
                  <Newspaper className="h-4 w-4" />
                  Actualités
                </TabsTrigger>
                <TabsTrigger value="organisateurs">Organisateurs</TabsTrigger>
              </TabsList>

              <TabsContent value="presentation" className="space-y-8">
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>
                      {format(new Date(event.start_date), "PPP", { locale: fr })}
                      {event.end_date &&
                        ` - ${format(new Date(event.end_date), "PPP", { locale: fr })}`}
                    </span>
                  </div>
                  {(event.city || event.location) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{event.city || event.location}</span>
                    </div>
                  )}
                </div>

                {/* Affichage de l'adresse */}
                {event.address && (
                  <p className="text-muted-foreground">{event.address}</p>
                )}
                
                {/* Message si adresse confidentielle et masquée */}
                {hasHiddenAddress && (
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      L'adresse complète est confidentielle et sera visible après validation de votre accès
                    </p>
                  </Card>
                )}

                {/* Affichage des informations de contact (téléphone et email) */}
                {(hasAccess || canEdit) && (event.contact_phone || event.contact_email) && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <h4 className="text-sm font-medium mb-2">Informations de contact</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {event.contact_phone && (
                        <p>📞 <a href={`tel:${event.contact_phone}`} className="hover:underline">{event.contact_phone}</a></p>
                      )}
                      {event.contact_email && (
                        <p>✉️ <a href={`mailto:${event.contact_email}`} className="hover:underline">{event.contact_email}</a></p>
                      )}
                    </div>
                  </Card>
                )}

                {/* Message si contact confidentiel et masqué */}
                {hasHiddenContactInfo && (
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Les informations de contact seront visibles après validation de votre accès
                    </p>
                  </Card>
                )}

                {event.description && (
                  <p className="text-lg">{event.description}</p>
                )}

                {/* Bouton "Je participe" pour les événements publics */}
                {event.access_type === 'public' && !canEdit && user && !hasAccess && (
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <EventJoinButton
                      eventId={event.id}
                      maxParticipants={event.max_participants}
                      currentParticipants={participantsCount}
                      onJoined={() => {
                        refetchData();
                      }}
                    />
                  </Card>
                )}

                {/* Message pour événements publics - utilisateur déjà inscrit */}
                {event.access_type === 'public' && !canEdit && hasAccess && userRole === 'participant' && (
                  <Card className="p-6 bg-green-500/10 border-green-500/20">
                    <p className="text-green-700 dark:text-green-400 font-medium">
                      ✓ Vous participez à cet événement
                    </p>
                  </Card>
                )}

                {event.access_type === 'request_based' && !canEdit && (
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Accès sur demande</h3>
                        <p className="text-muted-foreground">
                          Cet événement nécessite l'approbation des organisateurs. {hasAccess ? 'Vous avez accès à cet événement.' : 'Faites une demande pour accéder aux détails complets.'}
                        </p>
                      </div>
                      {!hasAccess && (
                        <EventAccessRequestDialog
                          eventId={event.id}
                          eventName={event.name}
                          hasExistingRequest={hasAccessRequest}
                          onRequestSent={() => setHasAccessRequest(true)}
                        />
                      )}
                    </div>
                  </Card>
                )}

                {event.access_type === 'paid' && !canEdit && (
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">Événement payant</h3>
                          <p className="text-muted-foreground">
                            {hasAccess 
                              ? 'Vous avez accès à cet événement.' 
                              : 'Un paiement est requis pour accéder aux détails complets de cet événement.'}
                          </p>
                        </div>
                      </div>
                      {!hasAccess && user && event.price && (
                        <EventPaymentButton
                          eventId={event.id}
                          eventName={event.name}
                          price={event.price}
                          currency={event.currency || 'EUR'}
                          disabled={hasPendingPayment}
                        />
                      )}
                      {!hasAccess && !user && (
                        <Button onClick={() => navigate('/auth')} className="w-full">
                          Se connecter pour accéder
                        </Button>
                      )}
                      {hasPendingPayment && (
                        <p className="text-sm text-amber-600">
                          Un paiement est en cours de traitement. Veuillez patienter ou réessayer.
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {event.access_type === 'invite_only' && !canEdit && (
                  <Card className="p-6 bg-primary/5 border-primary/20">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Lock className="w-6 h-6 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">Événement sur invitation</h3>
                          <p className="text-muted-foreground">
                            {hasAccess 
                              ? 'Vous avez accès à cet événement.' 
                              : 'Cet événement est accessible uniquement sur invitation des organisateurs.'}
                          </p>
                        </div>
                      </div>
                      {!hasAccess && (
                        <p className="text-sm text-muted-foreground">
                          Contactez les organisateurs pour recevoir une invitation.
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {event.registration_link && (
                  <Button asChild>
                    <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                      S'inscrire à l'événement
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}

                {canEdit && !event.is_public && event.private_token && (
                  <Card className="p-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-amber-900 dark:text-amber-100">Lien privé de l'événement</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            ⚠️ Ne partagez ce lien qu'avec des personnes de confiance
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/event/${event.slug}?token=${event.private_token}`}
                          readOnly
                          className="flex-1 bg-white dark:bg-background"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/event/${event.slug}?token=${event.private_token}`
                            );
                            toast({ title: 'Lien copié !' });
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copier
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-serif font-bold">
                      Domaines présents
                    </h2>
                    {canEdit && (
                      <AddDomainToEventDialog 
                        eventId={event.id} 
                        onDomainAdded={refetchData}
                      />
                    )}
                  </div>

                  {domainsWithWines.length === 0 ? (
                    <Card className="p-8 text-center">
                      {!user ? (
                        <div className="space-y-4">
                          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground mb-2">
                              Connectez-vous pour découvrir les domaines et vins présents à cet événement
                            </p>
                            <Button asChild variant="default">
                              <Link to="/auth">Se connecter</Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Aucun domaine n'a été ajouté à cet événement
                        </p>
                      )}
                    </Card>
                  ) : (
                    domainsWithWines.map(({ domain, wines }) => (
                    <Card key={domain.id} className="p-4 md:p-6 overflow-hidden">
                      <div className="space-y-4">
                        <Collapsible
                          open={openDomains[domain.id]}
                          onOpenChange={() => toggleDomain(domain.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <CollapsibleTrigger className="flex-1 min-w-0 text-left flex items-center gap-3">
                              {domain.logo_url && (
                                <img
                                  src={domain.logo_url}
                                  alt={domain.name}
                                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <h3 className="text-xl md:text-2xl font-serif font-bold break-words flex-1">
                                {domain.name}
                              </h3>
                              {openDomains[domain.id] ? (
                                <ChevronUp className="h-5 w-5 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 flex-shrink-0" />
                              )}
                            </CollapsibleTrigger>
                            
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog('domain', domain.id, domain.name);
                                }}
                                className="flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>

                          <CollapsibleContent className="mt-6 space-y-4">
                            <div className="mb-4">
                              <Link to={`/domain/${domain.id}`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full md:w-auto"
                                >
                                  Voir la page du domaine
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                            {canEdit && (
                              <div className="flex justify-end">
                                <AddWineToEventDialog
                                  eventId={event.id}
                                  domainId={domain.id}
                                  domainName={domain.name}
                                  onWineAdded={refetchData}
                                />
                              </div>
                            )}
                            
                            {wines.length === 0 ? (
                              <p className="text-center text-muted-foreground py-4">
                                Aucun vin ajouté pour ce domaine
                              </p>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                {wines.map((wine) => (
                                  <Card
                                    key={wine.id}
                                    className="p-2 sm:p-4 cursor-pointer hover:shadow-lg transition-shadow relative group"
                                    onClick={() => setSelectedWine(wine)}
                                  >
                                    {canEdit && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeleteDialog('wine', wine.id, wine.name, domain.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                    {wine.label_url && (
                                      <img
                                        src={wine.label_url}
                                        alt={wine.name}
                                        className="w-full h-32 sm:h-40 lg:h-48 object-contain mb-2 sm:mb-3"
                                      />
                                    )}
                                    <div className="space-y-1">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <h4 className="font-semibold text-sm sm:text-base line-clamp-2">{wine.name}</h4>
                                        {wine.year && (
                                          <span className="text-xs sm:text-sm text-muted-foreground">{wine.year}</span>
                                        )}
                                      </div>
                                      {(wine.type || wine.wine_classification_data?.nom) && (
                                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                          {wine.type && WINE_TYPE_LABELS[wine.type] && (
                                            <span>{WINE_TYPE_LABELS[wine.type]}</span>
                                          )}
                                          {wine.type && WINE_TYPE_LABELS[wine.type] && wine.wine_classification_data?.nom && (
                                            <span> - </span>
                                          )}
                                          {wine.wine_classification_data?.nom && (
                                            <span>{wine.wine_classification_data.nom}</span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="actualites" className="mt-6">
                <EventPosts
                  eventId={event.id}
                  canPost={canEdit}
                  hasAccess={hasAccess || canEdit}
                />
              </TabsContent>

              <TabsContent value="organisateurs" className="mt-6">
                {canManageMembers && event.access_type === 'request_based' && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Demandes d'accès</h3>
                    <EventAccessRequestsManagement eventId={event.id} />
                  </div>
                )}

                {/* Gestion des demandes de remboursement pour événements payants */}
                {canManageMembers && event.access_type === 'paid' && (
                  <div className="mb-8">
                    <EventRefundRequestsManagement 
                      eventId={event.id} 
                      currency={event.currency || 'EUR'} 
                    />
                  </div>
                )}

                {canManageMembers && userRole && (
                  <div className="mb-6">
                    <InviteMemberToEventDialog
                      eventId={event.id}
                      eventName={event.name}
                      inviterName={user?.email || 'Organisateur'}
                      userRole={userRole as 'organizer' | 'co_organizer'}
                      onInvitationSent={() => {
                        // Optionnel : refresh
                      }}
                    />
                  </div>
                )}
                <EventAdministration 
                  eventId={event.id} 
                  userRole={userRole || null} 
                />

                {/* Dashboard des revenus pour événements payants */}
                {canEdit && event.access_type === 'paid' && (
                  <div className="mt-8">
                    <EventRevenueDashboard eventId={event.id} />
                  </div>
                )}

                {/* Configuration Stripe pour événements payants */}
                {canEdit && event.access_type === 'paid' && (
                  <Card className="mt-8 p-6">
                    <h3 className="text-lg font-semibold mb-4">Configuration des paiements</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Gérez votre compte Stripe pour recevoir les paiements de cet événement.
                    </p>
                    <OrganizerStripeSetup />
                  </Card>
                )}

                {(userRole === 'co_organizer' || userRole === 'admin') && (
                  <Card className="mt-8 border-destructive">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-destructive mb-2">Zone Danger</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Quitter l'équipe organisatrice est irréversible. Vous perdrez tous vos droits d'administration.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setLeaveEventDialogOpen(true)}
                      >
                        Quitter l'équipe organisatrice
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Section quitter pour participants (événements gratuits) */}
                {userRole === 'participant' && event.access_type !== 'paid' && (
                  <div className="mt-8">
                    <LeaveEventSection eventId={event.id} eventName={event.name} />
                  </div>
                )}

                {/* Section quitter pour participants (événements payants) */}
                {userRole === 'participant' && event.access_type === 'paid' && userPaymentAmount && (
                  <div className="mt-8">
                    <LeaveEventPaidSection
                      eventId={event.id}
                      eventName={event.name}
                      paidAmount={userPaymentAmount}
                      currency={event.currency || 'EUR'}
                      hasPendingRefundRequest={hasPendingRefundRequest}
                      onRefundRequested={() => setHasPendingRefundRequest(true)}
                    />
                  </div>
                )}

                {canDeleteEvent && (
                  <Card className="mt-8 border-destructive">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-destructive mb-2">Zone Danger</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        La suppression de cet événement est irréversible. Toutes les données associées seront définitivement perdues.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteEventDialogOpen(true)}
                      >
                        Supprimer l'événement
                      </Button>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />

      {selectedWine && event && (
        <WineDetailsDialog
          wine={selectedWine}
          eventId={event.id}
          onClose={() => setSelectedWine(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'domain' ? (
                <>
                  Êtes-vous sûr de vouloir supprimer le domaine <strong>{deletingItem.name}</strong> de cet événement ?
                  <br />
                  <span className="text-destructive font-medium">
                    Tous les vins de ce domaine seront également supprimés de l'événement.
                  </span>
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer le vin <strong>{deletingItem?.name}</strong> de cet événement ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletingItem?.type === 'domain' ? handleDeleteDomain : handleDeleteWine}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteEventDialogOpen} onOpenChange={setDeleteEventDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Êtes-vous vraiment sûr de vouloir supprimer l'événement <strong>{event?.name}</strong> ?
              </p>
              <p className="text-destructive font-medium">
                Cette action est irréversible. Toutes les données associées seront définitivement perdues.
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  Pour confirmer, veuillez saisir le nom de l'événement :
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {event?.name}
                </p>
                <Input
                  value={eventNameConfirmation}
                  onChange={(e) => setEventNameConfirmation(e.target.value)}
                  placeholder="Nom de l'événement"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventNameConfirmation('')}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={eventNameConfirmation !== event?.name}
              className="bg-destructive hover:bg-destructive/90 disabled:opacity-50"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveEventDialogOpen} onOpenChange={setLeaveEventDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter l'équipe organisatrice</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter l'équipe organisatrice de <strong>{event?.name}</strong> ?
              <br /><br />
              Cette action est irréversible. Vous perdrez tous vos droits d'administration et ne pourrez plus gérer cet événement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveEvent}
              className="bg-destructive hover:bg-destructive/90"
            >
              Quitter l'équipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetails;
