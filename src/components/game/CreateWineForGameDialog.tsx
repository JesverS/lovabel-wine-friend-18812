import { useState, FormEvent, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateDomainForGameDialog } from "./CreateDomainForGameDialog";

interface CreateWineForGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWineCreated: (wine: any) => void;
}

export function CreateWineForGameDialog({
  open,
  onOpenChange,
  onWineCreated,
}: CreateWineForGameDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [domainSearch, setDomainSearch] = useState("");
  const [domains, setDomains] = useState<any[]>([]);
  const [searchingDomains, setSearchingDomains] = useState(false);
  const [createDomainOpen, setCreateDomainOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [wineData, setWineData] = useState({
    name: "",
    year: new Date().getFullYear(),
    labelFile: null as File | null,
    labelPreview: "",
    cepages: "",
    wineTypeId: 1, // rouge par défaut
  });

  // Recherche de domaines
  const searchDomains = async (query: string) => {
    if (!query.trim()) {
      setDomains([]);
      return;
    }

    setSearchingDomains(true);
    try {
      const { data, error } = await supabase.rpc("search_domains", { query });
      if (error) throw error;
      setDomains(data || []);
    } catch (error: any) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearchingDomains(false);
    }
  };

  const handleDomainSearchChange = (value: string) => {
    setDomainSearch(value);
    if (value.length >= 2) {
      searchDomains(value);
    } else {
      setDomains([]);
    }
  };

  const handleSelectDomain = (domain: any) => {
    setSelectedDomain(domain);
    setStep(2);
  };

  const handleDomainCreated = (domain: any) => {
    setSelectedDomain(domain);
    setStep(2);
    setCreateDomainOpen(false);
  };

  const handleLabelSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWineData((prev) => ({ ...prev, labelFile: file }));

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setWineData((prev) => ({ ...prev, labelPreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateWine = async (e: FormEvent) => {
    e.preventDefault();
    if (!wineData.labelFile || !selectedDomain) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload photo vers storage/domain/{domain_id}/
      const fileExt = wineData.labelFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${selectedDomain.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("domain").upload(filePath, wineData.labelFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("domain").getPublicUrl(filePath);

      // 2. Créer la bouteille avec is_playable = true
      const { data: wine, error: wineError } = await supabase
        .from("wine")
        .insert({
          domain_id: selectedDomain.id,
          name: wineData.name.trim(),
          year: wineData.year,
          label_url: publicUrl,
          type: wineData.wineTypeId,
          is_playable: true,
          cepages: wineData.cepages ? { cepages: wineData.cepages } : null,
        })
        .select(
          `
          id, name, year, label_url,
          domain:domain_id(id, name, logo_url, region),
          wine_type:type(id, type)
        `
        )
        .single();

      if (wineError) throw wineError;

      toast.success("Bouteille créée avec succès !");

      // 3. Callback avec la nouvelle bouteille
      onWineCreated(wine);

      // 4. Fermer et reset
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDomain(null);
    setDomainSearch("");
    setDomains([]);
    setWineData({
      name: "",
      year: new Date().getFullYear(),
      labelFile: null,
      labelPreview: "",
      cepages: "",
      wineTypeId: 1,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Étape 1 : Sélectionner le domaine</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Recherche domaine */}
                <div className="space-y-2">
                  <Label>Rechercher un domaine</Label>
                  <Input
                    placeholder="Tapez au moins 2 caractères..."
                    value={domainSearch}
                    onChange={(e) => handleDomainSearchChange(e.target.value)}
                  />
                </div>

                {/* Résultats */}
                {domains.length > 0 && (
                  <ScrollArea className="max-h-[200px] rounded-md border">
                    {domains.map((domain) => (
                      <div
                        key={domain.id}
                        onClick={() => handleSelectDomain(domain)}
                        className="flex items-center gap-2 p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                      >
                        <img
                          src={domain.logo_url || "/placeholder.svg"}
                          className="w-8 h-8 rounded object-cover"
                          alt={domain.name}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{domain.name}</div>
                          {domain.region && <div className="text-xs text-muted-foreground">{domain.region}</div>}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}

                {searchingDomains && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Recherche...
                  </div>
                )}

                {/* Bouton création */}
                <Button variant="outline" className="w-full" onClick={() => setCreateDomainOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un nouveau domaine
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Étape 2 : Nouvelle bouteille</DialogTitle>
                <DialogDescription>Domaine : {selectedDomain?.name}</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateWine} className="space-y-4">
                {/* Nom */}
                <div className="space-y-2">
                  <Label htmlFor="wine-name">Nom de la bouteille *</Label>
                  <Input
                    id="wine-name"
                    value={wineData.name}
                    onChange={(e) => setWineData({ ...wineData, name: e.target.value })}
                    required
                    placeholder="Ex: Cuvée Prestige"
                  />
                </div>

                {/* Année */}
                <div className="space-y-2">
                  <Label htmlFor="wine-year">Année *</Label>
                  <Input
                    id="wine-year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={wineData.year}
                    onChange={(e) => setWineData({ ...wineData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>

                {/* Type de vin */}
                <div className="space-y-2">
                  <Label htmlFor="wine-type">Type de vin *</Label>
                  <Select
                    value={wineData.wineTypeId.toString()}
                    onValueChange={(v) => setWineData({ ...wineData, wineTypeId: parseInt(v) })}
                  >
                    <SelectTrigger id="wine-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Rouge</SelectItem>
                      <SelectItem value="2">Blanc</SelectItem>
                      <SelectItem value="5">Rosé</SelectItem>
                      <SelectItem value="3">Champagne</SelectItem>
                      <SelectItem value="4">Crémant</SelectItem>
                      <SelectItem value="6">Prosecco</SelectItem>
                      <SelectItem value="7">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Photo (OBLIGATOIRE) */}
                <div className="space-y-2">
                  <Label htmlFor="wine-photo">Photo de la bouteille *</Label>
                  <Input
                    id="wine-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleLabelSelect}
                    required
                  />
                  {wineData.labelPreview && (
                    <img src={wineData.labelPreview} className="mt-2 w-32 h-32 object-cover rounded" alt="Preview" />
                  )}
                </div>

                {/* Cépages (optionnel) */}
                <div className="space-y-2">
                  <Label htmlFor="wine-cepages">Cépages (optionnel)</Label>
                  <Textarea
                    id="wine-cepages"
                    placeholder="Ex: Cabernet Sauvignon 60%, Merlot 40%"
                    value={wineData.cepages}
                    onChange={(e) => setWineData({ ...wineData, cepages: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                  <Button type="submit" disabled={uploading} className="flex-1">
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer la bouteille"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreateDomainForGameDialog
        open={createDomainOpen}
        onOpenChange={setCreateDomainOpen}
        onDomainCreated={handleDomainCreated}
      />
    </>
  );
}
