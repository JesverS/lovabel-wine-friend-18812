import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateWineInDomainDialogProps {
  eventId: string;
  domainId: string;
  domainName: string;
  initialWineName?: string;
  onWineCreated: () => void;
}

export function CreateWineInDomainDialog({
  eventId,
  domainId,
  domainName,
  initialWineName = '',
  onWineCreated,
}: CreateWineInDomainDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialWineName);
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('750');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelPreview, setLabelPreview] = useState<string>('');

  const handleLabelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLabelFile(file);
    setLabelPreview(URL.createObjectURL(file));
  };

  const handleCreateWine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !labelFile) return;

    setLoading(true);

    try {
      // Upload label to domain bucket
      const fileExt = labelFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${domainId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('domain')
        .upload(filePath, labelFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('domain')
        .getPublicUrl(filePath);

      // Create wine
      const { data: wineData, error: wineError } = await supabase
        .from('wine')
        .insert({
          name: name.trim(),
          year: year ? parseInt(year) : null,
          domain_id: domainId,
          volume_ml: parseInt(volume),
          price: price ? parseFloat(price) : null,
          description: description.trim() || null,
          label_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (wineError) throw wineError;

      // Add wine to event
      const { error: eventWineError } = await supabase
        .from('event_domain_wine')
        .insert({
          event_id: eventId,
          domain_id: domainId,
          wine_id: wineData.id,
        });

      if (eventWineError) throw eventWineError;

      toast({
        title: 'Succès',
        description: 'Vin créé et ajouté à l\'événement',
      });

      setOpen(false);
      resetForm();
      onWineCreated();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le vin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(initialWineName);
    setYear('');
    setVolume('750');
    setPrice('');
    setDescription('');
    setLabelFile(null);
    setLabelPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Créer le vin "{name || 'nouveau'}" dans {domainName}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau vin</DialogTitle>
          <p className="text-sm text-muted-foreground">Domaine: {domainName}</p>
        </DialogHeader>

        <form onSubmit={handleCreateWine} className="space-y-4">
          <div>
            <Label htmlFor="wine-name">Nom du vin *</Label>
            <Input
              id="wine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cuvée Prestige"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wine-year">Année</Label>
              <Input
                id="wine-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex: 2020"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <Label htmlFor="wine-volume">Volume (ml)</Label>
              <Input
                id="wine-volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="750"
                min="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="wine-price">Prix (€)</Label>
            <Input
              id="wine-price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 25.00"
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="wine-description">Description</Label>
            <Textarea
              id="wine-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du vin..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="wine-label">Étiquette du vin *</Label>
            <div className="flex items-center gap-4">
              <label htmlFor="wine-label" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors text-center">
                  {labelPreview ? (
                    <img
                      src={labelPreview}
                      alt="Label preview"
                      className="w-24 h-24 object-contain mx-auto"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour ajouter
                      </p>
                    </div>
                  )}
                </div>
              </label>
              <input
                id="wine-label"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLabelSelect}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !name.trim() || !labelFile}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer le vin'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
