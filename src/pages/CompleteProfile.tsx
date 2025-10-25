import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    city: '',
    address: '',
    description: '',
    téléphone: '',
    affiliate_link: '',
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
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

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarPreview(publicUrl);
      toast({
        title: 'Photo téléversée',
        description: 'Votre photo de profil a été téléversée avec succès',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const geocodeAddress = async (city: string, address?: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const query = address ? `${address}, ${city}, France` : `${city}, France`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.last_name || !formData.city) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Géocodage de l'adresse
      const coords = await geocodeAddress(formData.city, formData.address);
      
      if (!coords) {
        toast({
          title: 'Erreur',
          description: 'Impossible de localiser l\'adresse. Vérifiez la ville saisie.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Mise à jour du profil
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          last_name: formData.last_name,
          city: formData.city,
          address: formData.address || null,
          latitude: coords.latitude,
          longitude: coords.longitude,
          description: formData.description || null,
          téléphone: formData.téléphone ? parseInt(formData.téléphone) : null,
          affiliate_link: formData.affiliate_link || null,
          logo_adress: avatarPreview || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profil complété!',
        description: 'Bienvenue sur Lovabel',
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Complétez votre profil</h1>
          <p className="text-muted-foreground">
            Quelques informations pour commencer votre aventure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-lg border">
          {/* Photo de profil */}
          <div className="space-y-2">
            <Label>Photo de profil (optionnel)</Label>
            <div className="flex items-center gap-4">
              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Aperçu"
                  className="w-20 h-20 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="cursor-pointer"
                />
                {uploadingAvatar && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                    Téléversement...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Prénom *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nom *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              placeholder="Paris"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète (optionnel)</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="12 rue de la Paix"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description / Biographie (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Parlez-nous de vous..."
              rows={4}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="téléphone">Téléphone (optionnel)</Label>
            <Input
              id="téléphone"
              type="tel"
              value={formData.téléphone}
              onChange={(e) => setFormData({ ...formData, téléphone: e.target.value })}
              placeholder="0612345678"
            />
          </div>

          {/* Lien affilié */}
          <div className="space-y-2">
            <Label htmlFor="affiliate_link">Site web ou lien externe (optionnel)</Label>
            <Input
              id="affiliate_link"
              type="url"
              value={formData.affiliate_link}
              onChange={(e) => setFormData({ ...formData, affiliate_link: e.target.value })}
              placeholder="https://mon-site.com"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Compléter mon profil'
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            * Champs obligatoires
          </p>
        </form>
      </div>
    </div>
  );
}
