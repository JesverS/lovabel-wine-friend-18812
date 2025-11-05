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
import { ImageCropDialog } from './ImageCropDialog';

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
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [selectedLogoImage, setSelectedLogoImage] = useState<string | null>(null);
  const [selectedBannerImage, setSelectedBannerImage] = useState<string | null>(null);
  const [cropLogoDialogOpen, setCropLogoDialogOpen] = useState(false);
  const [cropBannerDialogOpen, setCropBannerDialogOpen] = useState(false);
  const [newLogoBlob, setNewLogoBlob] = useState<Blob | null>(null);
  const [newBannerBlob, setNewBannerBlob] = useState<Blob | null>(null);

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

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedLogoImage(reader.result as string);
      setCropLogoDialogOpen(true);
    };
    reader.readAsDataURL(file);
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
        description: "L'image ne doit pas dépasser 5 Mo",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedBannerImage(reader.result as string);
      setCropBannerDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoCropComplete = async (croppedImage: Blob) => {
    setNewLogoBlob(croppedImage);
    setLogoPreview(URL.createObjectURL(croppedImage));
    setCropLogoDialogOpen(false);
  };

  const handleBannerCropComplete = async (croppedImage: Blob) => {
    setNewBannerBlob(croppedImage);
    setBannerPreview(URL.createObjectURL(croppedImage));
    setCropBannerDialogOpen(false);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setNewLogoBlob(null);
  };

  const handleRemoveBanner = () => {
    setBannerPreview('');
    setNewBannerBlob(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let logoUrl = null;
      let bannerUrl = null;

      // Upload images first if provided
      if (newLogoBlob || newBannerBlob) {
        setUploadingImages(true);
      }

      // Upload logo if provided
      if (newLogoBlob) {
        const fileName = `${user.id}/${Date.now()}-logo.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(fileName, newLogoBlob);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      // Upload banner if provided
      if (newBannerBlob) {
        const fileName = `${user.id}/${Date.now()}-banner.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(fileName, newBannerBlob);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(fileName);

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

      // Create cellar and user_cellar relationship atomically
      const { data: cellarId, error: cellarError } = await supabase
        .rpc('create_cellar_with_owner', {
          p_name: name,
          p_description: description || null,
          p_location: location || null,
          p_latitude: latitude,
          p_longitude: longitude,
          p_is_public: isPublic,
          p_is_seller: isSeller,
          p_logo_url: logoUrl,
          p_banner_url: bannerUrl,
        });

      if (cellarError) throw cellarError;

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
    setLogoPreview('');
    setBannerPreview('');
    setNewLogoBlob(null);
    setNewBannerBlob(null);
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

        {/* Crop Dialogs */}
        {selectedLogoImage && (
          <ImageCropDialog
            open={cropLogoDialogOpen}
            onOpenChange={setCropLogoDialogOpen}
            imageSrc={selectedLogoImage}
            onCropComplete={handleLogoCropComplete}
            loading={uploadingImages}
            aspect={1}
            cropShape="round"
            title="Ajuster le logo"
          />
        )}
        {selectedBannerImage && (
          <ImageCropDialog
            open={cropBannerDialogOpen}
            onOpenChange={setCropBannerDialogOpen}
            imageSrc={selectedBannerImage}
            onCropComplete={handleBannerCropComplete}
            loading={uploadingImages}
            aspect={21 / 9}
            cropShape="rect"
            title="Ajuster la bannière"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
