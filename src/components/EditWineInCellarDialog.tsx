import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Settings, Trash2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WineData {
  wine_id: string;
  cellar_id: string;
  quantity: number;
  label_url: string | null;
  description: string | null;
  wine: {
    id: string;
    name: string;
    description: string | null;
    label_url: string | null;
  };
}

interface EditWineInCellarDialogProps {
  wineData: WineData;
  onUpdated: () => void;
}

export function EditWineInCellarDialog({ wineData, onUpdated }: EditWineInCellarDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(wineData.description || wineData.wine.description || '');
  const [quantity, setQuantity] = useState(wineData.quantity);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      // Delete old custom image if exists
      if (wineData.label_url) {
        const oldPath = wineData.label_url.split('/').slice(-2).join('/');
        await supabase.storage.from('cellar').remove([oldPath]);
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${wineData.wine_id}-${Date.now()}.${fileExt}`;
      const filePath = `${wineData.cellar_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cellar')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cellar')
        .getPublicUrl(filePath);

      // Update cellar_wine
      const { error: updateError } = await supabase
        .from('cellar_wine' as any)
        .update({ label_url: publicUrl })
        .eq('cellar_id', wineData.cellar_id)
        .eq('wine_id', wineData.wine_id);

      if (updateError) throw updateError;

      toast({
        title: 'Succès',
        description: 'Photo mise à jour',
      });

      onUpdated();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger la photo',
        variant: 'destructive',
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
      // Determine if description should be saved or set to null
      let finalDescription: string | null = null;
      
      if (description.trim() !== '') {
        // If different from wine.description, save it
        if (description.trim() !== (wineData.wine.description || '').trim()) {
          finalDescription = description.trim();
        }
      }

      const { error } = await supabase
        .from('cellar_wine' as any)
        .update({
          description: finalDescription,
          quantity: quantity,
        })
        .eq('cellar_id', wineData.cellar_id)
        .eq('wine_id', wineData.wine_id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vin mis à jour',
      });
      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating wine:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le vin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);

    try {
      // Delete custom photo if exists
      if (wineData.label_url) {
        const oldPath = wineData.label_url.split('/').slice(-2).join('/');
        await supabase.storage.from('cellar').remove([oldPath]);
      }

      // Delete from cellar_wine
      const { error } = await supabase
        .from('cellar_wine' as any)
        .delete()
        .eq('cellar_id', wineData.cellar_id)
        .eq('wine_id', wineData.wine_id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vin supprimé de la cave',
      });
      setOpen(false);
      onUpdated();
    } catch (error) {
      console.error('Error deleting wine:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le vin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {wineData.wine.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={wineData.wine.description || 'Description personnalisée...'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si différente de la description du domaine, elle sera affichée à la place
            </p>
          </div>

          <div>
            <Label htmlFor="quantity">Quantité en stock *</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div>
            <Label htmlFor="photo">Photo personnalisée</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <label htmlFor="photo" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Upload...' : 'Changer'}
                </label>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Photo personnalisée pour votre cave (remplace celle du domaine)
            </p>
            {(wineData.label_url || wineData.wine.label_url) && (
              <div className="mt-2">
                <img
                  src={wineData.label_url || wineData.wine.label_url || ''}
                  alt="Aperçu"
                  className="w-32 h-48 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer de la cave
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Voulez-vous vraiment supprimer ce vin de votre cave ? Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
