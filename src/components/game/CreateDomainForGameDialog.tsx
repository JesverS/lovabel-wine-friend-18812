import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateDomainForGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDomainCreated: (domain: any) => void;
}

export function CreateDomainForGameDialog({ open, onOpenChange, onDomainCreated }: CreateDomainForGameDialogProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Le nom du domaine est requis");
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = null;

      // Upload du logo si présent
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `domain-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("wine-images").upload(filePath, logoFile);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("wine-images").getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      // Créer le domaine
      const { data, error } = await supabase
        .from("domain")
        .insert({
          name: name.trim(),
          region: region.trim() || null,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Domaine créé avec succès");
      onDomainCreated(data);

      // Reset form
      setName("");
      setRegion("");
      setLogoFile(null);
      setLogoPreview("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating domain:", error);
      toast.error("Erreur lors de la création du domaine");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau domaine</DialogTitle>
          <DialogDescription>Ajoutez les informations du domaine viticole</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Nom du domaine */}
          <div className="space-y-2">
            <Label htmlFor="domain-name">
              Nom du domaine <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domain-name"
              placeholder="Ex: Château Margaux"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Région */}
          <div className="space-y-2">
            <Label htmlFor="domain-region">Région</Label>
            <Input
              id="domain-region"
              placeholder="Ex: Bordeaux, Bourgogne..."
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo du domaine</Label>
            {!logoPreview ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">Cliquez pour télécharger un logo</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG jusqu'à 5MB</p>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
            ) : (
              <div className="relative border rounded-lg p-4 flex items-center gap-3">
                <img src={logoPreview} alt="Preview" className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{logoFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {logoFile && `${(logoFile.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeLogo}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-wine hover:opacity-90" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
