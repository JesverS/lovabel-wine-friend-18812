import { useState } from 'react';
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
import { Plus, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreateDomainSimpleDialog } from './CreateDomainSimpleDialog';

interface AddDomainToEventDialogProps {
  eventId: string;
  onDomainAdded: () => void;
}

export function AddDomainToEventDialog({ eventId, onDomainAdded }: AddDomainToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [domainSearch, setDomainSearch] = useState('');
  const [domainResults, setDomainResults] = useState<any[]>([]);
  const [showDomainResults, setShowDomainResults] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [createDomainOpen, setCreateDomainOpen] = useState(false);

  const searchDomains = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setDomainResults([]);
      setShowDomainResults(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc('search_domains', {
        query: query.trim()
      });

      if (error) throw error;
      setDomainResults(data || []);
      setShowDomainResults(true);
    } catch (error) {
      console.error('Error searching domains:', error);
      setDomainResults([]);
      setShowDomainResults(true);
    }
  };

  const handleDomainSearch = (value: string) => {
    setDomainSearch(value);
    setSelectedDomain(null);
    if (value.trim().length >= 2) {
      searchDomains(value);
    } else {
      setDomainResults([]);
      setShowDomainResults(false);
    }
  };

  const handleSelectDomain = (domain: any) => {
    setSelectedDomain(domain);
    setDomainSearch(domain.name);
    setShowDomainResults(false);
  };

  const handleAddDomain = async () => {
    if (!selectedDomain) return;

    setLoading(true);

    try {
      // Check if domain already exists in event
      const { data: existingData } = await supabase
        .from('event_domain')
        .select('*')
        .eq('event_id', eventId)
        .eq('domain_id', selectedDomain.id)
        .single();

      if (existingData) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Ce domaine est déjà présent dans cet événement',
        });
        return;
      }

      // Add domain to event
      const { error: insertError } = await supabase
        .from('event_domain')
        .insert({
          event_id: eventId,
          domain_id: selectedDomain.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Succès',
        description: 'Domaine ajouté à l\'événement',
      });

      setOpen(false);
      resetForm();
      onDomainAdded();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'ajouter le domaine",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDomainSearch('');
    setDomainResults([]);
    setShowDomainResults(false);
    setSelectedDomain(null);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un domaine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un domaine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="domain-search">Rechercher un domaine</Label>
            <div className="relative">
              <Input
                id="domain-search"
                value={domainSearch}
                onChange={(e) => handleDomainSearch(e.target.value)}
                placeholder="Nom du domaine..."
                autoComplete="off"
              />
              {selectedDomain && (
                <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
              )}
            </div>

            {showDomainResults && (
              <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                {domainResults.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Aucun domaine trouvé
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateDomainOpen(true)}
                    >
                      Créer un nouveau domaine
                    </Button>
                  </div>
                ) : (
                  domainResults.map((domain) => (
                    <div
                      key={domain.id}
                      onClick={() => handleSelectDomain(domain)}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                    >
                      {domain.logo_url && (
                        <img
                          src={domain.logo_url}
                          alt={domain.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{domain.name}</p>
                        {domain.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {domain.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleAddDomain}
            disabled={loading || !selectedDomain}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout...
              </>
            ) : (
              'Ajouter'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <CreateDomainSimpleDialog
      open={createDomainOpen}
      onOpenChange={setCreateDomainOpen}
      onDomainCreated={(domain) => {
        setSelectedDomain(domain);
        setDomainSearch(domain.name);
        setShowDomainResults(false);
        setCreateDomainOpen(false);
        onDomainAdded();
      }}
      initialName={domainSearch}
    />
    </>
  );
}
