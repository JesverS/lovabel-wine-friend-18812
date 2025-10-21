import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { WineInteractionDialog } from "@/components/WineInteractionDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

interface DomainWithWines {
  domain: Domain;
  wines: Wine[];
}

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [domainsWithWines, setDomainsWithWines] = useState<DomainWithWines[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({});

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
      setLoading(false);
    };

    fetchEventDetails();
  }, [id]);

  const toggleDomain = (domainId: string) => {
    setOpenDomains((prev) => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
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
              <h2 className="text-3xl font-serif font-bold mb-6">
                Domaines présents
              </h2>

              {domainsWithWines.map(({ domain, wines }) => (
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
                        {openDomains[domain.id] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wines.map((wine) => (
                          <Card
                            key={wine.id}
                            className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => setSelectedWine(wine)}
                          >
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
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {selectedWine && event && (
        <WineInteractionDialog
          wine={selectedWine}
          eventId={event.id}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
};

export default EventDetails;
