import { useState, useEffect } from 'react';
import { getUserFriendlyErrorMessage } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Loader2, Trash2, Edit2, ThumbsUp, Share2, Flag, Link as LinkIcon, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
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
import { WineTastingNotes } from '@/components/WineTastingNotes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { renderContentWithLinks } from '@/lib/contentParser';
import { ReportContentDialog } from '@/components/ReportContentDialog';
import { ShareStoryDialog } from '@/components/ShareStoryDialog';

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Le commentaire est requis').max(1000, 'Maximum 1000 caractères'),
});

const postEditSchema = z.object({
  content: z.string().trim().min(1, 'Le contenu est requis').max(10000, 'Maximum 10000 caractères'),
});

interface PostCardProps {
  post: any;
  preloadedData?: boolean;
}

export const PostCard = ({ post, preloadedData = false }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comment_count || 0);
  const [isLiked, setIsLiked] = useState(preloadedData ? post.isLiked : false);
  const [wine, setWine] = useState<any>(preloadedData ? post.wine : null);
  const [author, setAuthor] = useState<any>(preloadedData ? post.author : null);
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
  const [loadingShare, setLoadingShare] = useState(false);
  const [authorIsPublic, setAuthorIsPublic] = useState<boolean | null>(
    preloadedData && post.author ? post.author.is_public : null
  );
  const [shareToken, setShareToken] = useState<string | null>(post.share_token || null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(post.content);

  // Seulement charger les données si pas pré-chargées
  useEffect(() => {
    if (!preloadedData) {
      fetchPostData();
      // Charger le statut public de l'auteur seulement si non pré-chargé
      fetchAuthorPublicStatus();
    } else if (user) {
      // Charger uniquement le profil de l'utilisateur courant pour les commentaires
      fetchCurrentUserProfile();
    }
  }, [post.id, user, preloadedData]);

  const fetchAuthorPublicStatus = async () => {
    const { data, error } = await supabase
      .from('user_profiles_public' as any)
      .select('is_public')
      .eq('id', post.user_id)
      .maybeSingle();
    
    if (error || !data) {
      // En cas d'erreur, on reste sur null (pas de partage possible)
      setAuthorIsPublic(null);
      return;
    }
    setAuthorIsPublic((data as any)?.is_public ?? false);
  };

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles_public' as any)
      .select('id, full_name, logo_adress')
      .eq('id', user.id)
      .maybeSingle();
    setCurrentUserProfile(data);
  };

  const fetchPostData = async () => {
    setLikesCount(post.likes_count || 0);

    if (user) {
      const { data } = await supabase
        .from('post_like')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsLiked(!!data);
    }

    setCommentsCount(post.comment_count || 0);

    if ((post as any).wine_id) {
      const { data } = await supabase
        .from('wine' as any)
        .select('*, domain!wine_domain_id_fkey(*)')
        .eq('id', (post as any).wine_id)
        .maybeSingle();
      setWine(data);
    }

    const { data: authorData } = await supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, logo_adress, description, city, level')
      .eq('id', post.user_id)
      .maybeSingle();
    setAuthor(authorData);

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
    const isLikedComment = current?.liked || false;

    // Optimistic update
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: {
        liked: !isLikedComment,
        count: isLikedComment ? Math.max(0, (prev[commentId]?.count || 0) - 1) : (prev[commentId]?.count || 0) + 1,
      },
    }));

    if (isLikedComment) {
      const { error } = await supabase
        .from('post_comment_like')
        .delete()
        .eq('user_id', user.id)
        .eq('comment_id', commentId);

      if (error) {
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
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: current,
        }));
      }
    }
  };

  const handleLike = async () => {
    if (!user) return;

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    if (previousLiked) {
      const { error } = await supabase
        .from('post_like')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      
      if (error) {
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } else {
      const { error } = await supabase
        .from('post_like')
        .insert({ post_id: post.id, user_id: user.id });
      
      if (error) {
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
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
    } catch (error: unknown) {
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
          description: getUserFriendlyErrorMessage(error),
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
      
      setDisplayedContent(validated.content);
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

  const handleShare = async () => {
    const baseUrl = window.location.origin;
    
    // Si on n'a pas encore récupéré le statut public, attendre
    if (authorIsPublic === null) {
      toast({
        title: 'Chargement...',
        description: 'Veuillez patienter pendant la vérification',
      });
      return;
    }
    
    // Si le profil de l'auteur est public, partager avec l'URL du post
    if (authorIsPublic === true) {
      const shareUrl = `${baseUrl}/post/${post.id}`;
      await triggerShare(shareUrl);
      return;
    }
    
    // Si le profil est privé, seul le propriétaire peut partager
    if (user?.id !== post.user_id) {
      toast({
        variant: 'destructive',
        title: 'Partage impossible',
        description: 'Seul l\'auteur peut partager ce post depuis un compte privé',
      });
      return;
    }
    
    // Générer ou utiliser le share_token existant (profil privé + propriétaire)
    setLoadingShare(true);
    try {
      let token = shareToken;
      
      if (!token) {
        // Générer un nouveau token
        token = crypto.randomUUID();
        const { error } = await supabase
          .from('post')
          .update({ 
            share_token: token, 
            share_token_created_at: new Date().toISOString() 
          })
          .eq('id', post.id);
        
        if (error) throw error;
        setShareToken(token);
        
        toast({
          title: 'Lien privé généré',
          description: 'Un lien de partage unique a été créé',
        });
      }
      
      const shareUrl = `${baseUrl}/post/share/${token}`;
      await triggerShare(shareUrl);
    } catch (error: any) {
      console.error('Erreur génération token:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de générer le lien de partage. Vérifiez vos permissions.',
      });
    } finally {
      setLoadingShare(false);
    }
  };

  const triggerShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Post WineNote',
          text: post.content?.substring(0, 100) || 'Découvrez ce post sur WineNote',
          url,
        });
      } catch (error) {
        // L'utilisateur a annulé le partage, on ne fait rien
        if ((error as Error).name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Lien copié',
        description: 'Le lien a été copié dans le presse-papier',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de copier le lien',
      });
    }
  };

  // Déterminer si le bouton de partage doit être affiché
  // On affiche le bouton si le profil est public OU si l'utilisateur est le propriétaire
  // On n'affiche pas si authorIsPublic est null (chargement en cours)
  const canShare = authorIsPublic === true || user?.id === post.user_id;

  const handleDeletePost = async () => {
    if (!user || user.id !== post.user_id) return;
    
    setLoadingDelete(true);
    try {
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
      
      const { error } = await supabase
        .from('post')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
      
      toast({
        title: 'Succès',
        description: 'Post supprimé',
      });
      
      // Invalider le cache React Query au lieu de recharger la page
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
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
                  aria-label="Modifier le post"
                  onClick={() => {
                    setEditedContent(displayedContent);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Supprimer le post"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            )}
            {user && user.id !== post.user_id && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Signaler le post"
                onClick={() => setReportDialogOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Flag className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isEditing ? (
        <p className="whitespace-pre-wrap">{renderContentWithLinks(displayedContent || '')}</p>
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
          loading="lazy"
          className="w-full rounded-lg object-cover max-h-96"
        />
      )}

      {wine && (
        <Link
          to={`/wine/${wine.id}`}
          className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {wine.label_url && (
            <img 
              src={wine.label_url} 
              alt={wine.name} 
              loading="lazy"
              className="w-12 h-16 object-cover rounded" 
            />
          )}
          <div>
            <p className="font-semibold">{wine.name}</p>
            <p className="text-sm text-muted-foreground">{wine.domain?.name}</p>
          </div>
        </Link>
      )}

      {/* Impressions de dégustation */}
      {post.is_wine_notice && post.wine_notice && (
        <WineTastingNotes wineNotice={post.wine_notice} wineTypeId={wine?.type ?? null} />
      )}

      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className="gap-2"
          disabled={!user}
          aria-label={isLiked ? "Retirer le j'aime" : "Ajouter un j'aime"}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
          {likesCount}
        </Button>
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleToggleComments} aria-label="Afficher les commentaires">
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          {commentsCount}
        </Button>
        {canShare && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 ml-auto"
                disabled={loadingShare}
              >
                {loadingShare ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                Partager
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copier le lien
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStoryDialogOpen(true)}>
                <Instagram className="w-4 h-4 mr-2" />
                Story Instagram
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
                  aria-label="Envoyer le commentaire"
                >
                  {loadingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden="true" />
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
                              aria-label="Supprimer le commentaire"
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
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
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
                        aria-label={commentLikes[comment.id]?.liked ? "Retirer le j'aime" : "Aimer ce commentaire"}
                      >
                        <ThumbsUp
                          className={`w-3 h-3 ${
                            commentLikes[comment.id]?.liked
                              ? 'fill-primary text-primary'
                              : ''
                          }`}
                          aria-hidden="true"
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

      {/* Report Dialog */}
      <ReportContentDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={post.id}
      />

      {/* Share Story Dialog */}
      <ShareStoryDialog
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        post={{
          content: post.content,
          image_url: post.image_url,
          is_wine_notice: post.is_wine_notice,
          wine_notice: post.wine_notice,
        }}
        wine={wine}
        author={author}
      />
    </Card>
  );
};
