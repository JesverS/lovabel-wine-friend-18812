import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
import { ImageCropDialog } from './ImageCropDialog';
import { AddressAutocomplete } from './AddressAutocomplete';
import { CellarAutocomplete } from './CellarAutocomplete';
import { EventAccessSettings } from './EventAccessSettings';

interface CreateEventDialogProps {
  onEventCreated?: () => void;
  triggerButton?: React.ReactNode;
}

export function CreateEventDialog({ onEventCreated, triggerButton }: CreateEventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

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
    cellarId: null as string | null,
    cellarName: '',
    access_type: 'public' as 'public' | 'paid' | 'request_based' | 'invite_only',
    price: '',
    currency: 'EUR',
    max_participants: '',
    confidential_address: false,
    confidential_phone: false,
    confidential_participant_list: false,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageSrc(reader.result as string);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    setUploadLoading(true);
    const file = new File([croppedImage], 'banner.jpg', { type: 'image/jpeg' });
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setShowCropDialog(false);
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddressChange = (address: string, coordinates?: { latitude: number; longitude: number }) => {
    setFormData({ ...formData, address });
    if (coordinates) {
      setLatitude(coordinates.latitude);
      setLongitude(coordinates.longitude);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Appeler l'Edge Function pour créer l'événement
      const { data, error: createError } = await supabase.functions.invoke('create-event', {
        body: {
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
          latitude,
          longitude,
          cellar_id: formData.cellarId,
          access_type: formData.access_type,
          price: formData.price ? parseFloat(formData.price) : null,
          currency: formData.currency,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          confidential_address: formData.confidential_address,
          confidential_phone: formData.confidential_phone,
          confidential_participant_list: formData.confidential_participant_list,
        },
      });

      if (createError) throw createError;
      if (!data) throw new Error('Aucune donnée retournée');

      const { event_id, slug: generatedSlug, private_token } = data;

      // Upload de l'image si présente
      if (imageFile && event_id) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${event_id}/banner.${fileExt}`;

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
          .eq('id', event_id);
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
        cellarId: null,
        cellarName: '',
        access_type: 'public',
        price: '',
        currency: 'EUR',
        max_participants: '',
        confidential_address: false,
        confidential_phone: false,
        confidential_participant_list: false,
      });
      setImageFile(null);
      setImagePreview(null);
      setLatitude(null);
      setLongitude(null);

      if (onEventCreated) {
        onEventCreated();
      }
      
      // Rediriger vers l'événement créé
      navigate(`/event/${generatedSlug}`);
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
            <AddressAutocomplete
              value={formData.address}
              onChange={handleAddressChange}
              placeholder="123 Rue de la Paix, 75001 Paris"
            />
            <p className="text-xs text-muted-foreground">
              Les coordonnées GPS seront automatiquement ajoutées
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

          <CellarAutocomplete
            value={formData.cellarName}
            cellarId={formData.cellarId}
            onSelect={(cellarId, cellarName) => 
              setFormData({ ...formData, cellarId, cellarName })
            }
            label="Cave associée (optionnel)"
          />

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

          <EventAccessSettings
            accessType={formData.access_type}
            price={formData.price}
            currency={formData.currency}
            maxParticipants={formData.max_participants}
            confidentialAddress={formData.confidential_address}
            confidentialPhone={formData.confidential_phone}
            confidentialParticipantList={formData.confidential_participant_list}
            onAccessTypeChange={(value) => setFormData({ ...formData, access_type: value })}
            onPriceChange={(value) => setFormData({ ...formData, price: value })}
            onCurrencyChange={(value) => setFormData({ ...formData, currency: value })}
            onMaxParticipantsChange={(value) => setFormData({ ...formData, max_participants: value })}
            onConfidentialAddressChange={(value) => setFormData({ ...formData, confidential_address: value })}
            onConfidentialPhoneChange={(value) => setFormData({ ...formData, confidential_phone: value })}
            onConfidentialParticipantListChange={(value) => setFormData({ ...formData, confidential_participant_list: value })}
          />

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

      <ImageCropDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
        loading={uploadLoading}
        aspect={16 / 9}
        cropShape="rect"
        title="Ajuster l'image de l'événement"
      />
    </Dialog>
  );
}