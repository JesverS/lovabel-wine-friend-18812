import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Loader2, Trash2, Wine, Edit2, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Le commentaire est requis').max(1000, 'Maximum 1000 caractères'),
});

const postEditSchema = z.object({
  content: z.string().trim().min(1, 'Le contenu est requis').max(10000, 'Maximum 10000 caractères'),
});

interface PostCardProps {
  post: any;
}

export const PostCard = ({ post }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comment_count || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [wine, setWine] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [displayedCommentsCount, setDisplayedCommentsCount] = useState(8);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchPostData();
  }, [post.id, user]);

  const fetchPostData = async () => {
    // Likes count is managed by trigger on post.likes_count
    setLikesCount(post.likes_count || 0);

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

    // Comment count is managed by trigger on post.comment_count
    setCommentsCount(post.comment_count || 0);

    // Fetch wine if referenced
    if ((post as any).wine_id) {
      console.log('Fetching wine with ID:', (post as any).wine_id);
      const { data, error } = await supabase
        .from('wine' as any)
        .select('*, domain!wine_domain_id_fkey(*)')
        .eq('id', (post as any).wine_id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching wine:', error);
      } else {
        console.log('Wine data:', data);
        setWine(data);
      }
    }

    // Fetch author
    const { data: authorData } = await supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, logo_adress, description, city, level')
      .eq('id', post.user_id)
      .maybeSingle();
    setAuthor(authorData);

    // Fetch current user profile if logged in
    if (user) {
      const { data: currentProfile } = await supabase
        .from('user_profiles_public' as any)
        .select('id, full_name, logo_adress')
        .eq('id', user.id)
        .maybeSingle();
      setCurrentUserProfile(currentProfile);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('post_comment')
      .select('*, user_profiles_public(id, slug, full_name, logo_adress)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: false }) as any;
    setComments(data || []);

    // Fetch user likes for comments
    if (user && data && data.length > 0) {
      const commentIds = data.map((c: any) => c.id);
      const { data: userLikes } = await supabase
        .from('post_comment_like')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds) as any;

      const likesMap: Record<string, { liked: boolean; count: number }> = {};
      data.forEach((comment: any) => {
        likesMap[comment.id] = {
          liked: userLikes?.some((l: any) => l.comment_id === comment.id) || false,
          count: comment.likes_count || 0,
        };
      });
      setCommentLikes(likesMap);
    } else if (data) {
      const likesMap: Record<string, { liked: boolean; count: number }> = {};
      data.forEach((comment: any) => {
        likesMap[comment.id] = {
          liked: false,
          count: comment.likes_count || 0,
        };
      });
      setCommentLikes(likesMap);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) return;

    const current = commentLikes[commentId];
    const isLiked = current?.liked || false;

    // Optimistic update
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: {
        liked: !isLiked,
        count: isLiked ? Math.max(0, (prev[commentId]?.count || 0) - 1) : (prev[commentId]?.count || 0) + 1,
      },
    }));

    if (isLiked) {
      const { error } = await supabase
        .from('post_comment_like')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', commentId);

      if (error) {
        // Revert on error
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: current,
        }));
      }
    } else {
      const { error } = await supabase
        .from('post_comment_like')
        .insert({ user_id: user.id, comment_id: commentId });

      if (error) {
        // Revert on error
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: current,
        }));
      }
    }
  };

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      const { error } = await supabase
        .from('post_like')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      
      if (!error) {
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('post_like')
        .insert({ post_id: post.id, user_id: user.id });
      
      if (!error) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
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

  const handleEditPost = async () => {
    if (!user || user.id !== post.user_id) return;
    
    setLoadingEdit(true);
    try {
      const validated = postEditSchema.parse({ content: editedContent });
      
      const { error } = await supabase
        .from('post')
        .update({ 
          content: validated.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);
      
      if (error) throw error;
      
      post.content = validated.content;
      setIsEditing(false);
      
      toast({
        title: 'Succès',
        description: 'Post modifié avec succès',
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
          description: error.message || 'Erreur lors de la modification',
        });
      }
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user || user.id !== post.user_id) return;
    
    setLoadingDelete(true);
    try {
      // 1. Supprimer l'image si elle existe
      if (post.image_url) {
        try {
          const urlParts = post.image_url.split('/post/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1].split('?')[0];
            await supabase.storage.from('post').remove([fileName]);
          }
        } catch (storageError) {
          console.warn('Erreur suppression image:', storageError);
        }
      }
      
      // 2. Supprimer le post (cascade automatique pour likes et commentaires)
      const { error } = await supabase
        .from('post')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast({
        title: 'Succès',
        description: 'Post supprimé',
      });
      
      // 3. Recharger le feed
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le post',
      });
    } finally {
      setLoadingDelete(false);
      setDeleteDialogOpen(false);
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
          <div className="flex items-center justify-between">
            <div>
              <Link to={`/user/${author?.slug}`} className="font-semibold hover:underline">
                {author?.full_name || 'Utilisateur'}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
            {user?.id === post.user_id && !isEditing && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedContent(post.content);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isEditing ? (
        <p className="whitespace-pre-wrap">{post.content}</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={10000}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={loadingEdit}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleEditPost}
              disabled={loadingEdit || !editedContent.trim()}
            >
              {loadingEdit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      )}

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
                <AvatarImage src={currentUserProfile?.logo_adress || undefined} />
                <AvatarFallback className="text-sm">
                  {currentUserProfile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
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
                      <AvatarImage src={comment.user_profiles_public?.logo_adress || undefined} />
                      <AvatarFallback className="text-sm">
                        {comment.user_profiles_public?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/user/${comment.user_profiles_public?.slug}`}
                              className="font-semibold text-sm hover:underline"
                            >
                              {comment.user_profiles_public?.full_name || 'Utilisateur'}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                        onClick={() => handleCommentLike(comment.id)}
                        disabled={!user}
                      >
                        <ThumbsUp
                          className={`w-3 h-3 ${
                            commentLikes[comment.id]?.liked
                              ? 'fill-primary text-primary'
                              : ''
                          }`}
                        />
                        {commentLikes[comment.id]?.count > 0 && (
                          <span>{commentLikes[comment.id].count}</span>
                        )}
                      </Button>
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

      {/* Delete Post Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le post ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le post et son image seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={loadingDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loadingDelete ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
