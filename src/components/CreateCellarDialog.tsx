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
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateCellarDialogProps {
  onCellarCreated: () => void;
}

export function CreateCellarDialog({ onCellarCreated }: CreateCellarDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let logoUrl = null;
      let bannerUrl = null;

      // Create cellar first to get the ID
      const { data: cellarData, error: cellarError } = await supabase
        .from('cellar' as any)
        .insert({
          name,
          description: description || null,
          location: location || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          is_public: isPublic,
          is_seller: isSeller,
        })
        .select()
        .single();

      if (cellarError) throw cellarError;

      const cellarId = (cellarData as any).id;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${cellarId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        logoUrl = data.publicUrl;
      }

      // Upload banner if provided
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `banner-${Date.now()}.${fileExt}`;
        const filePath = `${cellarId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, bannerFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        bannerUrl = data.publicUrl;
      }

      // Update cellar with image URLs if any
      if (logoUrl || bannerUrl) {
        const updateData: any = {};
        if (logoUrl) updateData.logo_url = logoUrl;
        if (bannerUrl) updateData.banner_url = bannerUrl;

        const { error: updateError } = await supabase
          .from('cellar' as any)
          .update(updateData)
          .eq('id', cellarId);

        if (updateError) throw updateError;
      }

      // Create user_cellar relationship with owner role
      const { error: userCellarError } = await supabase
        .from('user_cellar' as any)
        .insert({
          user_id: user.id,
          user_cellar_id: cellarId,
          role: 'owner',
        });

      if (userCellarError) throw userCellarError;

      toast({
        title: 'Succès',
        description: 'Cave créée avec succès',
      });

      setOpen(false);
      resetForm();
      onCellarCreated();
    } catch (error: any) {
      console.error('Error creating cellar:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la cave',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLocation('');
    setLatitude('');
    setLongitude('');
    setIsPublic(false);
    setIsSeller(false);
    setLogoFile(null);
    setBannerFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Créer une cave
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle cave</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la cave *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma Cave"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre cave..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="location">Adresse</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="123 Rue du Vin, 75001 Paris"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="48.8566"
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="2.3522"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logo">Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Image carrée recommandée (ex: 400x400px)
            </p>
          </div>

          <div>
            <Label htmlFor="banner">Bannière</Label>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format paysage recommandé (ex: 1200x400px)
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_public">Cave publique</Label>
              <p className="text-sm text-muted-foreground">
                Visible par tous les utilisateurs
              </p>
            </div>
            <Switch
              id="is_public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_seller">Cave vendeuse</Label>
              <p className="text-sm text-muted-foreground">
                Apparaît dans la liste des cavistes
              </p>
            </div>
            <Switch
              id="is_seller"
              checked={isSeller}
              onCheckedChange={setIsSeller}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer la cave'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
