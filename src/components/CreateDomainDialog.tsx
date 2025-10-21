import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateDomainDialogProps {
  onDomainCreated: (domain: any) => void;
  initialName?: string;
}

export function CreateDomainDialog({ onDomainCreated, initialName = '' }: CreateDomainDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "L'image ne doit pas dépasser 5 Mo",
      });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);

    try {
      let logoUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('domain')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('domain')
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      }

      // Create domain
      const { data: newDomain, error: domainError } = await supabase
        .from('domain')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (domainError) throw domainError;

      // Link user to the newly created domain
      const { error: userDomainError } = await supabase
        .from('user_domain')
        .insert({
          user_id: user.id,
          domain_id: newDomain.id,
          role: 0,
        });

      if (userDomainError) throw userDomainError;

      toast({
        title: 'Succès',
        description: 'Domaine créé avec succès',
      });

      setOpen(false);
      resetForm();
      onDomainCreated(newDomain);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le domaine',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(initialName);
    setDescription('');
    setLogoFile(null);
    setLogoPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Créer le domaine "{name || 'nouveau'}"
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un nouveau domaine</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateDomain} className="space-y-4">
          <div>
            <Label htmlFor="domain-name">Nom du domaine *</Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Château Margaux"
              required
            />
          </div>

          <div>
            <Label htmlFor="domain-description">Description</Label>
            <Textarea
              id="domain-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du domaine..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="domain-logo">Logo</Label>
            <div className="flex items-center gap-4">
              <label htmlFor="domain-logo" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors text-center">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-24 h-24 object-contain mx-auto"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour ajouter
                      </p>
                    </div>
                  )}
                </div>
              </label>
              <input
                id="domain-logo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || !name.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer le domaine'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
