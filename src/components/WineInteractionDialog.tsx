import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Heart, MessageSquare, FileText, Star, ThumbsUp, ThumbsDown, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Wine {
  id: string;
  name: string;
  year: number | null;
  label_url: string | null;
  description: string | null;
  domain_id: string;
}

interface WineInteractionDialogProps {
  wine: Wine;
  eventId: string;
  onClose: () => void;
}

interface TastingDetails {
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
  remarks?: string;
}

export const WineInteractionDialog = ({
  wine,
  eventId,
  onClose,
}: WineInteractionDialogProps) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState<number>(0); // 0 = neutre, 1 = j'aime, -1 = je n'aime pas
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentUserId, setEditingCommentUserId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, { userReaction: number | null, likeCount: number }>>({});
  
  const COMMENTS_PER_PAGE = 8;

  const [tastingDetails, setTastingDetails] = useState<TastingDetails>({
    acidity: 3,
    tannins: 3,
    body: 3,
    sweetness: 3,
    remarks: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch existing notice
      const { data: noticeData } = await supabase
        .from("user_wine_notice")
        .select("*")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .maybeSingle();

      if (noticeData) {
        const likedValue = typeof noticeData.liked === 'number' ? noticeData.liked : (noticeData.liked ? 1 : 0);
        setLiked(likedValue);
        if (noticeData.details && typeof noticeData.details === 'object' && !Array.isArray(noticeData.details)) {
          const details = noticeData.details as any;
          setTastingDetails({
            acidity: details.acidity || 3,
            tannins: details.tannins || 3,
            body: details.body || 3,
            sweetness: details.sweetness || 3,
            remarks: details.remarks || "",
          });
        }
      }

      // Fetch comments
      await fetchComments(1, false);

      // Check if favorite
      const { data: favoriteData } = await supabase
        .from("user_favorite")
        .select("*")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .maybeSingle();

      setIsFavorite(!!favoriteData);

      // Fetch domain
      const { data: domainData } = await supabase
        .from("domain")
        .select("name")
        .eq("id", wine.domain_id)
        .single();

      setDomain(domainData);
    };

    fetchData();
  }, [user, wine.id, eventId, wine.domain_id]);

  const fetchComments = async (page = 1, append = false) => {
    const from = (page - 1) * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from('user_wine_comment' as any)
      .select(`
        *,
        user_profiles!user_wine_comment_user_id_fkey (
          full_name,
          logo_adress
        )
      `)
      .eq('wine_id', wine.id)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    const allComments = data || [];
    
    // Sort to put user's comment first
    const sortedComments = allComments.sort((a: any, b: any) => {
      if (a.user_id === session?.user?.id) return -1;
      if (b.user_id === session?.user?.id) return 1;
      return 0;
    });

    if (append) {
      setComments(prev => [...prev, ...sortedComments]);
    } else {
      setComments(sortedComments);
    }

    setHasMoreComments(allComments.length === COMMENTS_PER_PAGE);
    setCommentsPage(page);

    // Fetch reactions for all comments
    if (sortedComments.length > 0) {
      await fetchReactionsForComments(sortedComments.map((c: any) => c.id));
    }
  };

  const fetchReactionsForComments = async (commentIds: string[]) => {
    if (!commentIds.length) return;

    // Fetch all reactions for these comments
    const { data: reactionsData } = await supabase
      .from('user_wine_comment_reaction' as any)
      .select('*')
      .in('comment_id', commentIds) as { data: any[] | null };

    // Calculate like counts and user reactions
    const reactionsMap: Record<string, { userReaction: number | null, likeCount: number }> = {};
    
    commentIds.forEach(commentId => {
      const commentReactions = reactionsData?.filter((r: any) => r.comment_id === commentId) || [];
      const userReaction = commentReactions.find((r: any) => r.user_id === session?.user?.id);
      const likeCount = commentReactions.filter((r: any) => r.reaction === 1).length;
      
      reactionsMap[commentId] = {
        userReaction: userReaction?.reaction || null,
        likeCount
      };
    });

    setCommentReactions(reactionsMap);
  };

  const loadMoreComments = async () => {
    if (isLoadingMoreComments || !hasMoreComments) return;
    
    setIsLoadingMoreComments(true);
    await fetchComments(commentsPage + 1, true);
    setIsLoadingMoreComments(false);
  };

  const handleSetLikeStatus = async (status: number) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour donner votre avis",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const newLiked = liked === status ? 0 : status;

    const { data: noticeData, error } = await supabase.from("user_wine_notice").upsert({
      user_id: user.id,
      wine_id: wine.id,
      liked: newLiked as any,
      details: tastingDetails as any,
    } as any, {
      onConflict: 'user_id,wine_id'
    }).select().single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre avis",
        variant: "destructive",
      });
    } else {
      // Create link between notice and event
      if (noticeData && eventId) {
        const { error: linkError } = await supabase
          .from("user_wine_notice_event" as any)
          .upsert({
            user_wine_notice_id: noticeData.id,
            event_id: eventId,
          } as any, {
            onConflict: 'user_wine_notice_id,event_id'
          });

        if (linkError) {
          console.error("Error linking notice to event:", linkError);
        }
      }

      setLiked(newLiked);
      toast({
        title: newLiked === 1 ? "J'aime ajouté" : newLiked === -1 ? "Je n'aime pas ajouté" : "Avis retiré",
      });
    }

    setLoading(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    const { error } = await supabase
      .from('user_wine_comment' as any)
      .insert({
        wine_id: wine.id,
        user_id: session?.user?.id,
        comment: newComment.trim(),
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de publier le commentaire",
        variant: "destructive",
      });
      return;
    }

    setNewComment('');
    await fetchComments(1, false);
    toast({
      title: "Commentaire publié",
    });
  };

  const handleEditComment = (comment: any) => {
    setEditingCommentUserId(comment.user_id);
    setEditCommentText(comment.comment);
  };

  const handleUpdateComment = async () => {
    if (!editCommentText.trim() || !editingCommentUserId) return;

    const { error } = await supabase
      .from('user_wine_comment' as any)
      .update({ comment: editCommentText.trim() })
      .eq('wine_id', wine.id)
      .eq('user_id', editingCommentUserId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le commentaire",
        variant: "destructive",
      });
      return;
    }

    setEditingCommentUserId(null);
    setEditCommentText('');
    await fetchComments(1, false);
    toast({
      title: "Commentaire mis à jour",
    });
  };

  const handleCancelEdit = () => {
    setEditingCommentUserId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (userId: string) => {
    const { error } = await supabase
      .from('user_wine_comment' as any)
      .delete()
      .eq('wine_id', wine.id)
      .eq('user_id', userId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
      return;
    }

    await fetchComments(1, false);
    toast({
      title: "Commentaire supprimé",
    });
  };

  const handleCommentReaction = async (commentId: string, reaction: number) => {
    if (!session?.user?.id) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réagir",
        variant: "destructive",
      });
      return;
    }

    const currentReaction = commentReactions[commentId]?.userReaction;
    
    // If clicking the same reaction, remove it
    if (currentReaction === reaction) {
      const { error } = await supabase
        .from('user_wine_comment_reaction' as any)
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', session.user.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de retirer la réaction",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Upsert the new reaction
      const { error } = await supabase
        .from('user_wine_comment_reaction' as any)
        .upsert({
          comment_id: commentId,
          user_id: session.user.id,
          reaction
        } as any, {
          onConflict: 'comment_id,user_id'
        });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la réaction",
          variant: "destructive",
        });
        return;
      }
    }

    // Refresh reactions for this comment
    await fetchReactionsForComments([commentId]);
  };

  const handleSaveTastingDetails = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour enregistrer votre dégustation",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: noticeData, error } = await supabase.from("user_wine_notice").upsert({
      user_id: user.id,
      wine_id: wine.id,
      details: tastingDetails as any,
      liked: liked as any,
    } as any, {
      onConflict: 'user_id,wine_id'
    }).select().single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre dégustation",
        variant: "destructive",
      });
    } else {
      // Create link between notice and event
      if (noticeData && eventId) {
        const { error: linkError } = await supabase
          .from("user_wine_notice_event" as any)
          .upsert({
            user_wine_notice_id: noticeData.id,
            event_id: eventId,
          } as any, {
            onConflict: 'user_wine_notice_id,event_id'
          });

        if (linkError) {
          console.error("Error linking notice to event:", linkError);
        }
      }

      toast({
        title: "Dégustation enregistrée",
      });
    }

    setLoading(false);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter aux favoris",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isFavorite) {
      const { error } = await supabase
        .from("user_favorite")
        .delete()
        .eq("user_id", user.id)
        .eq("wine_id", wine.id);

      if (!error) {
        setIsFavorite(false);
        toast({
          title: "Retiré des favoris",
        });
      }
    } else {
      const { error } = await supabase.from("user_favorite").insert({
        user_id: user.id,
        wine_id: wine.id,
        domain_id: wine.domain_id,
      });

      if (!error) {
        setIsFavorite(true);
        toast({
          title: "Ajouté aux favoris",
        });
      }
    }

    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{wine.name}</DialogTitle>
          {domain && (
            <p className="text-muted-foreground">{domain.name}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {wine.label_url && (
            <img
              src={wine.label_url}
              alt={wine.name}
              className="w-full max-h-48 object-contain"
            />
          )}

          {wine.description && (
            <p className="text-sm text-muted-foreground">{wine.description}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant={isFavorite ? "default" : "outline"}
              onClick={handleToggleFavorite}
              disabled={loading}
              className="w-full"
            >
              <Star className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Favori" : "Ajouter aux favoris"}
            </Button>
          </div>

          <Tabs defaultValue="comment" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comment">
                <MessageSquare className="h-4 w-4 mr-2" />
                Commentaire
              </TabsTrigger>
              <TabsTrigger value="tasting">
                <FileText className="h-4 w-4 mr-2" />
                Dégustation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comment" className="space-y-4">
              <h3 className="text-lg font-semibold">Commentaires</h3>
              
              {/* Add Comment - Only show if user hasn't commented yet */}
              {!comments.find(c => c.user_id === session?.user?.id) && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ajouter un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button onClick={handlePostComment} disabled={!newComment.trim()}>
                    Publier
                  </Button>
                </div>
              )}

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.user_id} className="flex gap-3 p-3 bg-muted rounded-lg">
                    <Avatar>
                      <AvatarImage src={comment.user_profiles?.logo_adress} />
                      <AvatarFallback>
                        {comment.user_profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      {editingCommentUserId === comment.user_id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateComment}>
                              Sauvegarder
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">
                              {comment.user_profiles?.full_name || 'Utilisateur'}
                            </p>
                            {comment.user_id === session?.user?.id && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditComment(comment)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.user_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {comment.comment}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentReaction(comment.id, 1)}
                              className={`h-8 ${commentReactions[comment.id]?.userReaction === 1 ? 'bg-primary/20' : ''}`}
                            >
                              <ThumbsUp className={`h-4 w-4 mr-1 ${commentReactions[comment.id]?.userReaction === 1 ? 'fill-current' : ''}`} />
                              {commentReactions[comment.id]?.likeCount || 0}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentReaction(comment.id, -1)}
                              className={`h-8 ${commentReactions[comment.id]?.userReaction === -1 ? 'bg-muted' : ''}`}
                            >
                              <ThumbsDown className={`h-4 w-4 ${commentReactions[comment.id]?.userReaction === -1 ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {hasMoreComments && (
                  <Button 
                    variant="outline" 
                    onClick={loadMoreComments}
                    disabled={isLoadingMoreComments}
                    className="w-full"
                  >
                    {isLoadingMoreComments ? 'Chargement...' : 'Charger plus de commentaires'}
                  </Button>
                )}
                
                {/* All comments loaded message */}
                {!hasMoreComments && comments.length > COMMENTS_PER_PAGE && (
                  <p className="text-sm text-muted-foreground text-center">
                    Tous les commentaires ont été chargés
                  </p>
                )}
              </div>
            </TabsContent>

              <TabsContent value="tasting" className="space-y-6">
              <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <span className="text-primary">🔒</span>
                  Ces notes de dégustation restent personnelles et privées
                </p>
              </div>

              {/* Like/Dislike buttons */}
              <div className="space-y-2">
                <Label>Mon avis sur cette bouteille</Label>
                <div className="flex gap-2">
                  <Button
                    variant={liked === 1 ? "default" : "outline"}
                    onClick={() => handleSetLikeStatus(1)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ThumbsUp className={`h-4 w-4 mr-2 ${liked === 1 ? "fill-current" : ""}`} />
                    J'aime
                  </Button>
                  <Button
                    variant={liked === -1 ? "default" : "outline"}
                    onClick={() => handleSetLikeStatus(-1)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ThumbsDown className={`h-4 w-4 mr-2 ${liked === -1 ? "fill-current" : ""}`} />
                    Je n'aime pas
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>
                    Acidité: {tastingDetails.acidity}/5
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    1 = Très faible • 5 = Très marquée
                  </p>
                  <Slider
                    value={[tastingDetails.acidity]}
                    onValueChange={([value]) =>
                      setTastingDetails({ ...tastingDetails, acidity: value })
                    }
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div>
                  <Label>
                    Tanins: {tastingDetails.tannins}/5
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    1 = Très doux • 5 = Très tannique
                  </p>
                  <Slider
                    value={[tastingDetails.tannins]}
                    onValueChange={([value]) =>
                      setTastingDetails({ ...tastingDetails, tannins: value })
                    }
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div>
                  <Label>
                    Corps: {tastingDetails.body}/5
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    1 = Très léger • 5 = Très corpulent
                  </p>
                  <Slider
                    value={[tastingDetails.body]}
                    onValueChange={([value]) =>
                      setTastingDetails({ ...tastingDetails, body: value })
                    }
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div>
                  <Label>
                    Douceur: {tastingDetails.sweetness}/5
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    1 = Très sec • 5 = Très sucré
                  </p>
                  <Slider
                    value={[tastingDetails.sweetness]}
                    onValueChange={([value]) =>
                      setTastingDetails({ ...tastingDetails, sweetness: value })
                    }
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>

                <div>
                  <Label htmlFor="remarks">Remarques supplémentaires</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Autres observations..."
                    value={tastingDetails.remarks}
                    onChange={(e) =>
                      setTastingDetails({
                        ...tastingDetails,
                        remarks: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <Button onClick={handleSaveTastingDetails} disabled={loading} className="w-full">
                Enregistrer la dégustation
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
