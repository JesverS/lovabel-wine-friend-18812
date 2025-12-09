import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, MapPin, Search, Globe, Lock, Users, Crown } from "lucide-react";
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
  address?: string | null;
  banner_url: string | null;
  is_public?: boolean;
  private_token?: string | null;
}

interface UserEvent extends Event {
  role: string;
}

const Events = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'public' | 'registered' | 'organizing'>('public');
  const [publicEvents, setPublicEvents] = useState<Event[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (activeTab === 'public') {
      fetchPublicEvents();
    } else if (user) {
      fetchUserEvents();
    }
  }, [activeTab, searchName, searchCity, searchDate, user]);

  const fetchPublicEvents = async () => {
    setLoading(true);

    try {
      // Utiliser la VIEW event_public_list qui masque automatiquement les champs confidentiels
      let query = supabase
        .from("event_public_list")
        .select("id, slug, name, description, start_date, end_date, city, banner_url")
        .order("start_date", { ascending: true });

      if (searchName.trim()) {
        query = query.ilike("name", `%${searchName}%`);
      }

      if (searchCity.trim()) {
        query = query.ilike("city", `%${searchCity}%`);
      }

      if (searchDate) {
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .lte("start_date", endOfDay.toISOString())
          .or(`end_date.gte.${startOfDay.toISOString()},end_date.is.null`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setPublicEvents(data);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEvents = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: userEventLinks } = await supabase
        .from('user_event')
        .select('event_id, role')
        .eq('user_id', user.id);

      if (userEventLinks && userEventLinks.length > 0) {
        const eventIds = userEventLinks.map((ue: any) => ue.event_id);
        const rolesMap: Record<string, string> = {};
        userEventLinks.forEach((ue: any) => {
          rolesMap[ue.event_id] = ue.role;
        });

        const { data: eventsData } = await supabase
          .from('event')
          .select('id, slug, name, description, start_date, end_date, city, address, banner_url, is_public, private_token')
          .in('id', eventIds)
          .order('start_date', { ascending: false });

        if (eventsData) {
          const eventsWithRoles = eventsData.map(event => ({
            ...event,
            role: rolesMap[event.id]
          }));
          setUserEvents(eventsWithRoles);
        }
      } else {
        setUserEvents([]);
      }
    } catch (err) {
      console.error("Error fetching user events:", err);
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

  const getFilteredUserEvents = () => {
    if (activeTab === 'organizing') {
      return userEvents.filter(e => ['organizer', 'co_organizer', 'admin'].includes(e.role));
    }
    if (activeTab === 'registered') {
      return userEvents.filter(e => e.role === 'participant');
    }
    return userEvents;
  };

  const renderEventCard = (event: Event | UserEvent, showRole = false) => {
    const role = 'role' in event ? event.role : null;
    const isOrganizing = role && ['organizer', 'co_organizer', 'admin'].includes(role);
    const eventUrl = event.is_public === false && event.private_token
      ? `/event/${event.slug}?token=${event.private_token}`
      : `/event/${event.slug}`;

    return (
      <Link key={event.id} to={eventUrl}>
        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {event.banner_url && (
              <img
                src={event.banner_url}
                alt={event.name}
                className="w-full md:w-32 h-48 md:h-32 object-cover rounded-lg flex-shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-xl md:text-2xl font-serif font-bold break-words">{event.name}</h3>
                {showRole && event.is_public !== undefined && (
                  <Badge variant={event.is_public ? "secondary" : "outline"} className="flex-shrink-0">
                    {event.is_public ? (
                      <><Globe className="w-3 h-3 mr-1" />Public</>
                    ) : (
                      <><Lock className="w-3 h-3 mr-1" />Privé</>
                    )}
                  </Badge>
                )}
                {showRole && role && (
                  <Badge variant={isOrganizing ? "default" : "secondary"} className="flex-shrink-0">
                    {isOrganizing ? (
                      <><Crown className="w-3 h-3 mr-1" />Organisateur</>
                    ) : (
                      <><Users className="w-3 h-3 mr-1" />Participant</>
                    )}
                  </Badge>
                )}
              </div>
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
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="pt-20 flex-grow">
        <section className="container mx-auto px-4 py-16 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
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
                    <CreateEventDialog onEventCreated={() => {
                      if (activeTab === 'public') fetchPublicEvents();
                      else fetchUserEvents();
                    }} />
                  </div>
                )}
              </div>
            </div>

            {/* Tabs for filtering */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-8">
              <TabsList className={cn("grid w-full", user ? "grid-cols-3" : "grid-cols-1")}>
                <TabsTrigger value="public">
                  <Globe className="w-4 h-4 mr-2" />
                  Événements publics
                </TabsTrigger>
                {user && (
                  <>
                    <TabsTrigger value="registered">
                      <Users className="w-4 h-4 mr-2" />
                      Mes inscriptions
                    </TabsTrigger>
                    <TabsTrigger value="organizing">
                      <Crown className="w-4 h-4 mr-2" />
                      J'organise
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </Tabs>

            {/* Search filters - only for public events */}
            {activeTab === 'public' && (
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
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : activeTab === 'public' ? (
              publicEvents.length === 0 ? (
                <div className="flex items-center justify-center py-32">
                  <Card className="p-12 text-center max-w-md">
                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Aucun événement trouvé</h3>
                    <p className="text-muted-foreground mb-4">
                      {hasActiveFilters
                        ? "Aucun événement ne correspond à vos critères."
                        : "Aucun événement public disponible."}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={resetFilters}>
                        Réinitialiser
                      </Button>
                    )}
                  </Card>
                </div>
              ) : (
                <div className="grid gap-6">
                  {publicEvents.map((event) => renderEventCard(event, false))}
                </div>
              )
            ) : !user ? (
              <div className="flex items-center justify-center py-32">
                <Card className="p-12 text-center max-w-md">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
                  <p className="text-muted-foreground mb-4">
                    Connectez-vous pour voir vos événements
                  </p>
                </Card>
              </div>
            ) : getFilteredUserEvents().length === 0 ? (
              <div className="flex items-center justify-center py-32">
                <Card className="p-12 text-center max-w-md">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {activeTab === 'organizing' 
                      ? "Vous n'organisez aucun événement" 
                      : "Aucune inscription"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'organizing'
                      ? "Créez votre premier événement pour commencer"
                      : "Inscrivez-vous à des événements pour les voir ici"}
                  </p>
                </Card>
              </div>
            ) : (
              <div className="grid gap-6">
                {getFilteredUserEvents().map((event) => renderEventCard(event, true))}
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