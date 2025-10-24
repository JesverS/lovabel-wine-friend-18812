import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { WineDetailsDialog } from "@/components/WineDetailsDialog";
import { AddDomainToEventDialog } from "@/components/AddDomainToEventDialog";
import { AddWineToEventDialog } from "@/components/AddWineToEventDialog";
import { toast } from "@/hooks/use-toast";
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
  uber_order_url: string | null;
  website_order_url: string | null;
}

interface DomainWithWines {
  domain: Domain;
  wines: Wine[];
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [domainsWithWines, setDomainsWithWines] = useState<DomainWithWines[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'domain' | 'wine', id: string, domainId?: string, name: string } | null>(null);

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

      // Check if user can edit (is organizer or participant)
      if (user) {
        const isOrganizer = eventData.organizer_id === user.id;
        
        const { data: participantData } = await supabase
          .from("user_event")
          .select("*")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .single();

        setCanEdit(isOrganizer || !!participantData);
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
                uber_order_url,
                website_order_url
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
              domain_id
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 container mx-auto px-4 py-16">
          <div className="text-center">Chargement...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-20 container mx-auto px-4 py-16">
          <div className="text-center">Événement non trouvé</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        {event.banner_url && (
          <div className="w-full h-64 md:h-96">
            <img
              src={event.banner_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              {event.name}
            </h1>

            <div className="flex flex-wrap gap-4 mb-6 text-muted-foreground">
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
              <p className="text-muted-foreground mb-6">{event.address}</p>
            )}

            {event.description && (
              <p className="text-lg mb-8">{event.description}</p>
            )}

            {event.registration_link && (
              <Button asChild className="mb-12">
                <a href={event.registration_link} target="_blank" rel="noopener noreferrer">
                  S'inscrire à l'événement
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
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
                  <Card key={domain.id} className="p-6">
                    <Collapsible
                      open={openDomains[domain.id]}
                      onOpenChange={() => toggleDomain(domain.id)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {domain.logo_url && (
                              <img
                                src={domain.logo_url}
                                alt={domain.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <h3 className="text-2xl font-serif font-bold text-left">
                              {domain.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog('domain', domain.id, domain.name);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {openDomains[domain.id] ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-6 space-y-4">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {wines.map((wine) => (
                              <Card
                                key={wine.id}
                                className="p-4 cursor-pointer hover:shadow-lg transition-shadow relative group"
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
                                    className="w-full h-32 object-contain mb-3"
                                  />
                                )}
                                <h4 className="font-semibold">{wine.name}</h4>
                                {wine.year && (
                                  <p className="text-sm text-muted-foreground">
                                    {wine.year}
                                  </p>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {selectedWine && event && (
        <WineDetailsDialog
          wine={selectedWine}
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
    </div>
  );
};

export default EventDetails;
