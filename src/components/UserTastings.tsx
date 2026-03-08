import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wine, Calendar, ArrowLeft, Star, MapPin, CalendarDays, Map as MapIcon, Plus, Instagram, Trash2 } from 'lucide-react';
import { WineDetailsDialog } from './WineDetailsDialog';
import { ShareStoryDialog } from './ShareStoryDialog';
import { TastingCard } from './TastingCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TastingsMap from './TastingsMap';
import SpontaneousTastingDialog from './SpontaneousTastingDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type ViewMode = 'date' | 'domain' | 'event' | 'cellar' | 'map';

interface TastingNote {
  id: string;
  wine_id: string;
  created_at: string;
  liked: number;
  rating: number | null;
  comment: string | null;
  details: any;
  wine: {
    id: string;
    name: string;
    year: number | null;
    price: number | null;
    label_url: string | null;
    description: string | null;
    domain_id: string;
    volume_ml: number | null;
    alcohol_percentage: number | null;
    characteristics: any;
    type: number | null;
  };
  domain: {
    name: string;
    logo_url: string | null;
  };
}

interface DomainGroup {
  domain_id: string;
  domain_name: string;
  domain_logo: string | null;
  tasting_count: number;
}

interface EventGroup {
  event_id: string;
  event_name: string;
  event_banner: string | null;
  event_start_date: string;
  event_location: string | null;
  tasting_count: number;
}

interface CellarGroup {
  cellar_id: string;
  cellar_name: string;
  cellar_logo: string | null;
  cellar_location: string | null;
  tasting_count: number;
}

const TASTINGS_PER_PAGE = 15;
const DOMAINS_PER_PAGE = 10;
const EVENTS_PER_PAGE = 20;
const CELLARS_PER_PAGE = 20;

interface UserTastingsProps {
  userId?: string;
}

