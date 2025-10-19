import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus } from 'lucide-react';

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
    if (!user || !content.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('post').insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl || null,
      });

      if (error) throw error;

      toast({ title: 'Post créé avec succès!' });
      setContent('');
      setImageUrl('');
      onPostCreated?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
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
      />

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground flex items-center gap-2">
          <ImagePlus className="w-4 h-4" />
          Image (URL optionnelle)
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-md border bg-background"
        />
      </div>

      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? 'Publication...' : 'Publier'}
      </Button>
    </form>
  );
};
