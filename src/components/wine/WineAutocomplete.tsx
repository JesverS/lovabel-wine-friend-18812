import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

// Mapping ID type vers label pour affichage
const WINE_TYPE_LABELS: Record<number, string> = {
  1: 'Rouge',
  2: 'Blanc',
  5: 'Rosé',
  7: 'Autre',
  8: 'Effervescent',
};

interface WineAutocompleteProps {
  domainId?: string;
  onSelect: (wine: any) => void;
  onCreateWine?: (query: string) => void;
  placeholder?: string;
  label?: string;
}

const DEFAULT_IMAGE = 'https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png';

export function WineAutocomplete({ 
  domainId, 
  onSelect,
  onCreateWine,
  placeholder = "Rechercher un vin...",
  label = "Rechercher un vin"
}: WineAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [wines, setWines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [initialWines, setInitialWines] = useState<any[]>([]);

  useEffect(() => {
    if (domainId) {
      fetchInitialWines();
    }
  }, [domainId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchWines();
    } else if (searchQuery.length === 0) {
      setWines(initialWines);
      setShowResults(true);
    } else {
      setWines([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  const fetchInitialWines = async () => {
    if (!domainId) return;

    try {
      let query = supabase
        .from('wine')
        .select(`
          *,
          domain:domain_id(id, name, logo_url)
        `)
        .eq('domain_id', domainId)
        .order('year', { ascending: false })
        .limit(5);

      const { data, error } = await query;

      if (error) throw error;
      
      const formattedWines = (data || []).map((wine: any) => ({
        ...wine,
        label_url: wine.label_url || DEFAULT_IMAGE,
      }));

      setInitialWines(formattedWines);
      setWines(formattedWines);
    } catch (error) {
      console.error('Error fetching initial wines:', error);
    }
  };

  const searchWines = async () => {
    setLoading(true);
    setShowResults(true);

    try {
      let query = supabase
        .from('wine')
        .select(`
          *,
          domain:domain_id(id, name, logo_url)
        `);

      if (domainId) {
        query = query.eq('domain_id', domainId);
      }

      // Recherche sur nom, année
      query = query.or(`name.ilike.%${searchQuery}%,year.eq.${parseInt(searchQuery) || 0}`);

      query = query.order('year', { ascending: false }).limit(5);

      const { data, error } = await query;

      if (error) throw error;

      const formattedWines = (data || []).map((wine: any) => ({
        ...wine,
        label_url: wine.label_url || DEFAULT_IMAGE,
      }));

      setWines(formattedWines);
    } catch (error) {
      console.error('Error searching wines:', error);
      setWines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWine = (wine: any) => {
    onSelect(wine);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="wine-autocomplete">{label}</Label>
      <Input
        id="wine-autocomplete"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => {
          if (wines.length > 0) {
            setShowResults(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
          <ScrollArea className="max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : wines.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery.length === 0 ? "Commencez à taper pour rechercher..." : "Aucun vin trouvé"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {wines.map((wine) => (
                  <button
                    key={wine.id}
                    onClick={() => handleSelectWine(wine)}
                    className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors text-left"
                  >
                    <img
                      src={wine.label_url}
                      alt={wine.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{wine.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {wine.domain?.name && <span>{wine.domain.name}</span>}
                        {wine.year && <span>• {wine.year}</span>}
                        {wine.type && WINE_TYPE_LABELS[wine.type] && (
                          <span>• {WINE_TYPE_LABELS[wine.type]}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}