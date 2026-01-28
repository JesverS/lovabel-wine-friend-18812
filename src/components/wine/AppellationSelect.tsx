import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, ChevronDown, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Appellation {
  id: number;
  nom: string;
  region: string | null;
  pays: string;
  type_vin_suggere: string | null;
}

interface AppellationSelectProps {
  value: number | null;
  onChange: (id: number | null, appellation?: Appellation) => void;
  wineTypeId?: number | null; // ID du type de vin (vers wine_type.id)
  label?: string;
  required?: boolean;
  allowCreate?: boolean;
  className?: string;
}

// Mapping des IDs vers les textes pour filtrer les appellations
const WINE_TYPE_ID_TO_TEXT: Record<number, string> = {
  1: 'rouge',
  2: 'blanc',
  5: 'rosé',
  7: 'autre',
  8: 'effervescent',
};

export function AppellationSelect({
  value,
  onChange,
  wineTypeId,
  label = 'Appellation',
  required = false,
  allowCreate = true,
  className = '',
}: AppellationSelectProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [appellations, setAppellations] = useState<Appellation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppellation, setSelectedAppellation] = useState<Appellation | null>(null);

  // Convertir l'ID en texte pour le filtrage
  const wineTypeText = wineTypeId ? WINE_TYPE_ID_TO_TEXT[wineTypeId] : undefined;

  // Charger l'appellation sélectionnée au montage
  useEffect(() => {
    if (value && !selectedAppellation) {
      loadSelectedAppellation(value);
    }
  }, [value]);

  // Charger les appellations quand le popover s'ouvre ou que le type change
  useEffect(() => {
    if (open) {
      loadAppellations();
    }
  }, [open, wineTypeId, search]);

  const loadSelectedAppellation = async (id: number) => {
    const { data } = await supabase
      .from('appellation')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setSelectedAppellation(data);
    }
  };

  const loadAppellations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appellation')
        .select('*')
        .order('nom');

      // Recherche simple par nom (insensible aux accents via normalized_nom)
      if (search.trim()) {
        query = query.ilike('normalized_nom', `%${search.toLowerCase()}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setAppellations(data || []);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des appellations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (appellation: Appellation) => {
    setSelectedAppellation(appellation);
    onChange(appellation.id, appellation);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedAppellation(null);
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11 font-normal"
          >
            {selectedAppellation ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate">{selectedAppellation.nom}</span>
                {selectedAppellation.region && (
                  <span className="text-xs text-muted-foreground truncate">
                    ({selectedAppellation.region})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Sélectionner une appellation...</span>
            )}
            <div className="flex items-center gap-1 flex-shrink-0">
              {selectedAppellation && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          {/* Recherche */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Liste */}
          <ScrollArea className="max-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : appellations.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Aucune appellation trouvée
              </div>
            ) : (
              <div className="p-1">
                {appellations.map((appellation) => (
                  <button
                    key={appellation.id}
                    onClick={() => handleSelect(appellation)}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between"
                  >
                    <span>{appellation.nom}</span>
                    {appellation.region && (
                      <span className="text-xs text-muted-foreground">
                        {appellation.region}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Créer nouvelle */}
          {allowCreate && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer une appellation
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Dialog création */}
      <CreateAppellationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        suggestedType={wineTypeText}
        initialName={search}
        onCreated={(appellation) => {
          handleSelect(appellation);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

// Dialog interne pour créer une appellation
interface CreateAppellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedType?: string;
  initialName?: string;
  onCreated: (appellation: Appellation) => void;
}

function CreateAppellationDialog({
  open,
  onOpenChange,
  suggestedType,
  initialName = '',
  onCreated,
}: CreateAppellationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState(initialName);
  const [region, setRegion] = useState('');
  const [pays, setPays] = useState('France');

  useEffect(() => {
    if (open) {
      setNom(initialName);
    }
  }, [open, initialName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appellation')
        .insert({
          nom: nom.trim(),
          region: region.trim() || null,
          pays: pays.trim() || 'France',
          type_vin_suggere: suggestedType || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Cette appellation existe déjà');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Appellation créée');
      onCreated(data);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNom('');
    setRegion('');
    setPays('France');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Créer une appellation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appellation-nom">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="appellation-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Côtes du Rhône"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appellation-region">Région</Label>
            <Input
              id="appellation-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Ex: Rhône"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appellation-pays">Pays</Label>
            <Input
              id="appellation-pays"
              value={pays}
              onChange={(e) => setPays(e.target.value)}
              placeholder="France"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !nom.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
