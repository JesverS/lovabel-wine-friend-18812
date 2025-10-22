import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  city: string | null;
  address: string | null;
  banner_url: string | null;
}

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [searchName, searchCity, searchDate]);

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from("event")
      .select("*")
      .eq("is_public", true)
      .order("start_date", { ascending: true });

    // Filter by name
    if (searchName.trim()) {
      query = query.ilike("name", `%${searchName}%`);
    }

    // Filter by city
    if (searchCity.trim()) {
      query = query.ilike("city", `%${searchCity}%`);
    }

    // Filter by date
    if (searchDate) {
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte("start_date", startOfDay.toISOString())
        .lte("start_date", endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">
                  Événements Viticoles
                </h1>
                <p className="text-muted-foreground">
                  Découvrez les salons, dégustations et événements près de chez vous
                </p>
              </div>
              {user && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Créer un événement
                </Button>
              )}
            </div>

            {/* Search and Filters Section */}
            <div className="mb-12 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom de l'événement"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ville"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchDate ? format(searchDate, "d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                    value={searchDate ? format(searchDate, "d MMMM yyyy", { locale: fr }) : ""}
                    readOnly
                    className="pl-10 cursor-pointer"
                  />
                  <input
                    type="date"
                    className="absolute opacity-0 w-full h-full top-0 left-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        setSearchDate(new Date(e.target.value));
                      } else {
                        setSearchDate(undefined);
                      }
                    }}
                  />
                </div>
              </div>

              {(searchName || searchCity || searchDate) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchName("");
                    setSearchCity("");
                    setSearchDate(undefined);
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Aucun événement trouvé pour cette ville
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {events.map((event) => (
                  <Link key={event.id} to={`/event/${event.id}`}>
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="flex gap-6">
                        {event.banner_url && (
                          <img
                            src={event.banner_url}
                            alt={event.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-2xl font-serif font-bold mb-2">
                            {event.name}
                          </h3>
                          {event.description && (
                            <p className="text-muted-foreground mb-4 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                {format(new Date(event.start_date), "PPP", { locale: fr })}
                                {event.end_date && 
                                  ` - ${format(new Date(event.end_date), "PPP", { locale: fr })}`
                                }
                              </span>
                            </div>
                            {event.city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span>{event.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      
      {isCreateDialogOpen && (
        <CreateEventDialog 
          onEventCreated={() => {
            fetchEvents();
            setIsCreateDialogOpen(false);
          }} 
        />
      )}
    </div>
  );
};

export default Events;
