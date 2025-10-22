import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wine, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type ViewMode = 'date' | 'domain';

interface FavoriteWine {
  wine_id: string;
  domain_id: string;
  created_at: string;
  wine: {
    name: string;
    year: number | null;
    price: number | null;
    label_url: string | null;
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
  wine_count: number;
}

const WINES_PER_PAGE = 15;
const DOMAINS_PER_PAGE = 10;

export const UserFavorites = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [favorites, setFavorites] = useState<FavoriteWine[]>([]);
  const [domains, setDomains] = useState<DomainGroup[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (user) {
      setPage(0);
      setHasMore(true);
      if (viewMode === 'date') {
        fetchFavoritesByDate(0);
      } else if (!selectedDomain) {
        fetchDomains(0);
      } else {
        fetchWinesByDomain(selectedDomain, 0);
      }
    }
  }, [user, viewMode, selectedDomain]);

  const fetchFavoritesByDate = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * WINES_PER_PAGE;
    const to = from + WINES_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('user_favorite' as any)
      .select('wine_id, domain_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      const enrichedData = await Promise.all(
        (data as any[]).map(async (fav: any) => {
          const [wineRes, domainRes] = await Promise.all([
            supabase.from('wine').select('name, year, price, label_url').eq('id', fav.wine_id).single(),
            supabase.from('domain').select('name, logo_url').eq('id', fav.domain_id).single()
          ]);
          
          return {
            wine_id: fav.wine_id,
            domain_id: fav.domain_id,
            created_at: fav.created_at,
            wine: wineRes.data || { name: '', year: null, price: null, label_url: null },
            domain: domainRes.data || { name: '', logo_url: null }
          };
        })
      );

      if (pageNum === 0) {
        setFavorites(enrichedData);
      } else {
        setFavorites(prev => [...prev, ...enrichedData]);
      }
      setHasMore(data.length === WINES_PER_PAGE);
    }

    setLoading(false);
  };

  const fetchDomains = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * DOMAINS_PER_PAGE;
    const to = from + DOMAINS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('user_favorite' as any)
      .select('domain_id')
      .eq('user_id', user.id);

    if (!error && data) {
      const domainCounts = (data as any[]).reduce((acc: Record<string, number>, item: any) => {
        acc[item.domain_id] = (acc[item.domain_id] || 0) + 1;
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
            wine_count: domainCounts[domainId]
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

  const fetchWinesByDomain = async (domainId: string, pageNum: number) => {
    if (!user) return;
    setLoading(true);

    const from = pageNum * WINES_PER_PAGE;
    const to = from + WINES_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('user_favorite' as any)
      .select('wine_id, domain_id, created_at')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      const enrichedData = await Promise.all(
        (data as any[]).map(async (fav: any) => {
          const [wineRes, domainRes] = await Promise.all([
            supabase.from('wine').select('name, year, price, label_url').eq('id', fav.wine_id).single(),
            supabase.from('domain').select('name, logo_url').eq('id', fav.domain_id).single()
          ]);
          
          return {
            wine_id: fav.wine_id,
            domain_id: fav.domain_id,
            created_at: fav.created_at,
            wine: wineRes.data || { name: '', year: null, price: null, label_url: null },
            domain: domainRes.data || { name: '', logo_url: null }
          };
        })
      );

      if (pageNum === 0) {
        setFavorites(enrichedData);
      } else {
        setFavorites(prev => [...prev, ...enrichedData]);
      }
      setHasMore(data.length === WINES_PER_PAGE);
    }

    setLoading(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);

    if (viewMode === 'date') {
      fetchFavoritesByDate(nextPage);
    } else if (selectedDomain) {
      fetchWinesByDomain(selectedDomain, nextPage);
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

  if (viewMode === 'domain' && selectedDomain) {
    return (
      <div className="space-y-4" onScroll={handleScroll}>
        <Button
          variant="ghost"
          onClick={() => setSelectedDomain(null)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux domaines
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map((fav) => (
            <Link key={fav.wine_id} to={`/wine/${fav.wine_id}`}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {fav.wine.label_url && (
                      <img
                        src={fav.wine.label_url}
                        alt={fav.wine.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{fav.wine.name}</h3>
                      <p className="text-sm text-muted-foreground">{fav.domain.name}</p>
                      {fav.wine.year && (
                        <p className="text-sm text-muted-foreground">Année: {fav.wine.year}</p>
                      )}
                      {fav.wine.price && (
                        <p className="text-sm text-muted-foreground">Prix: {fav.wine.price}€</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Ajouté le {new Date(fav.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && favorites.length > 0 && (
          <p className="text-center text-muted-foreground py-4">
            Toutes les bouteilles ont été affichées
          </p>
        )}
        {favorites.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucune bouteille favorite de ce domaine
          </p>
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

      <div onScroll={handleScroll} className="space-y-4">
        {viewMode === 'date' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((fav) => (
              <Link key={fav.wine_id} to={`/wine/${fav.wine_id}`}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {fav.wine.label_url && (
                        <img
                          src={fav.wine.label_url}
                          alt={fav.wine.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{fav.wine.name}</h3>
                        <p className="text-sm text-muted-foreground">{fav.domain.name}</p>
                        {fav.wine.year && (
                          <p className="text-sm text-muted-foreground">Année: {fav.wine.year}</p>
                        )}
                        {fav.wine.price && (
                          <p className="text-sm text-muted-foreground">Prix: {fav.wine.price}€</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Ajouté le {new Date(fav.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
                        {domain.wine_count} bouteille{domain.wine_count > 1 ? 's' : ''} favorite{domain.wine_count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {loading && <p className="text-center py-4">Chargement...</p>}
        {!hasMore && (viewMode === 'date' ? favorites.length > 0 : domains.length > 0) && (
          <p className="text-center text-muted-foreground py-4">
            {viewMode === 'date' 
              ? 'Toutes les bouteilles ont été affichées'
              : 'Tous les domaines ont été affichés'}
          </p>
        )}
        {viewMode === 'date' && favorites.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucune bouteille favorite pour le moment
          </p>
        )}
        {viewMode === 'domain' && domains.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucun domaine favori pour le moment
          </p>
        )}
      </div>
    </div>
  );
};