export const UserTastings = ({ userId }: UserTastingsProps = {}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [tastings, setTastings] = useState<TastingNote[]>([]);
  const [domains, setDomains] = useState<DomainGroup[]>([]);
  const [events, setEvents] = useState<EventGroup[]>([]);
  const [cellars, setCellars] = useState<CellarGroup[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedCellar, setSelectedCellar] = useState<string | null>(null);
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showDisliked, setShowDisliked] = useState(false);
  const [showSpontaneousDialog, setShowSpontaneousDialog] = useState(false);
  const [shareStoryTasting, setShareStoryTasting] = useState<TastingNote | null>(null);
  const [deletingTasting, setDeletingTasting] = useState<TastingNote | null>(null);

  const handleDeleteTasting = async (tasting: TastingNote) => {
    try {
      const { error } = await supabase
        .from('user_wine_notice')
        .delete()
        .eq('id', tasting.id);
      if (error) throw error;
      setTastings(prev => prev.filter(t => t.id !== tasting.id));
      toast.success('Dégustation supprimée');
    } catch (error) {
      console.error('Error deleting tasting:', error);
      toast.error('Erreur lors de la suppression');
    }
    setDeletingTasting(null);
  };

  useEffect(() => {
    if (targetUserId) {
      setPage(0);
      setHasMore(true);
      
      if (viewMode === 'date') {
        fetchTastingsByDate(0);
      } else if (viewMode === 'domain') {
        if (!selectedDomain) {
          fetchDomains(0);
        } else {
          fetchTastingsByDomain(selectedDomain, 0);
        }
      } else if (viewMode === 'event') {
        if (!selectedEvent) {
          fetchEvents(0);
        } else {
          fetchTastingsByEvent(selectedEvent, 0);
        }
      } else if (viewMode === 'cellar') {
        if (!selectedCellar) {
          fetchCellars(0);
        } else {
          fetchTastingsByCellar(selectedCellar, 0);
        }
      }
    }
  }, [targetUserId, viewMode, selectedDomain, selectedEvent, selectedCellar, showDisliked]);

  const fetchTastingsByDate = async (pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query.range(from, to);

    if (!error && data && data.length > 0) {
      // Batch fetch wines
      const wineIds = [...new Set((data as any[]).map(t => t.wine_id))];
      const { data: wines } = await supabase.from('wine').select('*').in('id', wineIds);
      const winesMap = new Map((wines || []).map(w => [w.id, w]));

      // Get domain IDs from wines
      const domainIds = [...new Set((wines || []).map(w => w.domain_id).filter(Boolean))];
      const { data: domains } = await supabase.from('domain').select('id, name, logo_url').in('id', domainIds);
      const domainsMap = new Map((domains || []).map(d => [d.id, d]));

      const enrichedData = (data as any[])
        .map((tasting: any) => {
          const wine = winesMap.get(tasting.wine_id);
          if (!wine) return null;
          const domain = domainsMap.get(wine.domain_id);
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
            details: tasting.details,
            wine,
            domain: domain || { name: '', logo_url: null }
          };
        })
        .filter(item => item !== null) as TastingNote[];

      if (pageNum === 0) {
        setTastings(enrichedData);
      } else {
        setTastings(prev => [...prev, ...enrichedData]);
      }
      setHasMore(data.length === TASTINGS_PER_PAGE);
    } else {
      if (pageNum === 0) setTastings([]);
      setHasMore(false);
    }

    setLoading(false);
  };

  const fetchDomains = async (pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * DOMAINS_PER_PAGE;
    const to = from + DOMAINS_PER_PAGE - 1;

    let query = supabase
      .from('user_wine_notice' as any)
      .select('wine_id')
      .eq('user_id', targetUserId);

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      // Batch fetch wines to get domain IDs
      const wineIds = [...new Set((data as any[]).map(item => item.wine_id))];
      const { data: wines } = await supabase.from('wine').select('id, domain_id').in('id', wineIds);

      const domainCounts = (wines || []).reduce((acc: Record<string, number>, wine) => {
        if (wine.domain_id) {
          acc[wine.domain_id] = (acc[wine.domain_id] || 0) + 1;
        }
        return acc;
      }, {});

      const uniqueDomainIds = Object.keys(domainCounts);
      
      // Batch fetch domains
      const { data: domainsData } = await supabase
        .from('domain')
        .select('id, name, logo_url')
        .in('id', uniqueDomainIds);

      const domainsWithCounts = (domainsData || []).map(domain => ({
        domain_id: domain.id,
        domain_name: domain.name || 'Domaine inconnu',
        domain_logo: domain.logo_url || null,
        tasting_count: domainCounts[domain.id] || 0
      }));

      const paginatedDomains = domainsWithCounts.slice(from, to + 1);
      
      if (pageNum === 0) {
        setDomains(paginatedDomains);
      } else {
        setDomains(prev => [...prev, ...paginatedDomains]);
      }
      setHasMore(paginatedDomains.length === DOMAINS_PER_PAGE);
    } else {
      if (pageNum === 0) setDomains([]);
      setHasMore(false);
    }

    setLoading(false);
  };

  const fetchTastingsByDomain = async (domainId: string, pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    // Batch fetch wines from this domain
    const { data: wines } = await supabase
      .from('wine')
      .select('id')
      .eq('domain_id', domainId);

    if (!wines || wines.length === 0) {
      if (pageNum === 0) setTastings([]);
      setLoading(false);
      return;
    }

    const wineIds = wines.map(w => w.id);

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', targetUserId)
      .in('wine_id', wineIds)
      .order('created_at', { ascending: false });

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query.range(from, to);

    if (!error && data && data.length > 0) {
      // Batch fetch wines and domain
      const tastingWineIds = [...new Set((data as any[]).map(t => t.wine_id))];
      const [winesRes, domainRes] = await Promise.all([
        supabase.from('wine').select('*').in('id', tastingWineIds),
        supabase.from('domain').select('id, name, logo_url').eq('id', domainId).maybeSingle()
      ]);

      const winesMap = new Map((winesRes.data || []).map(w => [w.id, w]));
      const domain = domainRes.data || { name: '', logo_url: null };

      const enrichedData = (data as any[])
        .map((tasting: any) => {
          const wine = winesMap.get(tasting.wine_id);
          if (!wine) return null;
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
            details: tasting.details,
            wine,
            domain
          };
        })
        .filter(item => item !== null) as TastingNote[];

      if (pageNum === 0) {
        setTastings(enrichedData);
      } else {
        setTastings(prev => [...prev, ...enrichedData]);
      }
      setHasMore(data.length === TASTINGS_PER_PAGE);
    } else {
      if (pageNum === 0) setTastings([]);
      setHasMore(false);
    }

    setLoading(false);
  };

  const fetchEvents = async (pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * EVENTS_PER_PAGE;
    const to = from + EVENTS_PER_PAGE - 1;

    let noticeQuery = supabase
      .from('user_wine_notice' as any)
      .select('id')
      .eq('user_id', targetUserId);

    if (!showDisliked) {
      noticeQuery = noticeQuery.in('liked', [0, 1]);
    }

    const { data: notices, error: noticeError } = await noticeQuery;

    if (noticeError || !notices || notices.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const noticeIds = notices.map((n: any) => n.id);

    const { data: eventLinks } = await supabase
      .from('user_wine_notice_event')
      .select('event_id, user_wine_notice_id')
      .in('user_wine_notice_id', noticeIds);

    if (!eventLinks || eventLinks.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventCounts = eventLinks.reduce((acc: Record<string, number>, link) => {
      acc[link.event_id] = (acc[link.event_id] || 0) + 1;
      return acc;
    }, {});

    const uniqueEventIds = Object.keys(eventCounts);

    // Batch fetch all events in one query instead of N+1
    const { data: eventsRaw } = await supabase
      .from('event')
      .select('id, name, banner_url, start_date, location')
      .in('id', uniqueEventIds);

    const eventsData = (eventsRaw || []).map(event => ({
      event_id: event.id,
      event_name: event.name,
      event_banner: event.banner_url,
      event_start_date: event.start_date,
      event_location: event.location,
      tasting_count: eventCounts[event.id] || 0
    }));


    eventsData.sort((a, b) => 
      new Date(b.event_start_date).getTime() - new Date(a.event_start_date).getTime()
    );

    const paginatedEvents = eventsData.slice(from, to + 1);
    
    if (pageNum === 0) {
      setEvents(paginatedEvents);
    } else {
      setEvents(prev => [...prev, ...paginatedEvents]);
    }
    setHasMore(paginatedEvents.length === EVENTS_PER_PAGE);
    setLoading(false);
  };

  const fetchCellars = async (pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * CELLARS_PER_PAGE;
    const to = from + CELLARS_PER_PAGE - 1;

    let noticeQuery = supabase
      .from('user_wine_notice' as any)
      .select('id')
      .eq('user_id', targetUserId);

    if (!showDisliked) {
      noticeQuery = noticeQuery.in('liked', [0, 1]);
    }

    const { data: notices, error: noticeError } = await noticeQuery;

    if (noticeError || !notices || notices.length === 0) {
      setCellars([]);
      setLoading(false);
      return;
    }

    const noticeIds = notices.map((n: any) => n.id);

    const { data: cellarLinks } = await supabase
      .from('user_wine_notice_cellar')
      .select('cellar_id, user_wine_notice_id')
      .in('user_wine_notice_id', noticeIds);

    if (!cellarLinks || cellarLinks.length === 0) {
      setCellars([]);
      setLoading(false);
      return;
    }

    const cellarCounts = cellarLinks.reduce((acc: Record<string, number>, link) => {
      acc[link.cellar_id] = (acc[link.cellar_id] || 0) + 1;
      return acc;
    }, {});

    const uniqueCellarIds = Object.keys(cellarCounts);

    // Batch fetch all cellars in one query instead of N+1
    const { data: cellarsRaw } = await supabase
      .from('cellar')
      .select('id, name, logo_url, location')
      .in('id', uniqueCellarIds);

    const cellarsData = (cellarsRaw || []).map(cellar => ({
      cellar_id: cellar.id,
      cellar_name: cellar.name,
      cellar_logo: cellar.logo_url,
      cellar_location: cellar.location,
      tasting_count: cellarCounts[cellar.id] || 0
    }));


    cellarsData.sort((a, b) => b.tasting_count - a.tasting_count);

    const paginatedCellars = cellarsData.slice(from, to + 1);
    
    if (pageNum === 0) {
      setCellars(paginatedCellars);
    } else {
      setCellars(prev => [...prev, ...paginatedCellars]);
    }
    setHasMore(paginatedCellars.length === CELLARS_PER_PAGE);
    setLoading(false);
  };

  const fetchTastingsByEvent = async (eventId: string, pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    const { data: eventLinks } = await supabase
      .from('user_wine_notice_event')
      .select('user_wine_notice_id')
      .eq('event_id', eventId);

    if (!eventLinks || eventLinks.length === 0) {
      setTastings([]);
      setLoading(false);
      return;
    }

    const noticeIds = eventLinks.map(link => link.user_wine_notice_id);

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', targetUserId)
      .in('id', noticeIds)
      .order('created_at', { ascending: false });

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query.range(from, to);

    if (!error && data) {
      const enrichedData = await Promise.all(
        (data as any[]).map(async (tasting: any) => {
          const { data: wine } = await supabase
            .from('wine')
            .select('*')
            .eq('id', tasting.wine_id)
            .maybeSingle();

          if (!wine) return null;

          const { data: domain } = await supabase
            .from('domain')
            .select('name, logo_url')
            .eq('id', wine.domain_id)
            .maybeSingle();
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
            details: tasting.details,
            wine,
            domain: domain || { name: '', logo_url: null }
          };
        })
      );

      const filteredData = enrichedData.filter(item => item !== null) as TastingNote[];

      if (pageNum === 0) {
        setTastings(filteredData);
      } else {
        setTastings(prev => [...prev, ...filteredData]);
      }
      setHasMore(data.length === TASTINGS_PER_PAGE);
    }

    setLoading(false);
  };

  const fetchTastingsByCellar = async (cellarId: string, pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    const { data: cellarLinks } = await supabase
      .from('user_wine_notice_cellar')
      .select('user_wine_notice_id')
      .eq('cellar_id', cellarId);

    if (!cellarLinks || cellarLinks.length === 0) {
      setTastings([]);
      setLoading(false);
      return;
    }

    const noticeIds = cellarLinks.map(link => link.user_wine_notice_id);

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', targetUserId)
      .in('id', noticeIds)
      .order('created_at', { ascending: false });

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query.range(from, to);

    if (!error && data) {
      const enrichedData = await Promise.all(
        (data as any[]).map(async (tasting: any) => {
          const { data: wine } = await supabase
            .from('wine')
            .select('*')
            .eq('id', tasting.wine_id)
            .maybeSingle();

          if (!wine) return null;

          const { data: domain } = await supabase
            .from('domain')
            .select('name, logo_url')
            .eq('id', wine.domain_id)
            .maybeSingle();
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
            details: tasting.details,
            wine,
            domain: domain || { name: '', logo_url: null }
          };
        })
      );

      const filteredData = enrichedData.filter(item => item !== null) as TastingNote[];

      if (pageNum === 0) {
        setTastings(filteredData);
      } else {
        setTastings(prev => [...prev, ...filteredData]);
      }
      setHasMore(data.length === TASTINGS_PER_PAGE);
    }

    setLoading(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    if (viewMode === 'date') {
      fetchTastingsByDate(nextPage);
    } else if (viewMode === 'domain') {
      if (selectedDomain) {
        fetchTastingsByDomain(selectedDomain, nextPage);
      } else {
        fetchDomains(nextPage);
      }
    } else if (viewMode === 'event') {
      if (selectedEvent) {
        fetchTastingsByEvent(selectedEvent, nextPage);
      } else {
        fetchEvents(nextPage);
      }
    } else if (viewMode === 'cellar') {
      if (selectedCellar) {
        fetchTastingsByCellar(selectedCellar, nextPage);
      } else {
        fetchCellars(nextPage);
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    if (bottom && hasMore && !loading) {
      loadMore();
    }
  };

  const handleMapShareStory = (tastingId: string) => {
    const tasting = tastings.find(t => t.id === tastingId);
    if (tasting) setShareStoryTasting(tasting);
  };

  if (viewMode === 'event' && selectedEvent) {
    return (
      <div className="space-y-4" onScroll={handleScroll}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedEvent(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux événements
          </Button>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-disliked-event"
              checked={showDisliked}
              onCheckedChange={setShowDisliked}
            />
            <Label htmlFor="show-disliked-event" className="text-sm">
              Afficher les vins non appréciés
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tastings.map((tasting) => (
            <TastingCard
              key={tasting.id}
              tasting={tasting}
              isOwnProfile={isOwnProfile}
              onSelect={() => setSelectedWine(tasting.wine)}
              onDelete={() => setDeletingTasting(tasting)}
              onShareStory={() => setShareStoryTasting(tasting)}
            />
          ))}
        </div>

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && tastings.length > 0 && (
          <p className="text-center text-muted-foreground py-4">
            Toutes les dégustations ont été affichées
          </p>
        )}
      {tastings.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">
          Aucune dégustation pour cet événement
        </p>
      )}

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
}

  if (viewMode === 'cellar' && selectedCellar) {
    return (
      <div className="space-y-4" onScroll={handleScroll}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedCellar(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux caves
          </Button>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-disliked-cellar"
              checked={showDisliked}
              onCheckedChange={setShowDisliked}
            />
            <Label htmlFor="show-disliked-cellar" className="text-sm">
              Afficher les vins non appréciés
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tastings.map((tasting) => (
            <TastingCard
              key={tasting.id}
              tasting={tasting}
              isOwnProfile={isOwnProfile}
              onSelect={() => setSelectedWine(tasting.wine)}
              onDelete={() => setDeletingTasting(tasting)}
              onShareStory={() => setShareStoryTasting(tasting)}
            />
          ))}
        </div>

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && tastings.length > 0 && (
          <p className="text-center text-muted-foreground py-4">
            Toutes les dégustations ont été affichées
          </p>
        )}
      {tastings.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">
          Aucune dégustation pour cette cave
        </p>
      )}

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
}

  if (viewMode === 'domain' && selectedDomain) {
    return (
      <div className="space-y-4" onScroll={handleScroll}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedDomain(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux domaines
          </Button>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-disliked-domain"
              checked={showDisliked}
              onCheckedChange={setShowDisliked}
            />
            <Label htmlFor="show-disliked-domain" className="text-sm">
              Afficher les vins non appréciés
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tastings.map((tasting) => (
            <TastingCard
              key={tasting.id}
              tasting={tasting}
              isOwnProfile={isOwnProfile}
              onSelect={() => setSelectedWine(tasting.wine)}
              onDelete={() => setDeletingTasting(tasting)}
              onShareStory={() => setShareStoryTasting(tasting)}
            />
          ))}
        </div>

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && tastings.length > 0 && (
          <p className="text-center text-muted-foreground py-4">
            Toutes les dégustations ont été affichées
          </p>
        )}
      {tastings.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">
          Aucune dégustation pour ce domaine
        </p>
      )}

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === 'date' ? 'default' : 'outline'}
            onClick={() => setViewMode('date')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Par date
          </Button>
          <Button
            variant={viewMode === 'domain' ? 'default' : 'outline'}
            onClick={() => setViewMode('domain')}
          >
            <Wine className="w-4 h-4 mr-2" />
            Par domaine
          </Button>
          <Button
            variant={viewMode === 'event' ? 'default' : 'outline'}
            onClick={() => setViewMode('event')}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Par événement
          </Button>
          <Button
            variant={viewMode === 'cellar' ? 'default' : 'outline'}
            onClick={() => setViewMode('cellar')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Par cave
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={() => setViewMode('map')}
          >
            <MapIcon className="w-4 h-4 mr-2" />
            Carte
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-disliked"
            checked={showDisliked}
            onCheckedChange={setShowDisliked}
          />
          <Label htmlFor="show-disliked" className="text-sm">
            Afficher les vins non appréciés
          </Label>
        </div>
      </div>

      <div onScroll={handleScroll} className="space-y-4">
        {viewMode === 'date' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tastings.map((tasting) => (
              <TastingCard
                key={tasting.id}
                tasting={tasting}
                isOwnProfile={isOwnProfile}
                onSelect={() => setSelectedWine(tasting.wine)}
                onDelete={() => setDeletingTasting(tasting)}
                onShareStory={() => setShareStoryTasting(tasting)}
              />
            ))}
          </div>
        ) : viewMode === 'domain' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map((domain) => (
              <Card
                key={domain.domain_id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedDomain(domain.domain_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={domain.domain_logo || undefined} />
                      <AvatarFallback>
                        <Wine className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{domain.domain_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {domain.tasting_count} dégustation{domain.tasting_count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'event' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <Card
                key={event.event_id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedEvent(event.event_id)}
              >
                <CardContent className="p-6">
                  {event.event_banner && (
                    <img
                      src={event.event_banner}
                      alt={event.event_name}
                      className="w-full h-32 object-cover rounded mb-4"
                    />
                  )}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg truncate">{event.event_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(event.event_start_date).toLocaleDateString('fr-FR')}
                    </div>
                    {event.event_location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {event.event_location}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {event.tasting_count} dégustation{event.tasting_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'cellar' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cellars.map((cellar) => (
              <Card
                key={cellar.cellar_id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedCellar(cellar.cellar_id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={cellar.cellar_logo || undefined} />
                      <AvatarFallback>
                        <MapPin className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{cellar.cellar_name}</h3>
                      {cellar.cellar_location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          {cellar.cellar_location}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {cellar.tasting_count} dégustation{cellar.tasting_count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <TastingsMap sourceFilter={null} userId={targetUserId} />
        ) : null}

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && (
          viewMode === 'date' ? tastings.length > 0 : 
          viewMode === 'domain' ? domains.length > 0 :
          viewMode === 'event' ? events.length > 0 :
          cellars.length > 0
        ) && (
          <p className="text-center text-muted-foreground py-4">
            {viewMode === 'date' 
              ? 'Toutes les dégustations ont été affichées'
              : viewMode === 'domain'
              ? 'Tous les domaines ont été affichés'
              : viewMode === 'event'
              ? 'Tous les événements ont été affichés'
              : 'Toutes les caves ont été affichées'}
          </p>
        )}
        {viewMode === 'date' && tastings.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucune dégustation pour le moment
          </p>
        )}
        {viewMode === 'domain' && domains.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucun domaine dégusté pour le moment
          </p>
        )}
        {viewMode === 'event' && events.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucun événement avec dégustations pour le moment
          </p>
        )}
        {viewMode === 'cellar' && cellars.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucune cave avec dégustations pour le moment
          </p>
        )}
      </div>

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}

      {isOwnProfile && (
        <>
          <SpontaneousTastingDialog
            open={showSpontaneousDialog}
            onOpenChange={setShowSpontaneousDialog}
            onSuccess={() => {
              if (viewMode === 'date') {
                fetchTastingsByDate(0);
              }
            }}
          />

          <Button
            onClick={() => setShowSpontaneousDialog(true)}
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </>
      )}

      {shareStoryTasting && (
        <ShareStoryDialog
          open={!!shareStoryTasting}
          onOpenChange={(open) => { if (!open) setShareStoryTasting(null); }}
          post={{
            content: shareStoryTasting.comment || undefined,
            image_url: shareStoryTasting.wine.label_url || undefined,
            is_wine_notice: true,
            wine_notice: shareStoryTasting.details ? {
              rating: shareStoryTasting.details?.rating || 5,
              slot1: shareStoryTasting.details?.slot1,
              slot2: shareStoryTasting.details?.slot2,
              slot3: shareStoryTasting.details?.slot3,
              slot4: shareStoryTasting.details?.slot4,
            } : undefined,
          }}
          wine={{
            id: shareStoryTasting.wine.id,
            name: shareStoryTasting.wine.name,
            label_url: shareStoryTasting.wine.label_url || undefined,
            type: shareStoryTasting.wine.type,
            domain: { name: shareStoryTasting.domain.name },
          }}
        />
      )}

      <AlertDialog open={!!deletingTasting} onOpenChange={(open) => { if (!open) setDeletingTasting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dégustation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La dégustation de "{deletingTasting?.wine.name}" sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingTasting && handleDeleteTasting(deletingTasting)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};