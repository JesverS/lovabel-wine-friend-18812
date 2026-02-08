import { useState, useEffect, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REGIONS } from "@/lib/regionUtils";

interface CreateDomainSimpleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainCreated: (domain: any) => void;
  initialName?: string;
}

export function CreateDomainSimpleDialog({ open, onOpenChange, onDomainCreated, initialName = "" }: CreateDomainSimpleDialogProps) {
  const [name, setName] = useState(initialName);
  const [region, setRegion] = useState("");
  const [customRegion, setCustomRegion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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

        <form onSubmit={handleCreate} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="domain-simple-name" className="text-sm font-medium">
              Nom du domaine <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domain-simple-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Château Margaux"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain-simple-region" className="text-sm font-medium">
              Région viticole
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="domain-simple-region" className="h-11">
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

          {region === "other" && (
            <div className="space-y-2">
              <Label htmlFor="domain-simple-custom-region" className="text-sm font-medium">
                Nom de la région <span className="text-destructive">*</span>
              </Label>
              <Input
                id="domain-simple-custom-region"
                value={customRegion}
                onChange={(e) => setCustomRegion(e.target.value)}
                placeholder="Ex: Savoie, Lorraine..."
                className="h-11"
                required
              />
            </div>
          )}

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
