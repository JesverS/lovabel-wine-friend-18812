import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreateWineInDomainDialog } from './CreateWineInDomainDialog';

interface AddWineToEventDialogProps {
  eventId: string;
  domainId: string;
  domainName: string;
  onWineAdded: () => void;
}

export function AddWineToEventDialog({ eventId, domainId, domainName, onWineAdded }: AddWineToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open) {
      fetchInitialWines();
    }
  }, [open, domainId]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      handleSearchWine();
    } else if (searchQuery.trim().length === 0) {
      fetchInitialWines();
    }
  }, [searchQuery]);

  const fetchInitialWines = async () => {
    setSearchLoading(true);
    setShowResults(true);

    try {
      const { data, error } = await supabase
        .from('wine')
        .select(`
          *,
          domain:domain_id(id, name, logo_url),
          wine_type:type(id, type),
          wine_classification:wine_classification(id, nom, region)
        `)
        .eq('domain_id', domainId)
        .order('year', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchWine = async () => {
    if (!searchQuery.trim()) {
      fetchInitialWines();
      return;
    }

    setSearchLoading(true);
    setShowResults(true);

    try {
      const { data, error } = await (supabase as any).rpc('search_wines', {
        query: searchQuery.trim()
      });

      if (error) throw error;

      // Filter wines from this domain only
      const filteredResults = (data || []).filter((wine: any) => wine.domain_id === domainId);
      setSearchResults(filteredResults);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddWine = async (wine: any) => {
    setLoading(true);

    try {
      // Check if wine already exists in event
      const { data: existingData } = await supabase
        .from('event_domain_wine')
        .select('*')
        .eq('event_id', eventId)
        .eq('domain_id', domainId)
        .eq('wine_id', wine.id)
        .single();

      if (existingData) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Ce vin est déjà présent dans cet événement',
        });
        return;
      }

      // Add wine to event
      const { error: insertError } = await supabase
        .from('event_domain_wine')
        .insert({
          event_id: eventId,
          domain_id: domainId,
          wine_id: wine.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Succès',
        description: 'Vin ajouté à l\'événement',
      });

      setOpen(false);
      resetForm();
      onWineAdded();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'ajouter le vin",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un vin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un vin de {domainName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="wine-search">Rechercher un vin</Label>
            <Input
              id="wine-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom du vin ou année..."
              autoComplete="off"
            />
          </div>

          {showResults && (
            <div className="space-y-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">
                    Aucun vin trouvé dans ce domaine
                  </p>
                  <CreateWineInDomainDialog
                    eventId={eventId}
                    domainId={domainId}
                    domainName={domainName}
                    initialWineName={searchQuery}
                    onWineCreated={() => {
                      setOpen(false);
                      onWineAdded();
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {searchResults.map((wine) => (
                    <div
                      key={wine.id}
                      onClick={() => handleAddWine(wine)}
                      className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors"
                    >
                      {wine.label_url && (
                        <img
                          src={wine.label_url}
                          alt={wine.name}
                          className="w-full h-32 object-contain mb-2"
                        />
                      )}
                      <h4 className="font-semibold text-sm">{wine.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {wine.year && <span>{wine.year}</span>}
                        {wine.wine_type?.type && (
                          <>
                            {wine.year && <span>•</span>}
                            <span className="capitalize">{wine.wine_type.type}</span>
                          </>
                        )}
                        {wine.wine_classification?.nom && (
                          <>
                            <span>•</span>
                            <span>{wine.wine_classification.nom}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
