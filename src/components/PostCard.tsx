import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Loader2, Trash2, Wine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Le commentaire est requis').max(1000, 'Maximum 1000 caractères'),
});

interface PostCardProps {
  post: any;
}

export const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [wine, setWine] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [displayedCommentsCount, setDisplayedCommentsCount] = useState(8);

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
        .maybeSingle();
      setIsLiked(!!data);
    }

    // Fetch comments count
    const { count: comments } = await supabase
      .from('post_comment')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    setCommentsCount(comments || 0);

    // Fetch wine if referenced
    if ((post as any).wine_id) {
      const { data } = await supabase
        .from('wine' as any)
        .select('*, domain(*)')
        .eq('id', (post as any).wine_id)
        .maybeSingle();
      setWine(data);
    }

    // Fetch author
    const { data: authorData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', post.user_id)
      .maybeSingle();
    setAuthor(authorData);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('post_comment')
      .select('*, user_profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });
    setComments(data || []);
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

  const handleToggleComments = async () => {
    if (!showComments) {
      await fetchComments();
      setDisplayedCommentsCount(8);
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoadingComment(true);

    try {
      const validated = commentSchema.parse({ content: newComment });

      const { error } = await supabase.from('post_comment').insert({
        post_id: post.id,
        user_id: user.id,
        content: validated.content,
      });

      if (error) throw error;

      setNewComment('');
      setCommentsCount((prev) => prev + 1);
      await fetchComments();

      toast({
        title: 'Succès',
        description: 'Commentaire ajouté',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error.message || 'Erreur lors de l\'ajout du commentaire',
        });
      }
    } finally {
      setLoadingComment(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={author?.logo_adress || undefined} />
          <AvatarFallback>
            {author?.full_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
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
            <p className="text-sm text-muted-foreground">{wine.domain?.name}</p>
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
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleToggleComments}>
          <MessageCircle className="w-4 h-4" />
          {commentsCount}
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-4 pt-4 border-t">
          {/* Add Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="flex gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={author?.logo_adress || undefined} />
                <AvatarFallback className="text-sm">
                  {user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrivez un commentaire..."
                  className="min-h-[60px] resize-none"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingComment || !newComment.trim()}
                >
                  {loadingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun commentaire pour le moment
              </p>
            ) : (
              <>
                {comments.slice(0, displayedCommentsCount).map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user_profiles?.logo_adress || undefined} />
                      <AvatarFallback className="text-sm">
                        {comment.user_profiles?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/user/${comment.user_id}`}
                            className="font-semibold text-sm hover:underline"
                          >
                            {comment.user_profiles?.full_name || 'Utilisateur'}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        {user?.id === comment.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={async () => {
                              const { error } = await supabase
                                .from('post_comment')
                                .delete()
                                .eq('id', comment.id);
                              
                              if (error) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Erreur',
                                  description: 'Impossible de supprimer le commentaire',
                                });
                              } else {
                                toast({
                                  title: 'Succès',
                                  description: 'Commentaire supprimé',
                                });
                                fetchComments();
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
                
                {comments.length > displayedCommentsCount && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDisplayedCommentsCount(prev => prev + 8)}
                    className="w-full"
                  >
                    Voir plus de commentaires ({comments.length - displayedCommentsCount} restant{comments.length - displayedCommentsCount > 1 ? 's' : ''})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
