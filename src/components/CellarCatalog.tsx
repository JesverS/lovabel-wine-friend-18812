import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wine, Search, ShoppingCart } from 'lucide-react';
import { AddWineDialog } from './AddWineDialog';
import { EditWineInCellarDialog } from './EditWineInCellarDialog';

interface Wine {
  wine_id: string;
  cellar_id: string;
  quantity: number;
  label_url: string | null;
  description: string | null;
  wine: {
    id: string;
    name: string;
    year: number | null;
    volume_ml: number | null;
    price: number | null;
    description: string | null;
    label_url: string | null;
    uber_order_url: string | null;
    website_order_url: string | null;
  };
}

interface CellarCatalogProps {
  cellarId: string;
  isOwner: boolean;
}

export function CellarCatalog({ cellarId, isOwner }: CellarCatalogProps) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWines();
  }, [cellarId]);

  const fetchWines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cellar_wine' as any)
      .select(`
        wine_id,
        cellar_id,
        quantity,
        label_url,
        description,
        wine:wine_id (
          id,
          name,
          year,
          volume_ml,
          price,
          description,
          label_url,
          uber_order_url,
          website_order_url
        )
      `)
      .eq('cellar_id', cellarId);

    if (error) {
      console.error('Error fetching wines:', error);
    } else {
      setWines(data as any || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <p>Chargement du catalogue...</p>;
  }

  return (
    <div>
      {/* AI Search Prompt */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Pour quelle occasion cherchez-vous un vin ?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Rechercher
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Décrivez votre besoin et nous vous suggérerons les meilleurs vins
          </p>
        </CardContent>
      </Card>

      {/* Add Wine Button (Owner Only) */}
      {isOwner && (
        <div className="mb-6">
          <AddWineDialog cellarId={cellarId} onWineAdded={fetchWines} />
        </div>
      )}

      {/* Wine Catalog */}
      {wines.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun vin dans le catalogue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wines.map((item) => (
            <Card key={item.wine_id} className="overflow-hidden">
              <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                <img
                  src={item.label_url || item.wine.label_url || '/placeholder.svg'}
                  alt={item.wine.name}
                  className="w-full h-full object-cover"
                />
                {isOwner && (
                  <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-sm">
                    Stock: {item.quantity}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1">{item.wine.name}</h3>
                {item.wine.year && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Année: {item.wine.year}
                  </p>
                )}
                {(item.description || item.wine.description) && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {item.description || item.wine.description}
                  </p>
                )}
                {item.wine.volume_ml && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.wine.volume_ml}ml
                  </p>
                )}
                {item.wine.price && (
                  <p className="text-lg font-bold text-primary mb-4">
                    {item.wine.price}€
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {isOwner && (
                    <EditWineInCellarDialog wineData={item} onUpdated={fetchWines} />
                  )}
                  {item.wine.uber_order_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.wine.uber_order_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Acheter sur Uber Eats
                      </a>
                    </Button>
                  )}
                  {item.wine.website_order_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.wine.website_order_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Acheter sur le site
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
