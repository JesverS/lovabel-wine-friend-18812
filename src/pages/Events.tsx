import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

    // Filter by date - check if the search date falls within the event's date range
    if (searchDate) {
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Event should appear if: start_date <= searchDate AND (end_date >= searchDate OR end_date is null)
      query = query
        .lte("start_date", endOfDay.toISOString())
        .or(`end_date.gte.${startOfDay.toISOString()},end_date.is.null`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-20 flex-grow min-h-screen">
        <section className="container mx-auto px-4 py-16 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2">
                    Événements Viticoles
                  </h1>
                  <p className="text-muted-foreground">
                    Découvrez les salons, dégustations et événements près de chez vous
                  </p>
                </div>
                {user && (
                  <div className="w-full md:w-auto">
                    <CreateEventDialog 
                      onEventCreated={fetchEvents}
                    />
                  </div>
                )}
              </div>
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal relative pl-10",
                        !searchDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                      {searchDate ? format(searchDate, "d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={searchDate}
                      onSelect={setSearchDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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
                    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {event.banner_url && (
                          <img
                            src={event.banner_url}
                            alt={event.name}
                            className="w-full md:w-32 h-48 md:h-32 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl md:text-2xl font-serif font-bold mb-2 break-words">
                            {event.name}
                          </h3>
                          {event.description && (
                            <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-2 break-words">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="break-words">
                                {format(new Date(event.start_date), "PPP", { locale: fr })}
                                {event.end_date && 
                                  ` - ${format(new Date(event.end_date), "PPP", { locale: fr })}`
                                }
                              </span>
                            </div>
                            {event.city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="break-words">{event.city}</span>
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
