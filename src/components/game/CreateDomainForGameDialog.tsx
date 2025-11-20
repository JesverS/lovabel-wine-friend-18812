import { useState, FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function CreateDomainForGameDialog({
  open,
  onOpenChange,
  onDomainCreated,
}: CreateDomainForGameDialogProps) {
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

      toast.success("Domaine créé !");
      onDomainCreated(domain);
      setName("");
      setRegion("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du domaine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau domaine</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateDomain} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="domain-name">Nom du domaine *</Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Château Margaux"
              required
            />
          </div>

          {/* Région */}
          <div className="space-y-2">
            <Label htmlFor="domain-region">Région *</Label>
            <Select value={region} onValueChange={setRegion} required>
              <SelectTrigger id="domain-region">
                <SelectValue placeholder="Sélectionner une région" />
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

          <Button type="submit" className="w-full" disabled={loading || !name.trim() || !region}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer le domaine"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
