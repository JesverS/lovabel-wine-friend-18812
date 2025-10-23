import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, User, ChevronDown, ChevronUp, Heart, Trash2, Pencil, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Wine {
  id: string;
  name: string;
  year: number | null;
  label_url: string | null;
  description: string | null;
  domain_id: string;
  price: number | null;
  volume_ml: number | null;
  alcohol_percentage: number | null;
  characteristics: any;
}

interface WineDetailsDialogProps {
  wine: Wine;
  onClose: () => void;
  onFavoriteRemoved?: () => void;
}

interface TastingDetails {
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
  remarks?: string;
}

interface UserComment {
  user_id: string;
  comment: string;
  created_at: string;
  user_profiles: {
    full_name: string | null;
    logo_adress: string | null;
  } | null;
}

export const WineDetailsDialog = ({
  wine,
  onClose,
  onFavoriteRemoved,
}: WineDetailsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isTastingOpen, setIsTastingOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingCommentUserId, setEditingCommentUserId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentsPage, setCommentsPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [liked, setLiked] = useState<number>(0); // 0 = neutre, 1 = j'aime, -1 = je n'aime pas

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

      // Fetch domain
      const { data: domainData } = await supabase
        .from("domain")
        .select("name, logo_url")
        .eq("id", wine.domain_id)
        .single();

      setDomain(domainData);

      // Check if wine is in favorites
      const { data: favoriteData } = await supabase
        .from("user_favorite")
        .select("*")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .maybeSingle();

      setIsFavorite(!!favoriteData);

      // Fetch private tasting notes
      const { data: noticeData } = await supabase
        .from("user_wine_notice")
        .select("*")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .is("event_id", null)
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

      // Fetch public comments (first 8)
      await fetchComments(0);
    };

    fetchData();
  }, [user, wine.id, wine.domain_id]);

  const fetchComments = async (page: number) => {
    if (!user) return;
    
    const pageSize = 8;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data: commentsData, error } = await supabase
      .from("user_wine_comment" as any)
      .select(`
        user_id,
        comment,
        created_at,
        user_profiles (
          full_name,
          logo_adress
        )
      `)
      .eq("wine_id", wine.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    if (commentsData) {
      // Sort to put user's comment first
      const sortedComments = [...(commentsData as any)].sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        return 0;
      });

      if (page === 0) {
        setComments(sortedComments);
      } else {
        setComments(prev => [...prev, ...sortedComments]);
      }

      setHasMoreComments(commentsData.length === pageSize);
      setCommentsPage(page);
    }
  };

  const loadMoreComments = async () => {
    if (isLoadingMoreComments || !hasMoreComments) return;
    
    setIsLoadingMoreComments(true);
    await fetchComments(commentsPage + 1);
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

    const { error } = await supabase.from("user_wine_notice").upsert({
      user_id: user.id,
      wine_id: wine.id,
      event_id: null,
      liked: newLiked as any,
      details: tastingDetails as any,
    } as any, {
      onConflict: 'user_id,wine_id,event_id'
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre avis",
        variant: "destructive",
      });
    } else {
      setLiked(newLiked);
      toast({
        title: newLiked === 1 ? "J'aime ajouté" : newLiked === -1 ? "Je n'aime pas ajouté" : "Avis retiré",
      });
    }

    setLoading(false);
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

    const { error } = await supabase.from("user_wine_notice").upsert({
      user_id: user.id,
      wine_id: wine.id,
      event_id: null,
      details: tastingDetails as any,
      liked: liked as any,
    } as any, {
      onConflict: 'user_id,wine_id,event_id'
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre dégustation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Dégustation enregistrée",
      });
      setIsTastingOpen(false);
    }

    setLoading(false);
  };

  const handlePostComment = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour commenter",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Commentaire vide",
        description: "Veuillez saisir un commentaire",
        variant: "destructive",
      });
      return;
    }

    setIsPostingComment(true);

    const { error } = await supabase.from("user_wine_comment" as any).upsert({
      user_id: user.id,
      wine_id: wine.id,
      comment: newComment,
    }, {
      onConflict: 'user_id,wine_id'
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre commentaire",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Commentaire enregistré",
      });
      setNewComment("");
      
      // Refresh comments
      setCommentsPage(0);
      setHasMoreComments(true);
      await fetchComments(0);
    }

    setIsPostingComment(false);
  };

  const handleRemoveFromFavorites = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_favorite")
      .delete()
      .eq("user_id", user.id)
      .eq("wine_id", wine.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer ce vin de vos favoris",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Retiré des favoris",
      });
      setIsFavorite(false);
      if (onFavoriteRemoved) {
        onFavoriteRemoved();
      }
    }
  };

  const handleDeleteComment = async (commentUserId: string) => {
    if (!user || user.id !== commentUserId) return;

    const { error } = await supabase
      .from("user_wine_comment" as any)
      .delete()
      .eq("user_id", user.id)
      .eq("wine_id", wine.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Commentaire supprimé",
      });
      
      // Refresh comments
      setCommentsPage(0);
      setHasMoreComments(true);
      await fetchComments(0);
    }
  };

  const handleEditComment = (userId: string, currentComment: string) => {
    setEditingCommentUserId(userId);
    setEditCommentText(currentComment);
  };

  const handleUpdateComment = async (userId: string) => {
    if (!user || user.id !== userId) return;

    if (!editCommentText.trim()) {
      toast({
        title: "Commentaire vide",
        description: "Veuillez saisir un commentaire",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_wine_comment" as any)
      .update({ comment: editCommentText })
      .eq("user_id", user.id)
      .eq("wine_id", wine.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le commentaire",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Commentaire modifié",
      });
      setEditingCommentUserId(null);
      setEditCommentText("");
      
      // Refresh comments
      setCommentsPage(0);
      setHasMoreComments(true);
      await fetchComments(0);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentUserId(null);
    setEditCommentText("");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif flex items-center justify-between">
            <span>{wine.name}</span>
            <div className="flex items-center gap-2">
              {isFavorite && user && (
                <Button variant="outline" size="icon" onClick={handleRemoveFromFavorites}>
                  <Heart className="h-5 w-5 fill-current" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wine Image and Basic Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {wine.label_url && (
              <div className="flex items-center justify-center">
                <img
                  src={wine.label_url}
                  alt={wine.name}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            )}
            
            <div className="space-y-4">
              {domain && (
                <div className="flex items-center gap-3">
                  {domain.logo_url && (
                    <img src={domain.logo_url} alt={domain.name} className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Domaine</p>
                    <button 
                      onClick={() => {
                        navigate(`/domain/${wine.domain_id}`);
                        onClose();
                      }}
                      className="text-xl font-semibold hover:underline text-primary cursor-pointer"
                    >
                      {domain.name}
                    </button>
                  </div>
                </div>
              )}

              {wine.year && (
                <div>
                  <p className="text-sm text-muted-foreground">Millésime</p>
                  <p className="text-lg font-medium">{wine.year}</p>
                </div>
              )}

              {wine.price && (
                <div>
                  <p className="text-sm text-muted-foreground">Prix moyen</p>
                  <p className="text-lg font-medium">{wine.price} €</p>
                </div>
              )}

              {wine.volume_ml && (
                <div>
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="text-lg font-medium">{wine.volume_ml} ml</p>
                </div>
              )}

              {wine.alcohol_percentage && (
                <div>
                  <p className="text-sm text-muted-foreground">Degré d'alcool</p>
                  <p className="text-lg font-medium">{wine.alcohol_percentage}%</p>
                </div>
              )}

              {wine.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-base">{wine.description}</p>
                </div>
              )}

              {wine.characteristics && (
                <div>
                  <p className="text-sm text-muted-foreground">Caractéristiques</p>
                  <pre className="text-sm bg-muted p-2 rounded">
                    {JSON.stringify(wine.characteristics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Private Tasting Notes - Collapsible */}
          <Collapsible open={isTastingOpen} onOpenChange={setIsTastingOpen} className="border-t pt-6">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    Mes impressions de dégustation
                    <span className="text-xs text-muted-foreground">(privé 🔒)</span>
                  </span>
                  {isTastingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground italic">
                Vos impressions de dégustation restent personnelles et privées.
              </p>

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

              <div>
                <Label>Acidité: {tastingDetails.acidity}/5</Label>
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
                <Label>Tanins: {tastingDetails.tannins}/5</Label>
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
                <Label>Corps: {tastingDetails.body}/5</Label>
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
                <Label>Douceur: {tastingDetails.sweetness}/5</Label>
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

              <Button onClick={handleSaveTastingDetails} disabled={loading} className="w-full">
                Enregistrer mes impressions
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Public Comments Section */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Commentaires des utilisateurs</h3>
            
            {/* Form to add comment */}
            {user && (
              <div className="mb-6 space-y-3">
                <Label htmlFor="new-comment">Ajouter un commentaire</Label>
                <Textarea
                  id="new-comment"
                  placeholder="Partagez votre avis sur ce vin..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handlePostComment} 
                  disabled={isPostingComment || !newComment.trim()}
                  className="w-full"
                >
                  Publier mon commentaire
                </Button>
              </div>
            )}

            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun commentaire pour l'instant
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.user_id} className="border rounded-lg p-4 space-y-2">
                    {editingCommentUserId === comment.user_id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleUpdateComment(comment.user_id)}
                            size="sm"
                          >
                            Sauvegarder
                          </Button>
                          <Button 
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="sm"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                navigate(`/user/${comment.user_id}`);
                                onClose();
                              }}
                              className="cursor-pointer hover:opacity-80"
                            >
                              <Avatar>
                                <AvatarImage src={comment.user_profiles?.logo_adress || undefined} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div>
                              <button
                                onClick={() => {
                                  navigate(`/user/${comment.user_id}`);
                                  onClose();
                                }}
                                className="font-medium hover:underline text-primary cursor-pointer"
                              >
                                {comment.user_profiles?.full_name || "Utilisateur"}
                              </button>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "d MMMM yyyy", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          {user && user.id === comment.user_id && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditComment(comment.user_id, comment.comment)}
                                className="text-primary hover:text-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteComment(comment.user_id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </>
                    )}
                  </div>
                ))}
                
                {hasMoreComments && (
                  <Button
                    onClick={loadMoreComments}
                    variant="outline"
                    className="w-full"
                    disabled={isLoadingMoreComments}
                  >
                    {isLoadingMoreComments ? "Chargement..." : "Charger plus de commentaires"}
                  </Button>
                )}
                
                {!hasMoreComments && comments.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Tous les commentaires ont été chargés
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
