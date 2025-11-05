import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress } from '@/lib/utils';
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
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateCellarDialogProps {
  onCellarCreated: () => void;
}

export function CreateCellarDialog({ onCellarCreated }: CreateCellarDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');

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
        description: 'L\'image ne doit pas dépasser 5 Mo',
      });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        description: 'L\'image ne doit pas dépasser 5 Mo',
      });
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let logoUrl = null;
      let bannerUrl = null;

      // Upload images first if provided
      if (logoFile || bannerFile) {
        setUploadingImages(true);
      }

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-logo.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      }

      // Upload banner if provided
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${Date.now()}-banner.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, bannerFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        bannerUrl = urlData.publicUrl;
      }

      setUploadingImages(false);

      // Geocode address if provided
      let latitude = null;
      let longitude = null;
      if (location) {
        const coords = await geocodeAddress(location);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      }

      // Create cellar with all data including image URLs
      const { data: cellarData, error: cellarError } = await supabase
        .from('cellar' as any)
        .insert({
          name,
          description: description || null,
          location: location || null,
          latitude,
          longitude,
          is_public: isPublic,
          is_seller: isSeller,
          logo_url: logoUrl,
          banner_url: bannerUrl,
        })
        .select()
        .single();

      if (cellarError) throw cellarError;

      const cellarId = (cellarData as any).id;

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
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLocation('');
    setIsPublic(false);
    setIsSeller(false);
    setLogoFile(null);
    setLogoPreview('');
    setBannerFile(null);
    setBannerPreview('');
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
            <p className="text-xs text-muted-foreground mt-1">
              Les coordonnées seront calculées automatiquement à partir de l'adresse
            </p>
          </div>

          <div className="space-y-2">
            <Label>Logo (optionnel)</Label>
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={handleRemoveLogo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Ajouter un logo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Image carrée recommandée • Max 5 Mo
                  </p>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Bannière (optionnel)</Label>
            {bannerPreview ? (
              <div className="relative">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveBanner}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerSelect}
                  className="hidden"
                  id="banner-upload"
                />
                <label htmlFor="banner-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Ajouter une bannière
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format paysage recommandé • Max 5 Mo
                  </p>
                </label>
              </div>
            )}
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
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading || uploadingImages ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingImages ? 'Upload en cours...' : 'Création...'}
                </>
              ) : (
                'Créer la cave'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
