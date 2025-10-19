import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PostCardProps {
  post: any;
}

export const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [wine, setWine] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);

  useEffect(() => {
    fetchPostData();
  }, [post.id, user]);

  const fetchPostData = async () => {
    // Fetch likes count
    const { count: likes } = await supabase
      .from('post_like')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    setLikesCount(likes || 0);

    // Check if user liked
    if (user) {
      const { data } = await supabase
        .from('post_like')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
      setIsLiked(!!data);
    }

    // Fetch comments count
    const { count: comments } = await supabase
      .from('post_comment')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    setCommentsCount(comments || 0);

    // Fetch wine if referenced
    if (post.vin_id) {
      const { data } = await supabase
        .from('vin')
        .select('*, domaine(*)')
        .eq('id', post.vin_id)
        .single();
      setWine(data);
    }

    // Fetch author
    const { data: authorData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', post.user_id)
      .single();
    setAuthor(authorData);
  };

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      await supabase
        .from('post_like')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      await supabase
        .from('post_like')
        .insert({ post_id: post.id, user_id: user.id });
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {author?.full_name?.[0] || 'U'}
        </div>
        <div className="flex-1">
          <Link to={`/user/${post.user_id}`} className="font-semibold hover:underline">
            {author?.full_name || 'Utilisateur'}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
      </div>

      <p className="whitespace-pre-wrap">{post.content}</p>

      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post"
          className="w-full rounded-lg object-cover max-h-96"
        />
      )}

      {wine && (
        <Link
          to={`/wine/${wine.id}`}
          className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {wine.label_url && (
            <img src={wine.label_url} alt={wine.name} className="w-12 h-16 object-cover rounded" />
          )}
          <div>
            <p className="font-semibold">{wine.name}</p>
            <p className="text-sm text-muted-foreground">{wine.domaine?.name}</p>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className="gap-2"
          disabled={!user}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          {likesCount}
        </Button>
        <Button variant="ghost" size="sm" className="gap-2">
          <MessageCircle className="w-4 h-4" />
          {commentsCount}
        </Button>
      </div>
    </Card>
  );
};
