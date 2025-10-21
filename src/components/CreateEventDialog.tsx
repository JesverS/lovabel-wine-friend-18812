import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, Upload } from 'lucide-react';

interface CreateEventDialogProps {
  onEventCreated?: () => void;
  triggerButton?: React.ReactNode;
}

export function CreateEventDialog({ onEventCreated, triggerButton }: CreateEventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    address: '',
    city: '',
    category: '',
    registration_link: '',
    is_public: true,
  });

  // Fonction de géocodage avec OpenStreetMap Nominatim
  const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'WineApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
      return null;
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      return null;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Géocodage de l'adresse
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (formData.address) {
        const coords = await geocodeAddress(formData.address);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lon;
        }
      }

      // Créer l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('event')
        .insert({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          address: formData.address,
          city: formData.city,
          location: formData.address || formData.city,
          category: formData.category || null,
          registration_link: formData.registration_link || null,
          is_public: formData.is_public,
          organizer_id: user.id,
          latitude,
          longitude,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Ajouter le créateur dans user_event
      const { error: userEventError } = await supabase
        .from('user_event')
        .insert({
          user_id: user.id,
          event_id: eventData.id,
          role: 'admin',
        });

      if (userEventError) throw userEventError;

      // Upload de l'image si présente
      if (imageFile && eventData) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${eventData.id}/banner.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('event')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Récupérer l'URL publique
        const { data: publicUrlData } = supabase.storage
          .from('event')
          .getPublicUrl(fileName);

        // Mettre à jour l'événement avec l'URL de l'image
        await supabase
          .from('event')
          .update({ banner_url: publicUrlData.publicUrl })
          .eq('id', eventData.id);
      }

      toast({
        title: 'Événement créé',
        description: 'Votre événement a été créé avec succès.',
      });

      setOpen(false);
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        address: '',
        city: '',
        category: '',
        registration_link: '',
        is_public: true,
      });
      setImageFile(null);
      setImagePreview(null);

      if (onEventCreated) {
        onEventCreated();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création de l\'événement.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <CalendarPlus className="w-4 h-4 mr-2" />
            Créer un événement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un événement</DialogTitle>
          <DialogDescription>
            Organisez un événement autour du vin et partagez-le avec la communauté
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'événement *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Salon des vins de Bordeaux"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez votre événement..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

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
            <Label htmlFor="address">Adresse complète</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Rue de la Paix, 75001 Paris"
            />
            <p className="text-xs text-muted-foreground">
              L'adresse sera automatiquement convertie en coordonnées GPS
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Dégustation, Salon, Atelier..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_link">Lien d'inscription</Label>
            <Input
              id="registration_link"
              type="url"
              value={formData.registration_link}
              onChange={(e) => setFormData({ ...formData, registration_link: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image de l'événement</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choisir une image
              </Button>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              {imageFile && <span className="text-sm text-muted-foreground">{imageFile.name}</span>}
            </div>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Aperçu"
                className="mt-2 w-full h-48 object-cover rounded-md"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              Événement public (visible par tous)
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer l\'événement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
