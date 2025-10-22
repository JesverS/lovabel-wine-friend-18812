import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wine, Calendar, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserFavoritesProps {
  userId: string;
}

type ViewMode = 'date' | 'domain';

export function UserFavorites({ userId }: UserFavoritesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 15;
  const DOMAINS_PER_PAGE = 10;

  useEffect(() => {
    if (viewMode === 'date') {
      fetchFavoritesByDate(0);
    } else {
      fetchDomains(0);
    }
  }, [viewMode, userId]);

  useEffect(() => {
    if (selectedDomain) {
      fetchFavoritesByDomain(selectedDomain);
    }
  }, [selectedDomain]);

  const fetchFavoritesByDate = async (pageNumber: number) => {
    setLoading(true);
    const from = pageNumber * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const favQuery = supabase
      .from('user_favorite')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error } = await favQuery as any;

    if (!error && data) {
      // Fetch wine details for each favorite
      const favoritesWithWines: any[] = [];
      
      for (const fav of data) {
        const wineQuery = supabase
          .from('wine')
          .select('id, name, year, label_url, price, domain_id')
          .eq('id', fav.wine_id)
          .single();
        
        const wineResult = await wineQuery as any;
        const wineData = wineResult.data;

        if (wineData) {
          const domainQuery = supabase
            .from('domain')
            .select('id, name')
            .eq('id', wineData.domain_id)
            .single();
          
          const domainResult = await domainQuery as any;
          const domainData = domainResult.data;

          favoritesWithWines.push({
            ...fav,
            wine: {
              ...wineData,
              domain: domainData,
            },
          });
        } else {
          favoritesWithWines.push(fav);
        }
      }

      if (pageNumber === 0) {
        setFavorites(favoritesWithWines);
      } else {
        setFavorites((prev) => [...prev, ...favoritesWithWines]);
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
      setPage(pageNumber);
    }
    setLoading(false);
  };

  const fetchDomains = async (pageNumber: number) => {
    setLoading(true);
    const from = pageNumber * DOMAINS_PER_PAGE;
    const to = from + DOMAINS_PER_PAGE - 1;

    const favQuery = supabase
      .from('user_favorite')
      .select('domain_id')
      .eq('user_id', userId);
    
    const { data, error } = await favQuery as any;

    if (!error && data) {
      // Group by domain and count
      const domainCounts = new Map();
      data.forEach((item: any) => {
        const domainId = item.domain_id;
        domainCounts.set(domainId, (domainCounts.get(domainId) || 0) + 1);
      });

      // Fetch domain details
      const uniqueDomainIds = Array.from(domainCounts.keys());
      const domainsWithDetails: any[] = [];
      
      for (const domainId of uniqueDomainIds) {
        const domainQuery = supabase
          .from('domain')
          .select('id, name, logo_url')
          .eq('id', domainId as any)
          .single();
        
        const domainResult = await domainQuery as any;
        const domainData = domainResult.data;
        
        if (domainData) {
          domainsWithDetails.push({
            ...domainData,
            count: domainCounts.get(domainId),
          });
        }
      }

      const paginatedDomains = domainsWithDetails.slice(from, to + 1);

      if (pageNumber === 0) {
        setDomains(paginatedDomains);
      } else {
        setDomains((prev) => [...prev, ...paginatedDomains]);
      }
      setHasMore(paginatedDomains.length === DOMAINS_PER_PAGE);
      setPage(pageNumber);
    }
    setLoading(false);
  };

  const fetchFavoritesByDomain = async (domainId: string) => {
    setLoading(true);
    
    const favQuery = supabase
      .from('user_favorite')
      .select('*')
      .eq('user_id', userId)
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false });
    
    const { data, error } = await favQuery as any;

    if (!error && data) {
      // Fetch wine details
      const favoritesWithWines: any[] = [];
      
      for (const fav of data) {
        const wineQuery = supabase
          .from('wine')
          .select('id, name, year, label_url, price')
          .eq('id', fav.wine_id)
          .single();
        
        const wineResult = await wineQuery as any;
        
        favoritesWithWines.push({
          ...fav,
          wine: wineResult.data,
        });
      }

      setFavorites(favoritesWithWines);
    }
    setLoading(false);
  };

  const loadMore = () => {
    if (viewMode === 'date') {
      fetchFavoritesByDate(page + 1);
    } else {
      fetchDomains(page + 1);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight * 1.5 && hasMore && !loading) {
      loadMore();
    }
  };

  if (selectedDomain) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedDomain(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux domaines
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <Card key={fav.wine_id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {fav.wine?.label_url && (
                  <img
                    src={fav.wine.label_url}
                    alt={fav.wine.name}
                    className="w-full h-32 object-contain mb-3"
                  />
                )}
                <h3 className="font-semibold text-sm mb-1">{fav.wine?.name}</h3>
                {fav.wine?.year && (
                  <p className="text-xs text-muted-foreground mb-1">Année: {fav.wine.year}</p>
                )}
                {fav.wine?.price && (
                  <p className="text-xs text-muted-foreground mb-1">Prix: {fav.wine.price}€</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Ajouté le {new Date(fav.created_at).toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading && (
          <p className="text-center text-muted-foreground">Chargement...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="max-h-[600px] overflow-y-auto" onScroll={handleScroll}>
        {viewMode === 'date' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <Card key={fav.wine_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {fav.wine?.label_url && (
                    <img
                      src={fav.wine.label_url}
                      alt={fav.wine.name}
                      className="w-full h-32 object-contain mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-sm mb-1">{fav.wine?.name}</h3>
                  {fav.wine?.year && (
                    <p className="text-xs text-muted-foreground mb-1">Année: {fav.wine.year}</p>
                  )}
                  {fav.wine?.domain?.name && (
                    <p className="text-xs text-muted-foreground mb-1">Domaine: {fav.wine.domain.name}</p>
                  )}
                  {fav.wine?.price && (
                    <p className="text-xs text-muted-foreground mb-1">Prix: {fav.wine.price}€</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Ajouté le {new Date(fav.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map((domain) => (
              <Card
                key={domain.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedDomain(domain.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={domain.logo_url || undefined} />
                      <AvatarFallback>
                        <Wine className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{domain.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {domain.count} vin{domain.count > 1 ? 's' : ''} en favoris
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-center text-muted-foreground py-4">Chargement...</p>
        )}

        {!loading && !hasMore && (favorites.length > 0 || domains.length > 0) && (
          <p className="text-center text-muted-foreground py-4">
            {viewMode === 'date' ? 'Toutes les bouteilles ont été affichées' : 'Tous les domaines ont été affichés'}
          </p>
        )}

        {!loading && favorites.length === 0 && domains.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucun favori pour le moment</p>
        )}
      </div>
    </div>
  );
}
