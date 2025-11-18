import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { WineDetailsDialog } from "@/components/WineDetailsDialog";
import { AddDomainToEventDialog } from "@/components/AddDomainToEventDialog";
import { AddWineToEventDialog } from "@/components/AddWineToEventDialog";
import { EditEventDialog } from "@/components/EditEventDialog";
import { InviteMemberToEventDialog } from "@/components/InviteMemberToEventDialog";
import { EventAdministration } from "@/components/EventAdministration";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  city: string | null;
  address: string | null;
  location: string | null;
  banner_url: string | null;
  registration_link: string | null;
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

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [domainsWithWines, setDomainsWithWines] = useState<DomainWithWines[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'domain' | 'wine', id: string, domainId?: string, name: string } | null>(null);
  const [userRole, setUserRole] = useState<'organizer' | 'co_organizer' | 'admin' | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [canDeleteEvent, setCanDeleteEvent] = useState(false);
  const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
  const [eventNameConfirmation, setEventNameConfirmation] = useState('');
  const [leaveEventDialogOpen, setLeaveEventDialogOpen] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) return;

      setLoading(true);

      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("event")
        .select("*")
        .eq("id", id)
        .single();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Check if user can edit and get their role
      if (user) {
        const { data: userEventData } = await supabase
          .from("user_event")
          .select("role")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .single();

        const role = userEventData?.role;
        const canManageContent = role && ['organizer', 'co_organizer', 'admin'].includes(role);
        const canManageMembers = role && ['organizer', 'co_organizer'].includes(role);
        const canDeleteEvent = role === 'organizer';

        setCanEdit(canManageContent);
        setUserRole(role);
        setCanManageMembers(canManageMembers);
        setCanDeleteEvent(canDeleteEvent);
      }

      // Fetch domains
      const { data: eventDomainsData } = await supabase
        .from("event_domain")
        .select("domain_id")
        .eq("event_id", id);

      if (!eventDomainsData) {
        setLoading(false);
        return;
      }

      const domainIds = eventDomainsData.map((ed) => ed.domain_id);

      if (domainIds.length === 0) {
        setDomainsWithWines([]);
        setLoading(false);
        return;
      }

      // Fetch domain details
      const { data: domainsData } = await supabase
        .from("domain")
        .select("id, name, logo_url")
        .in("id", domainIds);

      if (!domainsData) {
        setLoading(false);
        return;
      }

      // Fetch wines for each domain
      const domainsWithWinesData: DomainWithWines[] = await Promise.all(
        domainsData.map(async (domain) => {
          const { data: winesData } = await supabase
            .from("event_domain_wine")
            .select(`
              wine_id,
              wine:wine_id (
                id,
                name,
                year,
                label_url,
                description,
                domain_id,
                price,
                volume_ml,
                alcohol_percentage,
                characteristics,
                type,
                mode_culture,
                wine_classification,
                website_order_url,
                wine_type:type(type),
                wine_classification_data:wine_classification(nom)
              )
            `)
            .eq("event_id", id)
            .eq("domain_id", domain.id);

          const wines = winesData?.map((w: any) => w.wine).filter(Boolean) || [];

          return {
            domain,
            wines,
          };
        })
      );

      setDomainsWithWines(domainsWithWinesData);
      setLoading(false);
    };

    fetchEventDetails();
  }, [id, user]);

  const refetchData = async () => {
    if (!id) return;

    // Refetch event data
    const { data: eventData } = await supabase
      .from("event")
      .select("*")
      .eq("id", id)
      .single();

    if (eventData) {
      setEvent(eventData);
    }

    // Fetch domains
    const { data: eventDomainsData } = await supabase
      .from("event_domain")
      .select("domain_id")
      .eq("event_id", id);

    if (!eventDomainsData) return;

    const domainIds = eventDomainsData.map((ed) => ed.domain_id);

    if (domainIds.length === 0) {
      setDomainsWithWines([]);
      return;
    }

    // Fetch domain details
    const { data: domainsData } = await supabase
      .from("domain")
      .select("id, name, logo_url")
      .in("id", domainIds);

    if (!domainsData) return;

    // Fetch wines for each domain
    const domainsWithWinesData: DomainWithWines[] = await Promise.all(
      domainsData.map(async (domain) => {
        const { data: winesData } = await supabase
          .from("event_domain_wine")
          .select(`
            wine_id,
            wine:wine_id (
              id,
              name,
              year,
              label_url,
              description,
              domain_id,
              price,
              volume_ml,
              alcohol_percentage,
              characteristics,
              type,
              mode_culture,
              wine_classification,
              website_order_url,
              wine_type:type(type),
              wine_classification_data:wine_classification(nom)
            )
          `)
          .eq("event_id", id)
          .eq("domain_id", domain.id);

        const wines = winesData?.map((w: any) => w.wine).filter(Boolean) || [];

        return {
          domain,
          wines,
        };
      })
    );

    setDomainsWithWines(domainsWithWinesData);
  };

  const toggleDomain = (domainId: string) => {
    setOpenDomains((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  const handleDeleteDomain = async () => {
    if (!deletingItem || deletingItem.type !== 'domain' || !id) return;

    try {
      // Delete all wines of this domain from the event
      const { error: winesError } = await supabase
        .from('event_domain_wine')
        .delete()
        .eq('event_id', id)
        .eq('domain_id', deletingItem.id);

      if (winesError) throw winesError;

      // Delete domain from event
      const { error: domainError } = await supabase
        .from('event_domain')
        .delete()
        .eq('event_id', id)
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
    if (!deletingItem || deletingItem.type !== 'wine' || !id || !deletingItem.domainId) return;

    try {
      const { error } = await supabase
        .from('event_domain_wine')
        .delete()
        .eq('event_id', id)
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
    try {
      // 1. Récupérer l'événement pour obtenir le banner_url
      const { data: eventData, error: fetchError } = await supabase
        .from('event')
        .select('banner_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Si un banner existe, le supprimer du bucket
      if (eventData?.banner_url) {
        try {
          // Extraire le nom du fichier depuis l'URL
          const urlParts = eventData.banner_url.split('/event/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1].split('?')[0];
            
            const { error: storageError } = await supabase.storage
              .from('event')
              .remove([fileName]);
            
            if (storageError) {
              console.warn('Erreur lors de la suppression du banner:', storageError);
            }
          }
        } catch (storageError) {
          console.warn('Erreur lors de la suppression du banner:', storageError);
        }
      }

      // 3. Supprimer l'événement de la base de données
      const { error } = await supabase
        .from('event')
        .delete()
        .eq('id', id);

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
    if (!user || !id) return;
    
    try {
      const { error } = await supabase
        .from('user_event')
        .delete()
        .eq('event_id', id)
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
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="pt-20 container mx-auto px-4 py-16 flex-grow min-h-screen">
          <div className="text-center">Événement non trouvé</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h1 className="text-3xl md:text-5xl font-serif font-bold break-words">
                {event.name}
              </h1>
              {canEdit && (
                <div className="w-full md:w-auto">
                  <EditEventDialog 
                    eventId={id!} 
                    onEventUpdated={refetchData}
                  />
                </div>
              )}
            </div>

            <Tabs defaultValue="presentation" className="mt-8">
              <TabsList className="mb-6">
                <TabsTrigger value="presentation">Présentation</TabsTrigger>
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

                {event.address && (
                  <p className="text-muted-foreground">{event.address}</p>
                )}

                {event.description && (
                  <p className="text-lg">{event.description}</p>
                )}

                {event.registration_link && (
                  <Button asChild>
                    <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                      S'inscrire à l'événement
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-serif font-bold">
                      Domaines présents
                    </h2>
                    {canEdit && (
                      <AddDomainToEventDialog 
                        eventId={id!} 
                        onDomainAdded={refetchData}
                      />
                    )}
                  </div>

                  {domainsWithWines.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Aucun domaine n'a été ajouté à cet événement
                      </p>
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
                                  eventId={id!}
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
                                      {(wine.wine_type?.type || wine.wine_classification_data?.nom) && (
                                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                          {wine.wine_type?.type && (
                                            <span className="capitalize">{wine.wine_type.type}</span>
                                          )}
                                          {wine.wine_type?.type && wine.wine_classification_data?.nom && (
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

              <TabsContent value="organisateurs" className="mt-6">
                {canManageMembers && userRole && (
                  <div className="mb-6">
                    <InviteMemberToEventDialog
                      eventId={id!}
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
                  eventId={id!} 
                  userRole={userRole || null} 
                />

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
          eventId={id!}
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
