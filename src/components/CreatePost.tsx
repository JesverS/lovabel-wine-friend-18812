import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Image as ImageIcon, X, Wine, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CreateWineForPostDialog } from './CreateWineForPostDialog';
import { extractMentionsAndHashtags } from '@/lib/contentParser';

interface CreatePostProps {
  onPostCreated?: () => void;
}

const postSchema = z.object({
  user_id: z.string().uuid(),
  content: z.string().max(500).optional(),
  image_url: z.string().url().optional(),
  wine_id: z.string().uuid().optional(),
});

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Wine search state
  const [wineSearchOpen, setWineSearchOpen] = useState(false);
  const [wineSearch, setWineSearch] = useState('');
  const [wines, setWines] = useState<any[]>([]);
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [searchingWines, setSearchingWines] = useState(false);
  const [showCreateWine, setShowCreateWine] = useState(false);

  // Search wines with debounce
  useEffect(() => {
    const searchWines = async () => {
      if (wineSearch.length < 2) {
        setWines([]);
        setSearchingWines(false);
        return;
      }

      setSearchingWines(true);

      try {
        const { data, error } = await (supabase as any).rpc('search_wines', {
          query: wineSearch.trim()
        });

        if (!error && data) {
          setWines(data.slice(0, 10));
        } else {
          setWines([]);
        }
      } catch (error) {
        console.error('Error searching wines:', error);
        setWines([]);
      } finally {
        setSearchingWines(false);
      }
    };

    const timer = setTimeout(searchWines, 300);
    return () => clearTimeout(timer);
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
        description: "L'image ne doit pas dépasser 5 Mo",
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

  const handleSelectWine = (wine: any) => {
    setSelectedWine(wine);
    setWineSearchOpen(false);
    setWineSearch('');
    setWines([]);
  };

  const handleWineCreated = (wine: any) => {
    setSelectedWine(wine);
    setShowCreateWine(false);
    setWineSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!content.trim() && !imageFile && !selectedWine) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Votre post doit contenir du texte, une image ou une bouteille',
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('post')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      const { error: insertError, data: newPost } = await supabase.from('post').insert([{
        user_id: user.id,
        content: content.trim() || null,
        image_url: imageUrl || null,
        wine_id: selectedWine?.id || null,
      }]).select('id').single();

      if (insertError) throw insertError;

      // Parser les mentions et hashtags
      if (content.trim() && newPost?.id) {
        const { mentions, hashtags } = extractMentionsAndHashtags(content);

        // Traiter les mentions
        if (mentions.length > 0) {
          // Vérifier quels slugs existent et récupérer les user_ids
          const { data: mentionedUsers } = await supabase
            .from('user_profiles_public' as any)
            .select('id, slug')
            .in('slug', mentions);

          if (mentionedUsers && mentionedUsers.length > 0) {
            const mentionInserts = (mentionedUsers as any[]).map((u: any) => ({
              post_id: newPost.id,
              mentioned_user_id: u.id,
              mentioned_slug: u.slug,
            }));

            await supabase
              .from('post_mention' as any)
              .insert(mentionInserts);
          }
        }

        // Traiter les hashtags
        if (hashtags.length > 0) {
          for (const tag of hashtags) {
            // Upsert le hashtag
            const { data: existingHashtag } = await supabase
              .from('hashtag' as any)
              .select('id')
              .eq('tag', tag)
              .maybeSingle();

            let hashtagId: string;

            if (existingHashtag) {
              hashtagId = (existingHashtag as any).id;
              // Incrémenter le compteur
              await supabase
                .from('hashtag' as any)
                .update({ usage_count: (existingHashtag as any).usage_count + 1 })
                .eq('id', hashtagId);
            } else {
              // Créer le hashtag
              const { data: newHashtag } = await supabase
                .from('hashtag' as any)
                .insert({ tag, usage_count: 1 })
                .select('id')
                .single();
              hashtagId = (newHashtag as any).id;
            }

            // Insérer la relation post_hashtag
            await supabase
              .from('post_hashtag' as any)
              .insert({ post_id: newPost.id, hashtag_id: hashtagId });
          }
        }
      }

      toast({
        title: 'Succès',
        description: 'Post publié avec succès',
      });

      setContent('');
      setImageFile(null);
      setImagePreview('');
      setSelectedWine(null);

      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Partagez votre expérience avec la communauté..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{content.length}/500</span>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Selected wine badge */}
            {selectedWine && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                {selectedWine.label_url && (
                  <img
                    src={selectedWine.label_url}
                    alt={selectedWine.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedWine.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedWine.domain?.name}
                    {selectedWine.year && ` • ${selectedWine.year}`}
                    {selectedWine.wine_type?.type && ` • ${selectedWine.wine_type.type}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedWine(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="post-image" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <div>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image
                  </div>
                </Button>
              </label>
              <input
                id="post-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWineSearchOpen(true)}
              >
                <Wine className="w-4 h-4 mr-2" />
                Bouteille
              </Button>

              <Button
                type="submit"
                disabled={loading || uploading}
                className="ml-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upload...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publication...
                  </>
                ) : (
                  'Publier'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Wine search dialog */}
      <Dialog open={wineSearchOpen} onOpenChange={setWineSearchOpen}>
        <DialogContent className="w-full max-w-2xl h-[600px] md:h-[700px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Rechercher une bouteille</DialogTitle>
          </DialogHeader>

          {/* Input de recherche - FIXE */}
          <div className="px-6 pb-4 shrink-0">
            <Input
              placeholder="Nom du vin, domaine, année..."
              value={wineSearch}
              onChange={(e) => setWineSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Zone de résultats - SCROLLABLE, HAUTEUR FIXE */}
          <ScrollArea className="flex-1 px-6">
            {searchingWines ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : wineSearch.length < 2 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wine className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Commencez à taper pour rechercher une bouteille</p>
              </div>
            ) : wines.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucune bouteille trouvée pour "{wineSearch}"</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {wines.map((wine) => (
                  <Card
                    key={wine.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectWine(wine)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      {wine.label_url && (
                        <img
                          src={wine.label_url}
                          alt={wine.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{wine.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {wine.domain?.name}
                          {wine.year && ` • ${wine.year}`}
                          {wine.wine_type?.type && ` • ${wine.wine_type.type}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Bouton "Je ne trouve pas" - TOUJOURS VISIBLE EN BAS */}
          <div className="px-6 py-4 border-t shrink-0 bg-background">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowCreateWine(true);
                setWineSearchOpen(false);
              }}
              disabled={wineSearch.length < 2}
            >
              <Plus className="w-4 h-4 mr-2" />
              Je ne trouve pas ma bouteille
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create wine dialog */}
      <CreateWineForPostDialog
        open={showCreateWine}
        onOpenChange={setShowCreateWine}
        initialWineName={wineSearch}
        onWineCreated={handleWineCreated}
      />
    </>
  );
}
