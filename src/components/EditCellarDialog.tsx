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
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EditCellarDialogProps {
  cellar: any;
  onCellarUpdated: () => void;
}

export function EditCellarDialog({ cellar, onCellarUpdated }: EditCellarDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(cellar.name);
  const [description, setDescription] = useState(cellar.description || '');
  const [location, setLocation] = useState(cellar.location || '');
  const [isPublic, setIsPublic] = useState(cellar.is_public);
  const [isSeller, setIsSeller] = useState(cellar.is_seller);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('cellar' as any)
      .update({
        name,
        description,
        location,
        is_public: isPublic,
        is_seller: isSeller,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cellar.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la cave',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Cave mise à jour',
      });
      setOpen(false);
      onCellarUpdated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la cave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la cave *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="location">Adresse</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_public">Cave publique</Label>
            <Switch
              id="is_public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_seller">Vendeur</Label>
            <Switch
              id="is_seller"
              checked={isSeller}
              onCheckedChange={setIsSeller}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
