import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Globe, Lock, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface EventPostAuthor {
  id: string;
  full_name: string | null;
  logo_adress: string | null;
  slug: string | null;
}

interface EventPostComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  author?: EventPostAuthor;
  isLiked?: boolean;
}

interface EventPost {
  id: string;
  event_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  visibility: string;
  created_at: string;
  likes_count: number;
  comment_count: number;
  author?: EventPostAuthor;
  isLiked?: boolean;
}

interface EventPostCardProps {
  post: EventPost;
  onDeleted?: () => void;
}

export const EventPostCard = ({ post, onDeleted }: EventPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<EventPostComment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const handleToggleLike = async () => {
    if (!user) return;

    if (isLiked) {
      const { error } = await supabase
        .from('event_post_like' as any)
        .delete()
        .eq('event_post_id', post.id)
        .eq('user_id', user.id);
      if (!error) {
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      }
    } else {
      const { error } = await supabase
        .from('event_post_like' as any)
        .insert({ event_post_id: post.id, user_id: user.id } as any);
      if (!error) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      await fetchComments();
    }
    setShowComments(prev => !prev);
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('event_post_comment' as any)
      .select('id, user_id, content, created_at, likes_count')
      .eq('event_post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data && !error) {
      // Fetch authors
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('user_profiles_public' as any).select('id, full_name, logo_adress, slug').in('id', userIds)
        : { data: [] };

      // Fetch user's likes
      let userLikes: string[] = [];
      if (user) {
        const commentIds = (data as any[]).map((c: any) => c.id);
        if (commentIds.length > 0) {
          const { data: likes } = await supabase
            .from('event_post_comment_like' as any)
            .select('comment_id')
            .eq('user_id', user.id)
            .in('comment_id', commentIds);
          userLikes = (likes || []).map((l: any) => l.comment_id);
        }
      }

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      setComments((data as any[]).map((c: any) => ({
        ...c,
        author: profileMap.get(c.user_id) || null,
        isLiked: userLikes.includes(c.id),
      })));
    }
    setLoadingComments(false);
  };

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;
    setPostingComment(true);

    const { error } = await supabase
      .from('event_post_comment' as any)
      .insert({ event_post_id: post.id, user_id: user.id, content: newComment.trim() } as any);

    if (!error) {
      setNewComment('');
      setCommentCount(prev => prev + 1);
      await fetchComments();
    } else {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le commentaire', variant: 'destructive' });
    }
    setPostingComment(false);
  };

  const handleToggleCommentLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) return;

    if (currentlyLiked) {
      await supabase.from('event_post_comment_like' as any).delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('event_post_comment_like' as any).insert({ comment_id: commentId, user_id: user.id } as any);
    }
    await fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    await supabase.from('event_post_comment' as any).delete().eq('id', commentId).eq('user_id', user.id);
    setCommentCount(prev => Math.max(0, prev - 1));
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleDeletePost = async () => {
    if (!user || user.id !== post.author_id) return;
    const { error } = await supabase.from('event_post' as any).delete().eq('id', post.id);
    if (!error) {
      onDeleted?.();
    } else {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le post', variant: 'destructive' });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Author header */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => post.author?.slug && navigate(`/user/${post.author.slug}`)}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author?.logo_adress || undefined} />
              <AvatarFallback>{post.author?.full_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.author?.full_name || 'Organisateur'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), 'dd MMM yyyy · HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              {post.visibility === 'public' ? (
                <><Globe className="w-3 h-3" /> Public</>
              ) : (
                <><Lock className="w-3 h-3" /> Inscrits</>
              )}
            </Badge>
            {user?.id === post.author_id && (
              <Button variant="ghost" size="icon" onClick={handleDeletePost}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>

        {/* Image */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLike}
            className={`gap-2 ${isLiked ? 'text-primary' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {likesCount > 0 && likesCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleComments}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {commentCount > 0 && commentCount}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar
                      className="w-7 h-7 cursor-pointer shrink-0"
                      onClick={() => comment.author?.slug && navigate(`/user/${comment.author.slug}`)}
                    >
                      <AvatarImage src={comment.author?.logo_adress || undefined} />
                      <AvatarFallback className="text-[10px]">{comment.author?.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <p className="text-xs font-medium">{comment.author?.full_name || 'Utilisateur'}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd MMM · HH:mm', { locale: fr })}
                        </span>
                        <button
                          onClick={() => handleToggleCommentLike(comment.id, !!comment.isLiked)}
                          className={`text-xs hover:text-primary ${comment.isLiked ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                        >
                          ❤️ {comment.likes_count > 0 && comment.likes_count}
                        </button>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* New comment input */}
            {user && (
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Écrire un commentaire..."
                  className="min-h-[40px] text-sm resize-none"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
