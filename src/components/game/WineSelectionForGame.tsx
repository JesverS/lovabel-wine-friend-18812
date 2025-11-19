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
      const { data, error } = await supabase.rpc("search_wines_game", { query }).limit(10);

      if (error) throw error;

      // Transformer les données pour correspondre au format attendu
      const formattedData = data?.map((item: any) => ({
        id: item.id,
        name: item.wine_name,
        year: item.wine_year,
        label_url: "", // search_wines_game ne retourne pas l'URL du label
        domain: {
          id: "",
          name: item.domain_name,
          logo_url: "",
          region: null,
        },
        wine_type: {
          id: 0,
          type: "",
        },
      }));

      setWines(formattedData || []);
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
      <div className="space-y-3">
        <Label>Sélectionnez une bouteille</Label>

        {/* Input de recherche */}
        <div className="relative">
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

        {/* Liste scrollable */}
        <ScrollArea className="max-h-[50vh] rounded-md border">
          {wines.length === 0 && !loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Aucune bouteille trouvée
            </div>
          ) : (
            wines.map((wine) => <WineListItem key={wine.id} wine={wine} onSelect={onWineSelected} />)
          )}

          {/* Bouton création toujours visible */}
          <Button
            variant="ghost"
            className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 border-t"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer une nouvelle bouteille
          </Button>
        </ScrollArea>
      </div>

      <CreateWineForGameDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onWineCreated={handleWineCreated}
      />
    </>
  );
}
