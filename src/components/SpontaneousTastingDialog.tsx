import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MapPin, Loader2, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { WineAutocomplete } from './wine/WineAutocomplete';
import { TastingSliders } from './TastingSliders';
import { TastingDetails, tastingDetailsToDbFormat } from '@/lib/tastingSliderConfig';
import { CreateWineForPostDialog } from './CreateWineForPostDialog';

interface SpontaneousTastingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SpontaneousTastingDialog({
  open,
  onOpenChange,
  onSuccess,
}: SpontaneousTastingDialogProps) {
  const { user } = useAuth();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [liked, setLiked] = useState<number>(0);
  const [rating, setRating] = useState<number>(5);
  const [tastingSlots, setTastingSlots] = useState({
    slot1: 5.0,
    slot2: 5.0,
    slot3: 5.0,
    slot4: 5.0,
  });
  const [remarks, setRemarks] = useState('');
  const [showCreateWine, setShowCreateWine] = useState(false);
  const [createWineInitialName, setCreateWineInitialName] = useState('');
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoadingLocation(false);
        toast.success('Position récupérée avec succès');
      },
      (error) => {
        let errorMessage = 'Impossible de récupérer votre position';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Permission de géolocalisation refusée';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Position non disponible';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Temps d\'attente dépassé';
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!selectedWine) {
      toast.error('Veuillez sélectionner un vin');
      return;
    }

    if (!location) {
      toast.error('Veuillez activer la géolocalisation');
      return;
    }

    setIsSaving(true);

    try {
      const details: TastingDetails = {
        rating: rating,
        slot1: tastingSlots.slot1,
        slot2: tastingSlots.slot2,
        slot3: tastingSlots.slot3,
        slot4: tastingSlots.slot4,
        remarks: remarks || undefined,
      };

      const { error } = await supabase.from('user_wine_notice').insert({
        user_id: user.id,
        wine_id: selectedWine.id,
        liked,
        details: tastingDetailsToDbFormat(details),
        spontaneous: true,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (error) throw error;

      toast.success('Dégustation spontanée ajoutée !');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedWine(null);
      setLiked(0);
      setRating(5);
      setTastingSlots({ slot1: 5.0, slot2: 5.0, slot3: 5.0, slot4: 5.0 });
      setRemarks('');
      setLocation(null);
    } catch (error) {
      console.error('Error saving tasting:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dégustation spontanée</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Géolocalisation */}
          <div className="space-y-2">
            <Label>Localisation</Label>
            {!location ? (
              <Button
                onClick={requestLocation}
                disabled={isLoadingLocation}
                variant="outline"
                className="w-full"
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Récupération en cours...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Activer la géolocalisation
                  </>
                )}
              </Button>
            ) : (
              <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Position enregistrée ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLocation(null)}
                >
                  Réinitialiser
                </Button>
              </div>
            )}
            {locationError && (
              <p className="text-sm text-destructive">{locationError}</p>
            )}
          </div>

          {/* Sélection du vin */}
          <WineAutocomplete
            onSelect={setSelectedWine}
            placeholder="Rechercher un vin..."
            label="Vin dégusté"
            onCreateWine={(query) => {
              setCreateWineInitialName(query);
              setShowCreateWine(true);
            }}
          />

          {selectedWine && (
            <>
              {/* Like/Dislike */}
              <div className="space-y-2">
                <Label>Appréciation</Label>
                <div className="flex gap-2">
                  <Button
                    variant={liked === -1 ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setLiked(-1)}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Je n'ai pas aimé
                  </Button>
                  <Button
                    variant={liked === 0 ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setLiked(0)}
                  >
                    <Minus className="mr-2 h-4 w-4" />
                    Neutre
                  </Button>
                  <Button
                    variant={liked === 1 ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setLiked(1)}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    J'ai aimé
                  </Button>
                </div>
              </div>

              {/* Note globale */}
              <div className="space-y-2">
                <Label className="font-semibold">Note globale : {rating.toFixed(1)}/10</Label>
                <Slider
                  value={[rating]}
                  onValueChange={(v) => setRating(v[0])}
                  max={10}
                  step={0.5}
                  className="py-2"
                />
              </div>

              {/* Sliders dynamiques selon le type de vin */}
              <TastingSliders
                wineTypeId={selectedWine?.type}
                values={tastingSlots}
                onChange={(key, value) => setTastingSlots(prev => ({ ...prev, [key]: value }))}
              />

              {/* Remarques */}
              <div className="space-y-2">
                <Label>Remarques (optionnel)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Vos notes de dégustation..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {remarks.length}/500 caractères
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedWine || !location || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
