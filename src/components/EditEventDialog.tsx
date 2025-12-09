import { useState, useEffect } from 'react';
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
import { Pencil, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ImageCropDialog } from './ImageCropDialog';
import { AddressAutocomplete } from './AddressAutocomplete';
import { CellarAutocomplete } from './CellarAutocomplete';
import { EventAccessSettings } from './EventAccessSettings';

interface EditEventDialogProps {
  eventId: string;
  onEventUpdated?: () => void;
  triggerButton?: React.ReactNode;
}

export function EditEventDialog({ eventId, onEventUpdated, triggerButton }: EditEventDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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
  });

  // Access settings state
  const [accessType, setAccessType] = useState<'public' | 'paid' | 'request_based' | 'invite_only'>('public');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [confidentialAddress, setConfidentialAddress] = useState(false);
  const [confidentialPhone, setConfidentialPhone] = useState(false);
  const [confidentialEmail, setConfidentialEmail] = useState(false);
  const [confidentialParticipantList, setConfidentialParticipantList] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (open) {
      loadEventData();
    }
  }, [open]);

  const loadEventData = async () => {
    try {
      const { data, error } = await supabase
        .from('event')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (data) {
        // Charger les données de la cave si elle existe
        let cellarName = '';
        if ((data as any).cellar_id) {
          const { data: cellarData } = await supabase
            .from('cellar')
            .select('name')
            .eq('id', (data as any).cellar_id)
            .single();
          
          if (cellarData) {
            cellarName = cellarData.name;
          }
        }

        // Formatter les dates pour l'input datetime-local
        const formatDateForInput = (dateString: string | null) => {
          if (!dateString) return '';
          // Convertir "2024-01-15T10:00:00+00:00" en "2024-01-15T10:00"
          return dateString.slice(0, 16);
        };

        setFormData({
          name: data.name || '',
          description: data.description || '',
          start_date: formatDateForInput(data.start_date),
          end_date: formatDateForInput(data.end_date),
          address: data.address || '',
          city: data.city || '',
          category: data.category || '',
          registration_link: data.registration_link || '',
          is_public: data.is_public ?? true,
          cellarId: (data as any).cellar_id || null,
          cellarName: cellarName,
        });
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        if (data.banner_url) {
          setImagePreview(data.banner_url);
        }

        // Load access settings
        setAccessType(data.access_type || 'public');
        setPrice(data.price?.toString() || '');
        setCurrency(data.currency || 'EUR');
        setMaxParticipants(data.max_participants?.toString() || '');
        setConfidentialAddress(data.confidential_address || false);
        setConfidentialPhone(data.confidential_phone || false);
        setConfidentialEmail((data as any).confidential_email || false);
        setConfidentialParticipantList(data.confidential_participant_list || false);
        setContactPhone((data as any).contact_phone || '');
        setContactEmail((data as any).contact_email || '');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de charger les données de l\'événement.',
        variant: 'destructive',
      });
    }
  };

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

    // Validation pour les événements payants
    if (accessType === 'paid' && (!price || parseFloat(price) <= 0)) {
      toast({
        title: 'Prix requis',
        description: 'Veuillez définir un prix supérieur à 0 pour un événement payant.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Mettre à jour l'événement
      const { error: eventError } = await supabase
        .from('event')
        .update({
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          address: formData.address,
          city: formData.city,
          location: formData.address || formData.city,
          category: formData.category || null,
          registration_link: formData.registration_link || null,
          is_public: accessType === 'public',
          latitude,
          longitude,
          cellar_id: formData.cellarId,
          access_type: accessType,
          price: accessType === 'paid' && price ? parseFloat(price) : null,
          currency: accessType === 'paid' ? currency : 'EUR',
          max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
          confidential_address: confidentialAddress,
          confidential_phone: confidentialPhone,
          confidential_email: confidentialEmail,
          confidential_participant_list: confidentialParticipantList,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // Upload de l'image si une nouvelle est présente
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${eventId}/banner.${fileExt}`;

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
          .eq('id', eventId);
      }

      toast({
        title: 'Événement modifié',
        description: 'Votre événement a été modifié avec succès.',
      });

      setOpen(false);
      setImageFile(null);

      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la modification de l\'événement.',
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
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'événement</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre événement
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
                Changer l'image
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

          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public" className="text-base font-medium">Visibilité de l'événement</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.is_public 
                    ? "Visible dans la liste des événements publics" 
                    : "Accessible uniquement via un lien de partage"}
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
            {!formData.is_public && (
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="text-muted-foreground">
                  <strong>Événement privé :</strong> Seules les personnes possédant le lien de partage pourront accéder à la page de l'événement.
                </p>
              </div>
            )}
          </div>

          <EventAccessSettings
            accessType={accessType}
            price={price}
            currency={currency}
            maxParticipants={maxParticipants}
            confidentialAddress={confidentialAddress}
            confidentialPhone={confidentialPhone}
            confidentialEmail={confidentialEmail}
            confidentialParticipantList={confidentialParticipantList}
            contactPhone={contactPhone}
            contactEmail={contactEmail}
            onAccessTypeChange={setAccessType}
            onPriceChange={setPrice}
            onCurrencyChange={setCurrency}
            onMaxParticipantsChange={setMaxParticipants}
            onConfidentialAddressChange={setConfidentialAddress}
            onConfidentialPhoneChange={setConfidentialPhone}
            onConfidentialEmailChange={setConfidentialEmail}
            onConfidentialParticipantListChange={setConfidentialParticipantList}
            onContactPhoneChange={setContactPhone}
            onContactEmailChange={setContactEmail}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Modifier l\'événement'}
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
