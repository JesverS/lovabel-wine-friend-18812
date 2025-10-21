import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  const [cityFilter, setCityFilter] = useState("");
  const [searchCity, setSearchCity] = useState("");

  useEffect(() => {
    const fetchUserCity = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("address")
          .eq("id", user.id)
          .single();
        
        if (profile?.address) {
          const city = profile.address.split(",")[0].trim();
          setCityFilter(city);
          setSearchCity(city);
        }
      }
    };

    fetchUserCity();
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase
        .from("event")
        .select("*")
        .eq("is_public", true)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (cityFilter) {
        query = query.ilike("city", `%${cityFilter}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [cityFilter]);

  const handleSearch = () => {
    setCityFilter(searchCity);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-center mb-4">
              Événements Viticoles
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              Découvrez les salons, dégustations et événements près de chez vous
            </p>

            <div className="flex gap-2 mb-12">
              <Input
                placeholder="Rechercher par ville..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
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
    </div>
  );
};

export default Events;
