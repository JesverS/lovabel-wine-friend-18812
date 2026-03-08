import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wine, Bookmark } from 'lucide-react';
import { WineDetailsDialog } from './WineDetailsDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WishlistWine {
  id: string;
  wine_id: string;
  created_at: string;
  wine: {
    id: string;
    name: string;
    year: number | null;
    price: number | null;
    label_url: string | null;
    description: string | null;
    volume_ml: number | null;
    alcohol_percentage: number | null;
    characteristics: any;
    domain_id: string;
  };
  domain: {
    name: string;
    logo_url: string | null;
  };
}

const WINES_PER_PAGE = 15;

interface UserWishlistProps {
  userId?: string;
}

export const UserWishlist = ({ userId }: UserWishlistProps = {}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [wines, setWines] = useState<WishlistWine[]>([]);
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (targetUserId) {
      setPage(0);
      setHasMore(true);
      fetchWishlist(0);
    }
  }, [targetUserId]);

  const fetchWishlist = async (pageNum: number) => {
    if (!targetUserId) return;
    setLoading(true);

    const from = pageNum * WINES_PER_PAGE;
    const to = from + WINES_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('wine_wishlist' as any)
      .select('id, wine_id, created_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Batch fetch wines
    const wineIds = [...new Set((data as any[]).map((w: any) => w.wine_id))];
    if (wineIds.length === 0) {
      if (pageNum === 0) setWines([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const { data: winesData } = await supabase
      .from('wine')
      .select('id, name, year, price, label_url, description, volume_ml, alcohol_percentage, characteristics, domain_id')
      .in('id', wineIds);

    const domainIds = [...new Set((winesData || []).map(w => w.domain_id).filter(Boolean))];
    const { data: domainsData } = domainIds.length > 0
      ? await supabase.from('domain').select('id, name, logo_url').in('id', domainIds)
      : { data: [] };

    const wineMap = new Map((winesData || []).map(w => [w.id, w]));
    const domainMap = new Map((domainsData || []).map(d => [d.id, d]));

    const enriched: WishlistWine[] = (data as any[])
      .map((item: any) => {
        const wine = wineMap.get(item.wine_id);
        if (!wine) return null;
        const domain = domainMap.get(wine.domain_id);
        return {
          ...item,
          wine,
          domain: domain || { name: 'Domaine inconnu', logo_url: null },
        };
      })
      .filter(Boolean) as WishlistWine[];

    if (pageNum === 0) {
      setWines(enriched);
    } else {
      setWines(prev => [...prev, ...enriched]);
    }

    setHasMore(data.length === WINES_PER_PAGE);
    setPage(pageNum);
    setLoading(false);
  };

  const handleRemoveFromWishlist = async (wineId: string) => {
    if (!user) return;
    
    await supabase
      .from('wine_wishlist' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('wine_id', wineId);

    setWines(prev => prev.filter(w => w.wine_id !== wineId));
  };

  if (loading && wines.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (wines.length === 0) {
    return (
      <div className="text-center py-20">
        <Bookmark className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Aucun vin à goûter</h2>
        <p className="text-muted-foreground">
          Ajoutez des vins à votre liste en appuyant sur l'icône signet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {wines.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedWine({ ...item.wine, domain_id: item.wine.domain_id })}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {item.wine.label_url ? (
                <img
                  src={item.wine.label_url}
                  alt={item.wine.name}
                  className="w-16 h-20 object-contain rounded"
                />
              ) : (
                <div className="w-16 h-20 bg-muted rounded flex items-center justify-center">
                  <Wine className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.wine.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {item.domain.logo_url && (
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={item.domain.logo_url} />
                      <AvatarFallback className="text-[8px]">D</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-sm text-muted-foreground truncate">{item.domain.name}</span>
                </div>
                {item.wine.year && (
                  <span className="text-xs text-muted-foreground">{item.wine.year}</span>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ajouté le {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
              {user && targetUserId === user.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromWishlist(item.wine_id);
                  }}
                  title="Retirer de la liste"
                >
                  <Bookmark className="h-4 w-4 fill-current" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchWishlist(page + 1)}
            disabled={loading}
          >
            {loading ? 'Chargement...' : 'Voir plus'}
          </Button>
        </div>
      )}

      {selectedWine && (
        <WineDetailsDialog
          wine={selectedWine}
          onClose={() => setSelectedWine(null)}
        />
      )}
    </div>
  );
};
