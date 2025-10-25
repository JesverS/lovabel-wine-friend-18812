import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    city: '',
    address: '',
    description: '',
    téléphone: '',
    logo_adress: '',
  });

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Le fichier doit être une image',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erreur',
        description: 'L\'image ne doit pas dépasser 5MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!user) return;
    
    setUploading(true);

    try {
      const fileName = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImage, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_adress: publicUrl }));
      setCropDialogOpen(false);

      toast({
        title: 'Image téléchargée',
        description: 'Votre photo de profil a été téléchargée avec succès',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim() || !formData.last_name.trim() || !formData.city.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Si une adresse est fournie, géocoder pour obtenir lat/long
      let latitude = null;
      let longitude = null;
      
      if (formData.address.trim()) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            latitude = parseFloat(data[0].lat);
            longitude = parseFloat(data[0].lon);
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
          // Continue même si le géocodage échoue
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name.trim(),
          last_name: formData.last_name.trim(),
          city: formData.city.trim(),
          address: formData.address.trim() || null,
          description: formData.description.trim() || null,
          téléphone: formData.téléphone ? parseInt(formData.téléphone) : null,
          logo_adress: formData.logo_adress || null,
          latitude,
          longitude,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profil complété!',
        description: 'Votre profil a été mis à jour avec succès',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Complétez votre profil</h1>
          <p className="text-muted-foreground">
            Bienvenue sur Lovabel ! Veuillez compléter votre profil pour continuer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-lg border">
          {/* Photo de profil */}
          <div className="space-y-4">
            <Label>Photo de profil (optionnel)</Label>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.logo_adress || undefined} />
                <AvatarFallback className="text-3xl">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Téléchargement...' : 'Télécharger une photo'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Prénom *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                required
                placeholder="Jean"
              />
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Ville */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              required
              placeholder="Paris"
            />
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète (optionnel)</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Rue de la Paix, 75001 Paris"
            />
            <p className="text-xs text-muted-foreground">
              Si vous renseignez une adresse, la localisation sera calculée automatiquement
            </p>
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="téléphone">Numéro de téléphone (optionnel)</Label>
            <Input
              id="téléphone"
              type="tel"
              value={formData.téléphone}
              onChange={(e) => setFormData(prev => ({ ...prev, téléphone: e.target.value }))}
              placeholder="0612345678"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Parlez-nous de vous, de votre passion pour le vin..."
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || uploading}>
            {loading ? 'Enregistrement...' : 'Compléter mon profil'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            * Champs obligatoires
          </p>
        </form>

        {/* Crop Dialog */}
        {selectedImage && (
          <AvatarCropDialog
            open={cropDialogOpen}
            onOpenChange={setCropDialogOpen}
            imageSrc={selectedImage}
            onCropComplete={handleCropComplete}
            loading={uploading}
          />
        )}
      </div>
    </div>
  );
}
