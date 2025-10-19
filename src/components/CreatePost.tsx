import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const postSchema = z.object({
  content: z.string().trim().min(1, 'Le contenu est requis').max(5000, 'Maximum 5000 caractères'),
  image_url: z.string().url('URL invalide').max(2048, 'URL trop longue').nullable().optional(),
});

interface CreatePostProps {
  onPostCreated?: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Validate
      const validated = postSchema.parse({
        content,
        image_url: imageUrl.trim() || null,
      });

      const { error } = await supabase.from('post').insert({
        user_id: user.id,
        content: validated.content,
        image_url: validated.image_url,
      });

      if (error) throw error;

      // Reset form
      setContent('');
      setImageUrl('');

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

      <Input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="URL de l'image (optionnel)"
      />

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Publication...
          </>
        ) : (
          'Publier'
        )}
      </Button>
    </form>
  );
};
