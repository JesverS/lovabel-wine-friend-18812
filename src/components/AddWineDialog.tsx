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
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AddWineDialogProps {
  cellarId: string;
  onWineAdded: () => void;
}

export function AddWineDialog({ cellarId, onWineAdded }: AddWineDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('750');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [labelFile, setLabelFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let labelUrl = null;

      // Upload label image if provided
      if (labelFile) {
        const fileExt = labelFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${cellarId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, labelFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        labelUrl = publicUrl;
      }

      // Create wine in registry
      const { data: wineData, error: wineError } = await supabase
        .from('wine' as any)
        .insert({
          name,
          year: year ? parseInt(year) : null,
          volume_ml: parseInt(volume),
          price: price ? parseFloat(price) : null,
          description,
          label_url: labelUrl,
        })
        .select()
        .single();

      if (wineError) throw wineError;

      // Add wine to cellar
      const { error: cellarWineError } = await supabase
        .from('cellar_wine' as any)
        .insert({
          cellar_id: cellarId,
          wine_id: (wineData as any).id,
          quantity: parseInt(quantity),
          label_url: labelUrl,
        });

      if (cellarWineError) throw cellarWineError;

      toast({
        title: 'Succès',
        description: 'Vin ajouté au catalogue',
      });

      setOpen(false);
      resetForm();
      onWineAdded();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter le vin',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setYear('');
    setVolume('750');
    setPrice('');
    setQuantity('1');
    setDescription('');
    setLabelFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un vin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un vin au catalogue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du vin *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Année</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2020"
              />
            </div>
            <div>
              <Label htmlFor="volume">Volume (ml) *</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Prix (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="label">Étiquette</Label>
            <Input
              id="label"
              type="file"
              accept="image/*"
              onChange={(e) => setLabelFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
