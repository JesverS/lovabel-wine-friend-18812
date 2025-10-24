import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wine, Calendar, ArrowLeft, Star } from 'lucide-react';
import { WineDetailsDialog } from './WineDetailsDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type ViewMode = 'date' | 'domain';

interface TastingNote {
  id: string;
  wine_id: string;
  created_at: string;
  liked: number;
  rating: number | null;
  comment: string | null;
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

const TASTINGS_PER_PAGE = 15;
const DOMAINS_PER_PAGE = 10;

export const UserTastings = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [tastings, setTastings] = useState<TastingNote[]>([]);
  const [domains, setDomains] = useState<DomainGroup[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showDisliked, setShowDisliked] = useState(false);

  useEffect(() => {
    if (user) {
      setPage(0);
      setHasMore(true);
      if (viewMode === 'date') {
        fetchTastingsByDate(0);
      } else if (!selectedDomain) {
        fetchDomains(0);
      } else {
        fetchTastingsByDomain(selectedDomain, 0);
      }
    }
  }, [user, viewMode, selectedDomain, showDisliked]);

  const fetchTastingsByDate = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', user.id)
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
            .single();

          if (!wine) return null;

          const { data: domain } = await supabase
            .from('domain')
            .select('name, logo_url')
            .eq('id', wine.domain_id)
            .single();
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
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

  const fetchDomains = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * DOMAINS_PER_PAGE;
    const to = from + DOMAINS_PER_PAGE - 1;

    let query = supabase
      .from('user_wine_notice' as any)
      .select('wine_id')
      .eq('user_id', user.id);

    if (!showDisliked) {
      query = query.in('liked', [0, 1]);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Get all wines to extract domain IDs
      const wineIds = [...new Set((data as any[]).map(item => item.wine_id))];
      const wines = await Promise.all(
        wineIds.map(async (wineId) => {
          const { data: wine } = await supabase
            .from('wine')
            .select('domain_id')
            .eq('id', wineId)
            .single();
          return wine?.domain_id;
        })
      );

      const domainCounts = wines.reduce((acc: Record<string, number>, domainId) => {
        if (domainId) {
          acc[domainId] = (acc[domainId] || 0) + 1;
        }
        return acc;
      }, {});

      const uniqueDomainIds = Object.keys(domainCounts);
      const domainsData = await Promise.all(
        uniqueDomainIds.map(async (domainId) => {
          const { data: domain } = await supabase
            .from('domain')
            .select('name, logo_url')
            .eq('id', domainId)
            .single();
          
          return {
            domain_id: domainId,
            domain_name: domain?.name || 'Domaine inconnu',
            domain_logo: domain?.logo_url || null,
            tasting_count: domainCounts[domainId]
          };
        })
      );

      const paginatedDomains = domainsData.slice(from, to + 1);
      
      if (pageNum === 0) {
        setDomains(paginatedDomains);
      } else {
        setDomains(prev => [...prev, ...paginatedDomains]);
      }
      setHasMore(paginatedDomains.length === DOMAINS_PER_PAGE);
    }

    setLoading(false);
  };

  const fetchTastingsByDomain = async (domainId: string, pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * TASTINGS_PER_PAGE;
    const to = from + TASTINGS_PER_PAGE - 1;

    // First, get all wines from this domain
    const { data: wines } = await supabase
      .from('wine')
      .select('id')
      .eq('domain_id', domainId);

    if (!wines) {
      setLoading(false);
      return;
    }

    const wineIds = wines.map(w => w.id);

    let query = supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', user.id)
      .in('wine_id', wineIds)
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
            .single();

          if (!wine) return null;

          const { data: domain } = await supabase
            .from('domain')
            .select('name, logo_url')
            .eq('id', wine.domain_id)
            .single();
          
          return {
            id: tasting.id,
            wine_id: tasting.wine_id,
            created_at: tasting.created_at,
            liked: tasting.liked,
            rating: tasting.rating,
            comment: tasting.comment,
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
    } else if (selectedDomain) {
      fetchTastingsByDomain(selectedDomain, nextPage);
    } else {
      fetchDomains(nextPage);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    if (bottom && hasMore && !loading) {
      loadMore();
    }
  };

  const getLikedIcon = (liked: number) => {
    if (liked === 1) return '👍';
    if (liked === -1) return '👎';
    return '🤷';
  };

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
            <Card 
              key={tasting.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedWine(tasting.wine)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {tasting.wine.label_url && (
                    <img
                      src={tasting.wine.label_url}
                      alt={tasting.wine.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{tasting.wine.name}</h3>
                    <p className="text-sm text-muted-foreground">{tasting.domain.name}</p>
                    {tasting.wine.year && (
                      <p className="text-sm text-muted-foreground">Année: {tasting.wine.year}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">{getLikedIcon(tasting.liked)}</span>
                      {tasting.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">{tasting.rating}/5</span>
                        </div>
                      )}
                    </div>
                    {tasting.comment && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {tasting.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Dégusté le {new Date(tasting.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
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
              <Card 
                key={tasting.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedWine(tasting.wine)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {tasting.wine.label_url && (
                      <img
                        src={tasting.wine.label_url}
                        alt={tasting.wine.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{tasting.wine.name}</h3>
                      <p className="text-sm text-muted-foreground">{tasting.domain.name}</p>
                      {tasting.wine.year && (
                        <p className="text-sm text-muted-foreground">Année: {tasting.wine.year}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{getLikedIcon(tasting.liked)}</span>
                        {tasting.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium">{tasting.rating}/5</span>
                          </div>
                        )}
                      </div>
                      {tasting.comment && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tasting.comment}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Dégusté le {new Date(tasting.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
        )}

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && (viewMode === 'date' ? tastings.length > 0 : domains.length > 0) && (
          <p className="text-center text-muted-foreground py-4">
            {viewMode === 'date' 
              ? 'Toutes les dégustations ont été affichées'
              : 'Tous les domaines ont été affichés'}
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
      </div>

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
};