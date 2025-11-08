import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wine, Plus, Pencil, ShoppingCart } from 'lucide-react';
import { AddWineDialog } from './AddWineDialog';
import { EditWineInCellarDialog } from './EditWineInCellarDialog';
import { WineSearchFilter, WineFilters } from './wine/WineSearchFilter';

interface WineData {
  wine_id: string;
  cellar_id: string;
  quantity: number | null;
  price: number | null;
  description: string | null;
  label_url: string | null;
  added_at: string | null;
  wine: {
    id: string;
    name: string;
    year: number | null;
    label_url: string;
    domain_id: string | null;
    type: number | null;
    mode_culture: number | null;
    wine_classification: number | null;
    price: number | null;
    volume_ml: number | null;
    website_order_url: string | null;
    description: string | null;
    domain: {
      name: string;
    } | null;
    wine_type: {
      type: string;
    } | null;
  } | null;
}

interface CellarCatalogProps {
  cellarId: string;
  isOwner: boolean;
}

const DEFAULT_IMAGE = 'https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png';

export function CellarCatalog({ cellarId, isOwner }: CellarCatalogProps) {
  const [wines, setWines] = useState<WineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'by-domain'>('all');
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsOffset, setDomainsOffset] = useState(0);
  const [hasMoreDomains, setHasMoreDomains] = useState(true);
  const [filters, setFilters] = useState<WineFilters>({
    searchQuery: '',
    wineTypeId: null,
    modeCultureId: null,
    classificationId: null,
    sortBy: 'added_at',
    sortOrder: 'desc',
  });

  useEffect(() => {
    if (cellarId) {
      fetchWines();
      fetchDomains();
    }
  }, [cellarId]);

  const fetchDomains = async (offset: number = 0) => {
    if (domainsLoading) return;
    
    setDomainsLoading(true);
    try {
      // Get distinct domain_ids from cellar_wine
      const { data: distinctDomains } = await supabase
        .from('cellar_wine')
        .select('domain_id')
        .eq('cellar_id', cellarId)
        .not('domain_id', 'is', null);

      if (distinctDomains) {
        const uniqueDomainIds = [...new Set(distinctDomains.map((d: any) => d.domain_id))];
        
        // Fetch domain details with pagination
        const { data: domainData } = await supabase
          .from('domain')
          .select('id, name, logo_url')
          .in('id', uniqueDomainIds)
          .order('name', { ascending: true })
          .range(offset, offset + 19);

        if (domainData) {
          if (offset === 0) {
            setDomains(domainData);
          } else {
            setDomains(prev => [...prev, ...domainData]);
          }
          setHasMoreDomains(domainData.length === 20);
          setDomainsOffset(offset + domainData.length);
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setDomainsLoading(false);
    }
  };

  const loadMoreDomains = () => {
    if (!domainsLoading && hasMoreDomains) {
      fetchDomains(domainsOffset);
    }
  };

  const fetchWines = async () => {
    try {
      const { data, error } = await supabase
        .from('cellar_wine')
        .select(`
          *,
          wine:wine_id (
            id,
            name,
            year,
            label_url,
            domain_id,
            type,
            mode_culture,
            wine_classification,
            price,
            volume_ml,
            website_order_url,
            description,
            domain:domain_id (
              name
            )
          )
        `)
        .eq('cellar_id', cellarId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Fetch wine types separately
      const enrichedData = await Promise.all(
        (data || []).map(async (item: any) => {
          if (item.wine?.type) {
            const { data: typeData } = await supabase
              .from('wine_type' as any)
              .select('type')
              .eq('id', item.wine.type)
              .maybeSingle();
            
            return {
              ...item,
              wine: {
                ...item.wine,
                wine_type: typeData
              }
            };
          }
          return item;
        })
      );

      setWines(enrichedData);
    } catch (error) {
      console.error('Error fetching wines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWines = wines.filter((wine) => {
    // Domain filter when viewing by domain
    if (viewMode === 'by-domain' && selectedDomain && wine.wine?.domain_id !== selectedDomain) {
      return false;
    }

    // Recherche textuelle
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch = 
        wine.wine?.name.toLowerCase().includes(query) ||
        wine.wine?.domain?.name.toLowerCase().includes(query) ||
        wine.wine?.year?.toString().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Filtre par type de vin
    if (filters.wineTypeId && wine.wine?.type?.toString() !== filters.wineTypeId) {
      return false;
    }

    // Filtre par mode de culture
    if (filters.modeCultureId && wine.wine?.mode_culture?.toString() !== filters.modeCultureId) {
      return false;
    }

    // Filtre par classification
    if (filters.classificationId && wine.wine?.wine_classification?.toString() !== filters.classificationId) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Tri
    let comparison = 0;
    
    switch (filters.sortBy) {
      case 'name':
        comparison = (a.wine?.name || '').localeCompare(b.wine?.name || '');
        break;
      case 'year':
        comparison = (a.wine?.year || 0) - (b.wine?.year || 0);
        break;
      case 'domain':
        comparison = (a.wine?.domain?.name || '').localeCompare(b.wine?.domain?.name || '');
        break;
      case 'price':
        comparison = (a.price || 0) - (b.price || 0);
        break;
      case 'added_at':
        comparison = new Date(a.added_at || 0).getTime() - new Date(b.added_at || 0).getTime();
        break;
    }

    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <p>Chargement du catalogue...</p>;
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <AddWineDialog cellarId={cellarId} onWineAdded={fetchWines} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('all');
              setSelectedDomain(null);
            }}
          >
            Tous les vins
          </Button>
          <Button
            variant={viewMode === 'by-domain' ? 'default' : 'outline'}
            onClick={() => setViewMode('by-domain')}
          >
            Par domaine
          </Button>
        </div>
      </div>

      {viewMode === 'by-domain' && !selectedDomain && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {domains.map((domain) => (
              <Card
                key={domain.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedDomain(domain.id)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                  {domain.logo_url ? (
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={domain.logo_url} alt={domain.name} />
                      <AvatarFallback>{domain.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-20 h-20">
                      <AvatarFallback>{domain.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <h3 className="font-semibold text-sm">{domain.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {domainsLoading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          )}
          
          {!domainsLoading && hasMoreDomains && domains.length > 0 && (
            <div className="text-center">
              <Button onClick={loadMoreDomains} variant="outline">
                Charger plus de domaines
              </Button>
            </div>
          )}
          
          {!hasMoreDomains && domains.length > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Tous les domaines ont été chargés</p>
            </div>
          )}
        </div>
      )}

      {viewMode === 'by-domain' && selectedDomain && (
        <Button
          variant="outline"
          onClick={() => setSelectedDomain(null)}
          className="mb-4"
        >
          ← Retour aux domaines
        </Button>
      )}

      {(viewMode === 'all' || selectedDomain) && (
        <WineSearchFilter
          onFilterChange={setFilters}
          showDomainFilter={true}
        />
      )}

      {(viewMode === 'all' || selectedDomain) && filteredWines.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filters.searchQuery || filters.wineTypeId || filters.modeCultureId || filters.classificationId
                ? 'Aucun vin ne correspond à vos critères'
                : 'Aucun vin dans le catalogue'}
            </p>
          </CardContent>
        </Card>
      ) : (viewMode === 'all' || selectedDomain) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWines.map((wine) => (
            <Card key={wine.wine_id} className="overflow-hidden">
              <div className="aspect-[2/3] relative overflow-hidden bg-muted">
                <img
                  src={wine.label_url || wine.wine?.label_url || DEFAULT_IMAGE}
                  alt={wine.wine?.name}
                  className="w-full h-full object-contain"
                />
                {isOwner && (
                  <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-sm">
                    Stock: {wine.quantity || 0}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{wine.wine?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {wine.wine?.domain?.name}
                      </p>
                      {wine.wine?.wine_type && (
                        <span className="text-xs text-muted-foreground">
                          {wine.wine.wine_type.type.charAt(0).toUpperCase() + wine.wine.wine_type.type.slice(1)}
                        </span>
                      )}
                    </div>
                    {wine.wine?.year && (
                      <span className="text-sm font-medium">
                        {wine.wine.year}
                      </span>
                    )}
                  </div>

                  {(wine.description || wine.wine?.description) && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {wine.description || wine.wine?.description}
                    </p>
                  )}

                  {wine.wine?.volume_ml && (
                    <p className="text-xs text-muted-foreground">
                      {wine.wine.volume_ml}ml
                    </p>
                  )}

                  {(wine.price || wine.wine?.price) && (
                    <p className="text-lg font-bold text-primary">
                      {wine.price || wine.wine?.price}€
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  {isOwner && (
                    <EditWineInCellarDialog wineData={wine as any} onUpdated={fetchWines} />
                  )}
                  {wine.wine?.website_order_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={wine.wine.website_order_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Commander
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
