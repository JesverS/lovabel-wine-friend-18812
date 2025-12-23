import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REGIONS } from "@/lib/regionUtils";

interface CreateDomainForGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainCreated: (domain: any) => void;
}

export function CreateDomainForGameDialog({ open, onOpenChange, onDomainCreated }: CreateDomainForGameDialogProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [customRegion, setCustomRegion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Si "other" est sélectionné mais pas de région personnalisée
    if (region === "other" && !customRegion.trim()) {
      toast.error("Veuillez saisir le nom de la région");
      return;
    }

    setLoading(true);
    try {
      const { data: domain, error } = await supabase
        .from("domain")
        .insert({
          name: name.trim(),
          region: region ? (region as any) : null,
          custom_region: region === "other" ? customRegion.trim() : null,
        })
        .select("id, name, region, custom_region, logo_url")
        .single();

      if (error) throw error;

      toast.success("Domaine créé avec succès !");
      onDomainCreated(domain);

      // Reset form
      setName("");
      setRegion("");
      setCustomRegion("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du domaine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl">Créer un nouveau domaine</DialogTitle>
          <DialogDescription>Ajoutez les informations du domaine viticole</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateDomain} className="space-y-5 mt-2">
          {/* Nom du domaine */}
          <div className="space-y-2">
            <Label htmlFor="domain-name" className="text-sm font-medium">
              Nom du domaine <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Château Margaux"
              className="h-11"
              required
            />
          </div>

          {/* Région */}
          <div className="space-y-2">
            <Label htmlFor="domain-region" className="text-sm font-medium">
              Région viticole
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="domain-region" className="h-11">
                <SelectValue placeholder="Sélectionnez une région" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Champ personnalisé si "Autre" est sélectionné */}
          {region === "other" && (
            <div className="space-y-2">
              <Label htmlFor="custom-region" className="text-sm font-medium">
                Nom de la région <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-region"
                value={customRegion}
                onChange={(e) => setCustomRegion(e.target.value)}
                placeholder="Ex: Savoie, Lorraine..."
                className="h-11"
                required
              />
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-wine hover:opacity-90"
              disabled={loading || !name.trim() || (region === "other" && !customRegion.trim())}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le domaine"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}