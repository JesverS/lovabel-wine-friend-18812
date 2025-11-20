import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateDomainForGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainCreated: (domain: any) => void;
}

const REGIONS = [
  "Alsace",
  "Beaujolais",
  "Bordeaux",
  "Bourgogne",
  "Champagne",
  "Corse",
  "Jura",
  "Languedoc-Roussillon",
  "Loire",
  "Provence",
  "Rhône",
  "Sud-Ouest",
];

export function CreateDomainForGameDialog({ open, onOpenChange, onDomainCreated }: CreateDomainForGameDialogProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !region) return;

    setLoading(true);
    try {
      const { data: domain, error } = await supabase
        .from("domain")
        .insert({
          name: name.trim(),
          region: region as any,
        })
        .select("id, name, region, logo_url")
        .single();

      if (error) throw error;

      toast.success("Domaine créé avec succès !");
      onDomainCreated(domain);

      // Reset form
      setName("");
      setRegion("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du domaine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 gap-4">
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
              Région viticole <span className="text-destructive">*</span>
            </Label>
            <Select value={region} onValueChange={setRegion} required>
              <SelectTrigger id="domain-region" className="h-11">
                <SelectValue placeholder="Sélectionnez une région" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              disabled={loading || !name.trim() || !region}
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
