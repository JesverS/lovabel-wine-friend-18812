import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WineListItem } from "./WineListItem";
import { CreateWineForGameDialog } from "./CreateWineForGameDialog";

interface WineSelectionForGameProps {
  onWineSelected: (wine: any) => void;
}

export function WineSelectionForGame({ onWineSelected }: WineSelectionForGameProps) {
  const [wines, setWines] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Charger les 5 premières bouteilles au montage
  useEffect(() => {
    if (!hasInteracted) return;
    loadInitialWines();
  }, [hasInteracted]);

  // Recherche avec debounce
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchWines(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchQuery.length === 0 && hasInteracted) {
      loadInitialWines();
    }
  }, [searchQuery]);

  const loadInitialWines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wine")
        .select(
          `
          id, name, year, label_url,
          domain:domain_id(id, name, logo_url, region),
          wine_type:type(id, type)
        `,
        )
        .eq("is_playable", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setWines(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des vins");
    } finally {
      setLoading(false);
    }
  };

  const searchWines = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_wines", { query }).limit(10);

      if (error) throw error;

      setWines(data || []);
    } catch (error: any) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleWineCreated = (wine: any) => {
    // Ajouter le nouveau vin en tête de liste
    setWines((prev) => [wine, ...prev]);
    // Pré-sélectionner automatiquement
    onWineSelected(wine);
    setCreateDialogOpen(false);
  };

  return (
    <>
      {/* Container avec hauteur fixe et espacement mobile */}
      <div className="flex flex-col h-[420px] px-2 md:px-0">
        <Label className="mb-3">Sélectionnez une bouteille</Label>

        {/* Input de recherche - fixe en haut */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            onFocus={() => setHasInteracted(true)}
            placeholder="Rechercher une bouteille..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Container avec bordure pour liste + bouton */}
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-background">
          {/* Zone scrollable - prend l'espace restant */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {wines.length === 0 && !loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  Aucune bouteille trouvée
                </div>
              ) : (
                wines.map((wine) => (
                  <div
                    key={wine.id}
                    onClick={() => onWineSelected(wine)}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {/* Logo du domaine */}
                    <div className="flex-shrink-0">
                      <img
                        src={wine.domain?.logo_url || wine.label_url || "/placeholder.svg"}
                        alt={wine.domain?.name || wine.name}
                        className="w-12 h-12 rounded-md object-cover border"
                      />
                    </div>

                    {/* Informations */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{wine.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {wine.domain?.name && (
                          <>
                            <span className="truncate">{wine.domain.name}</span>
                            {wine.domain?.region && (
                              <>
                                <span>•</span>
                                <span className="truncate">{wine.domain.region}</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {wine.year && <div className="text-xs text-muted-foreground mt-0.5">Millésime {wine.year}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Bouton créer - TOUJOURS visible en bas */}
          <div className="border-t bg-background">
            <Button
              variant="ghost"
              className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 rounded-none"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une nouvelle bouteille
            </Button>
          </div>
        </div>
      </div>

      <CreateWineForGameDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onWineCreated={handleWineCreated}
      />
    </>
  );
}
