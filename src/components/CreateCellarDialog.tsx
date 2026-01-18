import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageCropDialog } from './ImageCropDialog';
import { AddressAutocomplete } from './AddressAutocomplete';
import { sanitizeSlugInput } from '@/lib/cellarSlugUtils';

interface CreateCellarDialogProps {
  onCellarCreated: () => void;
}

export function CreateCellarDialog({ onCellarCreated }: CreateCellarDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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
  
  // États pour le slug
  const [customSlug, setCustomSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'checking' | 'available' | 'taken' | 'invalid' | null>(null);
  const [slugMessage, setSlugMessage] = useState('');

  // Suggestion automatique du slug depuis le nom
  useEffect(() => {
    if (isPublic && name && !customSlug) {
      const suggested = sanitizeSlugInput(name);
      setCustomSlug(suggested);
    }
  }, [name, isPublic]);

  // Vérification du slug avec debounce
  useEffect(() => {
    if (!isPublic || !customSlug) {
      setSlugStatus(null);
      setSlugMessage('');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-cellar-slug', {
          body: { slug: customSlug }
        });

        if (error) throw error;

        setSlugStatus(data?.status || 'invalid');
        setSlugMessage(data?.message || '');
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugStatus('invalid');
        setSlugMessage('Erreur de vérification du slug');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customSlug, isPublic]);

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

    // Validation du slug pour les caves publiques
    if (isPublic && (!customSlug || slugStatus !== 'available')) {
      toast({
        title: 'Erreur',
        description: 'Le slug doit être valide et disponible pour une cave publique',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Appeler l'Edge Function pour créer la cave
      const { data, error } = await supabase.functions.invoke('create-cellar', {
        body: {
          name,
          description: description || null,
          location: location || null,
          latitude,
          longitude,
          is_public: isPublic,
          is_seller: isSeller,
          logo_url: null,
          banner_url: null,
          custom_slug: isPublic ? customSlug : null
        }
      });

      if (error) throw error;

      const cellarId = data.cellar_id;
      const slug = data.slug;

      // Uploader les images si nécessaire
      let logoUrl = null;
      let bannerUrl = null;

      if (newLogoBlob || newBannerBlob) {
        setUploadingImages(true);
      }

      if (newLogoBlob) {
        const fileName = `${cellarId}/${Date.now()}-logo.jpg`;
        // Convertir Blob en File pour éviter l'erreur "property buffer doesn't exist"
        const logoFile = new File([newLogoBlob], 'logo.jpg', { type: 'image/jpeg' });
        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(fileName, logoFile, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      if (newBannerBlob) {
        const fileName = `${cellarId}/${Date.now()}-banner.jpg`;
        // Convertir Blob en File pour éviter l'erreur "property buffer doesn't exist"
        const bannerFile = new File([newBannerBlob], 'banner.jpg', { type: 'image/jpeg' });
        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(fileName, bannerFile, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(fileName);

        bannerUrl = urlData.publicUrl;
      }

      setUploadingImages(false);

      // Mettre à jour les URLs des images
      if (logoUrl || bannerUrl) {
        const { error: updateError } = await supabase
          .from('cellar')
          .update({
            logo_url: logoUrl,
            banner_url: bannerUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cellarId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Succès',
        description: 'Cave créée avec succès',
      });

      setOpen(false);
      resetForm();
      onCellarCreated();
      
      // Rediriger vers la cave créée
      navigate(`/cellar/${slug}`);
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
    setLatitude(null);
    setLongitude(null);
    setIsPublic(false);
    setIsSeller(false);
    setLogoPreview('');
    setBannerPreview('');
    setNewLogoBlob(null);
    setNewBannerBlob(null);
    setCustomSlug('');
    setSlugStatus(null);
    setSlugMessage('');
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la cave *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma cave à vin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre cave..."
              rows={3}
            />
          </div>

          <AddressAutocomplete
            value={location}
            onChange={(address, coords) => {
              setLocation(address);
              if (coords) {
                setLatitude(coords.latitude);
                setLongitude(coords.longitude);
              }
            }}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic">Cave publique</Label>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {isPublic && (
              <div className="space-y-2 pl-4 border-l-2 border-primary">
                <Label htmlFor="slug">
                  URL personnalisée *
                  <span className="text-xs text-muted-foreground ml-2">
                    (a-z, 0-9, tirets uniquement)
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">/cellar/</div>
                  <Input
                    id="slug"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase())}
                    placeholder="mon-caviste"
                    required
                  />
                  {slugStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                {slugMessage && (
                  <p className={`text-xs ${
                    slugStatus === 'available' ? 'text-green-600' : 
                    slugStatus === 'taken' || slugStatus === 'invalid' ? 'text-destructive' : 
                    'text-muted-foreground'
                  }`}>
                    {slugMessage}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="isSeller">Cave vendeuse</Label>
              <Switch
                id="isSeller"
                checked={isSeller}
                onCheckedChange={setIsSeller}
              />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            {logoPreview ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2">
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleRemoveLogo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir un logo
                </Button>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
            )}
          </div>

          {/* Banner upload */}
          <div className="space-y-2">
            <Label>Bannière</Label>
            {bannerPreview ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border-2">
                <img src={bannerPreview} alt="Bannière" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleRemoveBanner}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('banner-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir une bannière
                </Button>
                <input
                  id="banner-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerSelect}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || uploadingImages}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploadingImages || (isPublic && slugStatus !== 'available')}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingImages ? 'Upload images...' : 'Création...'}
                </>
              ) : (
                'Créer la cave'
              )}
            </Button>
          </div>
        </form>

        {/* Image Crop Dialogs */}
        {selectedLogoImage && (
          <ImageCropDialog
            open={cropLogoDialogOpen}
            onOpenChange={setCropLogoDialogOpen}
            imageSrc={selectedLogoImage}
            onCropComplete={handleLogoCropComplete}
            aspect={1}
          />
        )}
        {selectedBannerImage && (
          <ImageCropDialog
            open={cropBannerDialogOpen}
            onOpenChange={setCropBannerDialogOpen}
            imageSrc={selectedBannerImage}
            onCropComplete={handleBannerCropComplete}
            aspect={16 / 9}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
