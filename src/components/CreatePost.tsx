import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Wine } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const postSchema = z.object({
  content: z.string().trim().min(1, 'Le contenu est requis').max(5000, 'Maximum 5000 caractères'),
  image_url: z.string().max(2048, 'URL trop longue').nullable().optional(),
  vin_id: z.string().uuid().nullable().optional(),
});

interface CreatePostProps {
  onPostCreated?: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wineSearch, setWineSearch] = useState('');
  const [wines, setWines] = useState<any[]>([]);
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [openWineSearch, setOpenWineSearch] = useState(false);

  useEffect(() => {
    const searchWines = async () => {
      if (wineSearch.trim().length < 2) {
        setWines([]);
        return;
      }

      const { data } = await supabase
        .from('vin')
        .select('id, name, year, domaine(name)')
        .ilike('name', `%${wineSearch}%`)
        .limit(10);

      setWines(data || []);
    };

    const debounce = setTimeout(searchWines, 300);
    return () => clearTimeout(debounce);
  }, [wineSearch]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        description: 'L\'image ne doit pas dépasser 5 Mo',
      });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `post-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        setUploadingImage(false);
      }

      // Validate
      const validated = postSchema.parse({
        content,
        image_url: imageUrl,
        vin_id: selectedWine?.id || null,
      });

      const { error } = await supabase.from('post').insert({
        user_id: user.id,
        content: validated.content,
        image_url: validated.image_url,
        vin_id: validated.vin_id,
      });

      if (error) throw error;

      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview('');
      setSelectedWine(null);

      toast({
        title: 'Succès',
        description: 'Post créé avec succès',
      });

      // Callback
      onPostCreated?.();
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
          description: error.message || 'Erreur lors de la création du post',
        });
      }
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg border space-y-4">
      <h3 className="text-lg font-semibold">Créer un post</h3>
      
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Partagez vos découvertes, vos coups de cœur..."
        className="min-h-[120px]"
        required
        maxLength={5000}
      />
      <p className="text-xs text-muted-foreground">
        {content.length}/5000 caractères
      </p>

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photo (optionnel)</label>
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Cliquez pour ajouter une photo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 5 Mo
              </p>
            </label>
          </div>
        )}
      </div>

      {/* Wine Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Bouteille associée (optionnel)</label>
        <Popover open={openWineSearch} onOpenChange={setOpenWineSearch}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              {selectedWine ? (
                <span className="flex items-center gap-2">
                  <Wine className="w-4 h-4" />
                  {selectedWine.name} {selectedWine.year}
                </span>
              ) : (
                <span className="text-muted-foreground">Rechercher une bouteille...</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Rechercher..."
                value={wineSearch}
                onValueChange={setWineSearch}
              />
              <CommandList>
                <CommandEmpty>Aucune bouteille trouvée</CommandEmpty>
                <CommandGroup>
                  {wines.map((wine) => (
                    <CommandItem
                      key={wine.id}
                      value={wine.id}
                      onSelect={() => {
                        setSelectedWine(wine);
                        setOpenWineSearch(false);
                      }}
                    >
                      <Wine className="w-4 h-4 mr-2" />
                      <div className="flex-1">
                        <p className="font-medium">{wine.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {wine.domaine?.name} • {wine.year}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedWine && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedWine(null)}
          >
            <X className="w-4 h-4 mr-1" />
            Retirer
          </Button>
        )}
      </div>

      <Button type="submit" disabled={loading || uploadingImage}>
        {loading || uploadingImage ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {uploadingImage ? 'Upload en cours...' : 'Publication...'}
          </>
        ) : (
          'Publier'
        )}
      </Button>
    </form>
  );
};
