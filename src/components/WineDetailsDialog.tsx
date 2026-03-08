import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TastingSliders } from "@/components/TastingSliders";
import { TastingDetails, migrateTastingDetails, tastingDetailsToDbFormat } from "@/lib/tastingSliderConfig";
import {
  X,
  User,
  ChevronDown,
  ChevronUp,
  Heart,
  Trash2,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lock,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { wineNoticeSchema, wineCommentSchema } from "@/lib/validation-schemas";

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
  type: number | null;
  mode_culture: number | null;
  wine_classification: number | null;
  website_order_url: string | null;
}

interface WineDetailsDialogProps {
  wine: Wine;
  onClose: () => void;
  onFavoriteRemoved?: () => void;
  eventId?: string;
}

// TastingDetails is now imported from tastingSliderConfig

interface UserComment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_profiles_public: {
    slug: string | null;
    full_name: string | null;
    logo_adress: string | null;
  } | null;
}

export const WineDetailsDialog = ({ wine, onClose, onFavoriteRemoved, eventId }: WineDetailsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasting" | "comments">("tasting");
  const [isFavorite, setIsFavorite] = useState(false);
  const [editingCommentUserId, setEditingCommentUserId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentsPage, setCommentsPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [liked, setLiked] = useState<number>(0); // 0 = neutre, 1 = j'aime, -1 = je n'aime pas
  const [commentReactions, setCommentReactions] = useState<
    Record<string, { userReaction: number | null; likeCount: number }>
  >({});

  const [tastingDetails, setTastingDetails] = useState<TastingDetails>({
    rating: 5.0,
    slot1: 5.0,
    slot2: 5.0,
    slot3: 5.0,
    slot4: 5.0,
    remarks: "",
  });

  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch domain
      const { data: domainData } = await supabase
        .from("domain")
        .select("name, logo_url")
        .eq("id", wine.domain_id)
        .maybeSingle();

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
        .maybeSingle();

      if (noticeData) {
        const likedValue = typeof noticeData.liked === "number" ? noticeData.liked : noticeData.liked ? 1 : 0;
        setLiked(likedValue);
        if (noticeData.details && typeof noticeData.details === "object" && !Array.isArray(noticeData.details)) {
          const migrated = migrateTastingDetails(noticeData.details);
          setTastingDetails(migrated);
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
      .select(
        `
        id,
        user_id,
        comment,
        created_at,
        user_profiles_public (
          slug,
          full_name,
          logo_adress
        )
      `,
      )
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
        setComments((prev) => [...prev, ...sortedComments]);
      }

      setHasMoreComments(commentsData.length === pageSize);
      setCommentsPage(page);

      // Fetch reactions for all comments
      if (sortedComments.length > 0) {
        await fetchReactionsForComments(sortedComments.map((c: any) => c.id));
      }
    }
  };

  const fetchReactionsForComments = async (commentIds: string[]) => {
    if (!commentIds.length) return;

    // Fetch all reactions for these comments
    const { data: reactionsData } = (await supabase
      .from("user_wine_comment_reaction" as any)
      .select("*")
      .in("comment_id", commentIds)) as { data: any[] | null };

    // Calculate like counts and user reactions
    const reactionsMap: Record<string, { userReaction: number | null; likeCount: number }> = {};

    commentIds.forEach((commentId) => {
      const commentReactions = reactionsData?.filter((r: any) => r.comment_id === commentId) || [];
      const userReaction = commentReactions.find((r: any) => r.user_id === user?.id);
      const likeCount = commentReactions.filter((r: any) => r.reaction === 1).length;

      reactionsMap[commentId] = {
        userReaction: userReaction?.reaction || null,
        likeCount,
      };
    });

    setCommentReactions(reactionsMap);
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

    // Arrondir les valeurs au dixième avant sauvegarde
    const roundedDetails = tastingDetailsToDbFormat(tastingDetails);

    if (eventId) {
      // Use RPC to upsert notice and link to event
      const { data: noticeId, error } = await supabase.rpc("upsert_wine_notice_with_event", {
        p_user_id: user.id,
        p_wine_id: wine.id,
        p_event_id: eventId,
        p_liked: newLiked,
        p_rating: 0,
        p_details: roundedDetails as any,
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
    } else {
      // Fallback: simple upsert without event link
      try {
        const validated = wineNoticeSchema.parse({
          liked: newLiked,
          details: roundedDetails,
        });

        const { error } = await supabase.from("user_wine_notice").upsert(
          {
            user_id: user.id,
            wine_id: wine.id,
            liked: validated.liked,
            details: validated.details,
          },
          {
            onConflict: "user_id,wine_id",
          },
        );

        if (error) throw error;

        setLiked(newLiked);
        toast({
          title: newLiked === 1 ? "J'aime ajouté" : newLiked === -1 ? "Je n'aime pas ajouté" : "Avis retiré",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: "Données invalides",
            description: error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer votre avis",
          variant: "destructive",
        });
      }
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

    // Arrondir les valeurs au dixième avant sauvegarde
    const roundedDetails = tastingDetailsToDbFormat(tastingDetails);

    if (eventId) {
      // Use RPC to upsert notice and link to event
      const { data: noticeId, error } = await supabase.rpc("upsert_wine_notice_with_event", {
        p_user_id: user.id,
        p_wine_id: wine.id,
        p_event_id: eventId,
        p_liked: liked,
        p_rating: 0,
        p_details: roundedDetails as any,
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
      }
    } else {
      // Fallback: simple upsert without event link
      try {
        const validated = wineNoticeSchema.parse({
          liked: liked,
          details: roundedDetails,
        });

        const { error } = await supabase.from("user_wine_notice").upsert(
          {
            user_id: user.id,
            wine_id: wine.id,
            details: validated.details,
            liked: validated.liked,
          },
          {
            onConflict: "user_id,wine_id",
          },
        );

        if (error) throw error;

        toast({
          title: "Dégustation enregistrée",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: "Données invalides",
            description: error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer votre dégustation",
          variant: "destructive",
        });
      }
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

    try {
      const validated = wineCommentSchema.parse({
        comment: newComment,
      });

      const { error } = await supabase.from("user_wine_comment").upsert(
        {
          user_id: user.id,
          wine_id: wine.id,
          comment: validated.comment,
        },
        {
          onConflict: "user_id,wine_id",
        },
      );

      if (error) throw error;

      toast({
        title: "Commentaire ajouté avec succès",
      });
      setNewComment("");
      fetchComments(0);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre commentaire",
        variant: "destructive",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter",
        variant: "destructive",
      });
      return;
    }

    if (!wine.domain_id) {
      console.error('Favorite error: wine.domain_id is missing', { wine });
      toast({
        title: "Erreur",
        description: "Ce vin n'a pas de domaine associé.",
        variant: "destructive",
      });
      return;
    }

    if (isFavorite) {
      // Retirer des favoris - domain_id is part of the primary key
      const { error } = await supabase
        .from("user_favorite")
        .delete()
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .eq("domain_id", wine.domain_id);

      if (error) {
        console.error('Favorite delete error:', error);
        toast({
          title: "Erreur",
          description: `Impossible de retirer ce vin de vos favoris: ${error.message} (${error.code})`,
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
    } else {
      // Ajouter aux favoris
      const { error } = await supabase.from("user_favorite").insert({
        user_id: user.id,
        wine_id: wine.id,
        domain_id: wine.domain_id,
      });

      if (error) {
        console.error('Favorite insert error:', error);
        toast({
          title: "Erreur",
          description: `Impossible d'ajouter ce vin à vos favoris: ${error.message} (${error.code})`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ajouté aux favoris",
        });
        setIsFavorite(true);
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

  const handleCommentReaction = async (commentId: string, reaction: number) => {
    if (!user) {
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
        .from("user_wine_comment_reaction" as any)
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

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
      const { error } = await supabase.from("user_wine_comment_reaction" as any).upsert(
        {
          comment_id: commentId,
          user_id: user.id,
          reaction,
        } as any,
        {
          onConflict: "comment_id,user_id",
        },
      );

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

  const content = (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Wine Image and Info - Logo à gauche, infos à droite */}
      <div className="grid md:grid-cols-[300px_1fr] gap-4 md:gap-8">
        {/* Logo/Image à gauche */}
        {wine.label_url && (
          <div className="flex items-start justify-center">
            <img
              src={wine.label_url}
              alt={wine.name}
              className="w-full max-w-[200px] md:max-w-[300px] object-contain rounded-lg"
            />
          </div>
        )}

        {/* Toutes les infos à droite */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <h2 className="text-xl md:text-3xl font-serif break-words flex-1 min-w-0">{wine.name}</h2>
              {user && (
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFavorite}
                  className="flex items-center gap-2"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(`/wine/${wine.id}`);
                onClose();
              }}
              className="w-full"
            >
              Voir la page complète de ce vin
            </Button>
          </div>

          {domain && (
            <div className="flex items-center gap-3 pb-2 border-b">
              {domain.logo_url && (
                <img src={domain.logo_url} alt={domain.name} className="h-10 w-10 rounded-full object-cover" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Domaine</p>
                <button
                  onClick={() => {
                    navigate(`/domain/${wine.domain_id}`);
                    onClose();
                  }}
                  className="text-lg font-semibold hover:underline text-primary cursor-pointer"
                >
                  {domain.name}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {wine.year && (
              <div>
                <p className="text-xs text-muted-foreground">Millésime</p>
                <p className="text-base font-medium">{wine.year}</p>
              </div>
            )}

            {wine.volume_ml && (
              <div>
                <p className="text-xs text-muted-foreground">Contenance</p>
                <p className="text-base font-medium">{wine.volume_ml} ml</p>
              </div>
            )}

            {wine.price && (
              <div>
                <p className="text-xs text-muted-foreground">Prix</p>
                <p className="text-base font-medium">{wine.price} €</p>
              </div>
            )}

            {wine.alcohol_percentage && (
              <div>
                <p className="text-xs text-muted-foreground">Degré d'alcool</p>
                <p className="text-base font-medium">{wine.alcohol_percentage}%</p>
              </div>
            )}
          </div>

          {wine.website_order_url && (
            <div className="pt-2">
              <Button onClick={() => window.open(wine.website_order_url!, "_blank")} className="w-full">
                Commander sur le site
              </Button>
            </div>
          )}

          {wine.description && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm leading-relaxed">{wine.description}</p>
            </div>
          )}

          {wine.characteristics && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Caractéristiques</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(wine.characteristics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Tasting and Comments */}
      <div className="border-t pt-6">
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "tasting" ? "default" : "outline"}
            onClick={() => setActiveTab("tasting")}
            className="flex-1 text-xs md:text-sm"
          >
            <Lock className="w-3 h-3 md:mr-2" />
            <span className="hidden md:inline">Mes impressions de dégustation</span>
            <span className="md:hidden">Dégustation</span>
          </Button>
          <Button
            variant={activeTab === "comments" ? "default" : "outline"}
            onClick={() => setActiveTab("comments")}
            className="flex-1 text-xs md:text-sm"
          >
            <MessageSquare className="w-3 h-3 md:mr-2" />
            <span className="hidden md:inline">Commentaires</span>
            <span className="md:hidden">Avis</span>
          </Button>
        </div>

        {/* Tasting Tab Content */}
        {activeTab === "tasting" && (
          <div className="space-y-4">
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

            {/* Rating slider - Note globale */}
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold min-w-[120px]">Note globale</Label>
                <Slider
                  value={[tastingDetails.rating]}
                  onValueChange={([value]) =>
                    setTastingDetails({ ...tastingDetails, rating: Math.round(value * 10) / 10 })
                  }
                  min={0}
                  max={10}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-sm font-bold min-w-[40px] text-right text-primary">
                  {tastingDetails.rating.toFixed(1)}/10
                </span>
              </div>
            </div>

            <TastingSliders
              wineTypeId={wine.type}
              values={{
                slot1: tastingDetails.slot1,
                slot2: tastingDetails.slot2,
                slot3: tastingDetails.slot3,
                slot4: tastingDetails.slot4,
              }}
              onChange={(key, value) => setTastingDetails(prev => ({ ...prev, [key]: value }))}
            />

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
          </div>
        )}

        {/* Comments Tab Content */}
        {activeTab === "comments" && (
          <div>
            {/* Form to add comment - Only show if user hasn't commented yet */}
            {user && !comments.find((c) => c.user_id === user.id) && (
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
              <p className="text-muted-foreground text-center py-8">Aucun commentaire pour l'instant</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                    {editingCommentUserId === comment.user_id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateComment(comment.user_id)} size="sm">
                            Sauvegarder
                          </Button>
                          <Button onClick={handleCancelEdit} variant="outline" size="sm">
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
                                navigate(`/user/${comment.user_profiles_public?.slug}`);
                                onClose();
                              }}
                              className="cursor-pointer hover:opacity-80"
                            >
                              <Avatar>
                                <AvatarImage src={comment.user_profiles_public?.logo_adress || undefined} />
                                <AvatarFallback>
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div>
                              <button
                                onClick={() => {
                                  navigate(`/user/${comment.user_profiles_public?.slug}`);
                                  onClose();
                                }}
                                className="font-medium hover:underline text-primary cursor-pointer"
                              >
                                {comment.user_profiles_public?.full_name || "Utilisateur"}
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
                        <div className="flex items-center gap-4 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentReaction(comment.id, 1)}
                            className={`h-8 ${commentReactions[comment.id]?.userReaction === 1 ? "bg-primary/20" : ""}`}
                          >
                            <ThumbsUp
                              className={`h-4 w-4 mr-1 ${commentReactions[comment.id]?.userReaction === 1 ? "fill-current" : ""}`}
                            />
                            {commentReactions[comment.id]?.likeCount || 0}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCommentReaction(comment.id, -1)}
                            className={`h-8 ${commentReactions[comment.id]?.userReaction === -1 ? "bg-muted" : ""}`}
                          >
                            <ThumbsDown
                              className={`h-4 w-4 ${commentReactions[comment.id]?.userReaction === -1 ? "fill-current" : ""}`}
                            />
                          </Button>
                        </div>
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
        )}
      </div>
    </div>
  );

  // Version mobile : modale plein écran avec header fixe
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header fixe avec bouton fermer */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between h-14 px-4">
            <h2 className="text-lg font-semibold truncate flex-1 mr-2">{wine.name}</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Contenu scrollable sous le header */}
        <div className="pt-14 h-full overflow-y-auto pb-safe">
          <div className="p-4">{content}</div>
        </div>
      </div>
    );
  }

  // Version desktop : Dialog classique
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="sr-only">Détails du vin</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
