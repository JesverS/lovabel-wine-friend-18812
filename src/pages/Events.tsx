import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, MapPin, Search, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  city: string | null;
  address: string | null;
  banner_url: string | null;
}

type ErrorState = {
  hasError: boolean;
  message: string;
  canRetry: boolean;
} | null;

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchEvents();
  }, [searchName, searchCity, searchDate]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("event")
        .select("id, slug, name, description, start_date, end_date, city, address, banner_url")
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
          .lte("start_date", endOfDay.toISOString())
          .or(`end_date.gte.${startOfDay.toISOString()},end_date.is.null`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Database error:", fetchError);
        setError({
          hasError: true,
          message: "Impossible de charger les événements",
          canRetry: true,
        });
        setEvents([]);
      } else if (data) {
        setEvents(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError({
        hasError: true,
        message: "Une erreur s'est produite",
        canRetry: true,
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchName("");
    setSearchCity("");
    setSearchDate(undefined);
  };

  const hasActiveFilters = searchName || searchCity || searchDate;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-20 flex-grow">
        <section className="container mx-auto px-4 py-16 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2">Événements Viticoles</h1>
                  <p className="text-muted-foreground">
                    Découvrez les salons, dégustations et événements près de chez vous
                  </p>
                </div>
                {user && (
                  <div className="w-full md:w-auto">
                    <CreateEventDialog onEventCreated={fetchEvents} />
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
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ville"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loading}
                      className={cn(
                        "w-full justify-start text-left font-normal relative pl-10",
                        !searchDate && "text-muted-foreground",
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

              {hasActiveFilters && (
                <Button variant="outline" onClick={resetFilters} disabled={loading}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Chargement des événements...</p>
              </div>
            )}

            {/* Error State - Centered */}
            {!loading && error?.hasError && (
              <div className="flex flex-col items-center justify-center py-24">
                <Card className="p-8 max-w-md text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                  <h3 className="text-xl font-semibold mb-2">Erreur de chargement</h3>
                  <p className="text-muted-foreground mb-6">{error.message}</p>
                  {error.canRetry && (
                    <Button onClick={fetchEvents} className="w-full">
                      Réessayer
                    </Button>
                  )}
                </Card>
              </div>
            )}

            {/* Empty State - Centered */}
            {!loading && !error?.hasError && events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <Card className="p-12 max-w-md text-center">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Aucun événement trouvé</h3>
                  <p className="text-muted-foreground mb-6">
                    {hasActiveFilters
                      ? "Aucun événement ne correspond à vos critères de recherche."
                      : "Il n'y a pas d'événements publics pour le moment."}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={resetFilters} className="w-full">
                      Afficher tous les événements
                    </Button>
                  )}
                </Card>
              </div>
            )}

            {/* Events List */}
            {!loading && !error?.hasError && events.length > 0 && (
              <div className="grid gap-6">
                {events.map((event) => (
                  <Link key={event.id} to={`/event/${event.slug}`}>
                    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {event.banner_url && (
                          <img
                            src={event.banner_url}
                            alt={event.name}
                            className="w-full md:w-32 h-48 md:h-32 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl md:text-2xl font-serif font-bold mb-2 break-words">{event.name}</h3>
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
                                {event.end_date && ` - ${format(new Date(event.end_date), "PPP", { locale: fr })}`}
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
