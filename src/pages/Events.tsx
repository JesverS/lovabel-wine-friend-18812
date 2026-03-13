import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PullToRefresh } from "@/components/PullToRefresh";
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
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { fetchEventBySlug } from "@/pages/EventDetails";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

const EVENTS_PER_PAGE = 12;

const Events = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'public' | 'registered' | 'organizing'>('public');
  const [publicEvents, setPublicEvents] = useState<Event[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearchName, setDebouncedSearchName] = useState("");
  const [debouncedSearchCity, setDebouncedSearchCity] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchName(searchName), 400);
    return () => clearTimeout(timer);
  }, [searchName]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchCity(searchCity), 400);
    return () => clearTimeout(timer);
  }, [searchCity]);

  useEffect(() => {
    if (activeTab === 'public') {
      setPage(0);
      fetchPublicEvents(0, false);
    } else if (user) {
      fetchUserEvents();
    }
  }, [activeTab, debouncedSearchName, debouncedSearchCity, searchDate, user]);

  const fetchPublicEvents = async (pageNum = 0, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const from = pageNum * EVENTS_PER_PAGE;
      const to = from + EVENTS_PER_PAGE;

      let query = supabase
        .from("event_public_list")
        .select("id, slug, name, description, start_date, end_date, city, banner_url")
        .order("start_date", { ascending: true })
        .range(from, to);

      if (debouncedSearchName.trim()) {
        query = query.ilike("name", `%${debouncedSearchName}%`);
      }

      if (debouncedSearchCity.trim()) {
        query = query.ilike("city", `%${debouncedSearchCity}%`);
      }

      if (searchDate) {
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .lte("start_date", endOfDay.toISOString())
          .or(`end_date.gte.${startOfDay.toISOString()},end_date.is.null`);
      } else {
        // Par défaut, ne montrer que les événements à venir ou en cours
        const now = new Date().toISOString();
        query = query.or(`end_date.gte.${now},and(end_date.is.null,start_date.gte.${now})`);
      }

      const { data, error } = await query;

      if (!error && data) {
        const hasMoreData = data.length > EVENTS_PER_PAGE;
        const eventsToShow = hasMoreData ? data.slice(0, EVENTS_PER_PAGE) : data;
        
        setPublicEvents(prev => append ? [...prev, ...eventsToShow] : eventsToShow);
        setHasMore(hasMoreData);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPublicEvents(nextPage, true);
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
    let filtered = userEvents;
    if (activeTab === 'organizing') {
      filtered = filtered.filter(e => ['organizer', 'co_organizer', 'admin'].includes(e.role));
    }
    if (activeTab === 'registered') {
      filtered = filtered.filter(e => e.role === 'participant');
    }
    // Apply search filters
    if (searchName.trim()) {
      filtered = filtered.filter(e => e.name.toLowerCase().includes(searchName.toLowerCase()));
    }
    if (searchCity.trim()) {
      filtered = filtered.filter(e => e.city?.toLowerCase().includes(searchCity.toLowerCase()));
    }
    if (searchDate) {
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => {
        const eventStart = new Date(e.start_date);
        const eventEnd = e.end_date ? new Date(e.end_date) : eventStart;
        return eventStart <= endOfDay && eventEnd >= startOfDay;
      });
    }
    return filtered;
  };

  const handlePrefetchEvent = useCallback((slug: string, token: string | null) => {
    queryClient.prefetchQuery({
      queryKey: ['event', slug, token],
      queryFn: () => fetchEventBySlug(slug, token),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const renderEventCard = (event: Event | UserEvent, showRole = false) => {
    const role = 'role' in event ? event.role : null;
    const isOrganizing = role && ['organizer', 'co_organizer', 'admin'].includes(role);
    const eventUrl = event.is_public === false && event.private_token
      ? `/event/${event.slug}?token=${event.private_token}`
      : `/event/${event.slug}`;
    const prefetchToken = event.is_public === false && event.private_token ? event.private_token : null;

    return (
      <Link
        key={event.id}
        to={eventUrl}
        onMouseEnter={() => handlePrefetchEvent(event.slug, prefetchToken)}
        onTouchStart={() => handlePrefetchEvent(event.slug, prefetchToken)}
      >
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
      <Helmet>
        <title>Événements Viticoles | Salons & Dégustations - Wine Note</title>
        <meta name="description" content="Découvrez les salons du vin, dégustations et événements viticoles près de chez vous. Inscrivez-vous et participez à la communauté Wine Note." />
        <link rel="canonical" href="https://winenote.me/events" />
        <meta property="og:title" content="Événements Viticoles - Wine Note" />
        <meta property="og:description" content="Salons, dégustations et événements viticoles" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me/events" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/1EK7H96ITKXD3CrC1aSkRhKBhvC2/social-images/social-1765190887528-icon.png" />
      </Helmet>

      <Header />
      <main className="pt-20 flex-grow">
        <PullToRefresh onRefresh={async () => {
          if (activeTab === 'public') await fetchPublicEvents(0, false);
          else if (user) await fetchUserEvents();
        }}>
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
                  <BreadcrumbPage>Événements</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

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

            {/* Search filters */}
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

            {loading ? (
              <div className="grid gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      <Skeleton className="w-full md:w-32 h-48 md:h-32 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-4 pt-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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
              <div className="space-y-6">
                  <div className="grid gap-6">
                    {publicEvents.map((event) => renderEventCard(event, false))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button 
                        variant="outline" 
                        onClick={loadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Chargement...' : 'Charger plus d\'événements'}
                      </Button>
                    </div>
                  )}
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
        </PullToRefresh>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
