import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pencil, Upload, Loader2 } from 'lucide-react';
import { AvatarCropDialog } from './AvatarCropDialog';

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Le nom est requis').max(100, 'Maximum 100 caractères'),
  last_name: z.string().trim().max(100, 'Maximum 100 caractères').optional(),
  description: z.string().trim().max(500, 'Maximum 500 caractères').optional(),
  address: z.string().trim().max(200, 'Maximum 200 caractères').optional(),
  city: z.string().trim().max(100, 'Maximum 100 caractères').optional(),
  téléphone: z.string().trim().max(20, 'Maximum 20 caractères').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  profile: any;
  onProfileUpdated: () => void;
}

export const EditProfileDialog = ({ profile, onProfileUpdated }: EditProfileDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.logo_adress || null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: profile?.full_name || '',
    last_name: profile?.last_name || '',
    description: profile?.description || '',
    address: profile?.address || '',
    city: profile?.city || '',
    téléphone: profile?.téléphone?.toString() || '',
  });

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le fichier doit être une image',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'L\'image ne doit pas dépasser 5MB',
      });
      return;
    }

    // Read file as data URL for cropping
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

      setAvatarPreview(publicUrl);
      setCropDialogOpen(false);

      toast({
        title: 'Succès',
        description: 'Avatar uploadé avec succès',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'upload',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Validate
      const validated = profileSchema.parse(formData);

      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: validated.full_name,
          last_name: validated.last_name || null,
          description: validated.description || null,
          address: validated.address || null,
          city: validated.city || null,
          téléphone: validated.téléphone && validated.téléphone.trim() ? parseInt(validated.téléphone) : null,
          logo_adress: avatarPreview || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Profil mis à jour avec succès',
      });

      setOpen(false);
      onProfileUpdated();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Erreur de validation',
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error.message || 'Erreur lors de la mise à jour',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Modifier le profil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Mettez à jour vos informations personnelles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback className="text-2xl">
                {formData.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
                disabled={uploading}
              />
              <Label htmlFor="avatar" className="cursor-pointer">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('avatar')?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Changer l'avatar
                    </>
                  )}
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG ou WEBP. Max 5MB.
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">
              Nom complet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Jean Dupont"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom de famille</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Dupont"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Bio</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Passionné de vin et de gastronomie..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description?.length || 0}/500 caractères
            </p>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Rue de la Paix"
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Paris"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="téléphone">Numéro de téléphone</Label>
            <Input
              id="téléphone"
              type="tel"
              value={formData.téléphone}
              onChange={(e) => setFormData({ ...formData, téléphone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
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
      </DialogContent>
    </Dialog>
  );
};
