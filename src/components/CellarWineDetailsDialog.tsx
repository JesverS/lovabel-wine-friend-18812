import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Heart, 
  Trash2, 
  Pencil, 
  ThumbsUp, 
  ThumbsDown, 
  Upload,
  Lock,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface WineData {
  wine_id: string;
  cellar_id: string;
  quantity: number | null;
  price: number | null;
  description: string | null;
  label_url: string | null;
  added_at: string | null;
  wine: {
    id: string;
    name: string;
    year: number | null;
    label_url: string;
    domain_id: string | null;
    type: number | null;
    mode_culture: number | null;
    wine_classification: number | null;
    price: number | null;
    volume_ml: number | null;
    website_order_url: string | null;
    description: string | null;
    domain: {
      name: string;
    } | null;
    wine_type: {
      type: string;
    } | null;
  } | null;
}

interface CellarWineDetailsDialogProps {
  wineData: WineData;
  isOwner: boolean;
  cellarId: string;
  onClose: () => void;
  onUpdated: () => void;
}

interface TastingDetails {
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
  remarks?: string;
}

interface UserComment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_profiles: {
    full_name: string | null;
    logo_adress: string | null;
  } | null;
}

const COMMENTS_PER_PAGE = 8;

export function CellarWineDetailsDialog({
  wineData,
  isOwner,
  cellarId,
  onClose,
  onUpdated,
}: CellarWineDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // General states
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasting' | 'comments'>('tasting');
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Tasting states
  const [liked, setLiked] = useState<number>(0);
  const [tastingDetails, setTastingDetails] = useState<TastingDetails>({
    acidity: 5.0,
    tannins: 5.0,
    body: 5.0,
    sweetness: 5.0,
    remarks: '',
  });
  
  // Comments states
  const [comments, setComments] = useState<UserComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentUserId, setEditingCommentUserId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentReactions, setCommentReactions] = useState<Record<string, { userReaction: number | null; likeCount: number }>>({});
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  
  // Owner edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedQuantity, setEditedQuantity] = useState(0);
  const [editedPrice, setEditedPrice] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Helper function for price display
  const getPriceDisplay = (cellarPrice: number | null | undefined): string => {
    if (cellarPrice === null || cellarPrice === undefined || cellarPrice === 0) {
      return 'Prix en attente';
    }
    return `${cellarPrice.toFixed(2)}€`;
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !wineData.wine) return;

      // Fetch domain
      if (wineData.wine.domain_id) {
        const { data: domainData } = await supabase
          .from('domain')
          .select('name, logo_url')
          .eq('id', wineData.wine.domain_id)
          .maybeSingle();
        setDomain(domainData);
      }

      // Check favorites
      const { data: favoriteData } = await supabase
        .from('user_favorite')
        .select('*')
        .eq('user_id', user.id)
        .eq('wine_id', wineData.wine_id)
        .maybeSingle();
      setIsFavorite(!!favoriteData);

      // Fetch existing tasting notice
      const { data: noticeData } = await supabase
        .from('user_wine_notice')
        .select('*')
        .eq('user_id', user.id)
        .eq('wine_id', wineData.wine_id)
        .maybeSingle();

      if (noticeData) {
        const likedValue = typeof noticeData.liked === 'number' 
          ? noticeData.liked 
          : (noticeData.liked ? 1 : 0);
        setLiked(likedValue);
        
        if (noticeData.details && typeof noticeData.details === 'object' && !Array.isArray(noticeData.details)) {
          const details = noticeData.details as any;
          setTastingDetails({
            acidity: details.acidity || 5.0,
            tannins: details.tannins || 5.0,
            body: details.body || 5.0,
            sweetness: details.sweetness || 5.0,
            remarks: details.remarks || '',
          });
        }
      }

      // Fetch initial comments
      await fetchComments(0);

      // Initialize edit values
      if (isOwner) {
        setEditedDescription(wineData.description || wineData.wine.description || '');
        setEditedQuantity(wineData.quantity || 0);
        setEditedPrice(wineData.price);
      }
    };

    fetchData();
  }, [user, wineData.wine_id, isOwner]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreComments && !isLoadingMoreComments) {
          loadMoreComments();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMoreComments, isLoadingMoreComments, comments.length]);

  const fetchComments = async (page: number) => {
    if (!user) return;
    
    const from = page * COMMENTS_PER_PAGE;
    const to = from + COMMENTS_PER_PAGE - 1;

    const { data: commentsData, error } = await supabase
      .from('user_wine_comment' as any)
      .select(`
        id,
        user_id,
        comment,
        created_at,
        user_profiles!user_wine_comment_user_id_fkey (
          full_name,
          logo_adress
        )
      `)
      .eq('wine_id', wineData.wine_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    if (commentsData) {
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

      setHasMoreComments(commentsData.length === COMMENTS_PER_PAGE);

      if (sortedComments.length > 0) {
        await fetchReactionsForComments(sortedComments.map((c: any) => c.id));
      }
    }
  };

  const fetchReactionsForComments = async (commentIds: string[]) => {
    if (!commentIds.length) return;

    const { data: reactionsData } = await supabase
      .from('user_wine_comment_reaction' as any)
      .select('*')
      .in('comment_id', commentIds) as { data: any[] | null };

    const reactionsMap: Record<string, { userReaction: number | null; likeCount: number }> = {};
    
    commentIds.forEach(commentId => {
      const commentReactions = reactionsData?.filter((r: any) => r.comment_id === commentId) || [];
      const userReaction = commentReactions.find((r: any) => r.user_id === user?.id);
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
    const nextPage = Math.floor(comments.length / COMMENTS_PER_PAGE);
    await fetchComments(nextPage);
    setIsLoadingMoreComments(false);
  };

  const handleSetLikeStatus = async (status: number) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour donner votre avis',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const newLiked = liked === status ? 0 : status;

    const { data: noticeData, error } = await supabase
      .from('user_wine_notice')
      .upsert({
        user_id: user.id,
        wine_id: wineData.wine_id,
        liked: newLiked as any,
        details: tastingDetails as any,
      } as any, {
        onConflict: 'user_id,wine_id'
      })
      .select('id')
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer votre avis",
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Enregistrer dans user_wine_notice_cellar
    if (noticeData?.id) {
      const { error: cellarNoticeError } = await supabase
        .from('user_wine_notice_cellar')
        .upsert({
          user_wine_notice_id: noticeData.id,
          cellar_id: cellarId,
        }, {
          onConflict: 'user_wine_notice_id,cellar_id'
        });

      if (cellarNoticeError) {
        console.error('Error saving to cellar notice:', cellarNoticeError);
      }
    }

    setLiked(newLiked);
    toast({
      title: newLiked === 1 ? "J'aime ajouté" : newLiked === -1 ? "Je n'aime pas ajouté" : 'Avis retiré',
    });
    setLoading(false);
  };

  const handleSaveTastingDetails = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour enregistrer votre dégustation',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: noticeData, error } = await supabase
      .from('user_wine_notice')
      .upsert({
        user_id: user.id,
        wine_id: wineData.wine_id,
        details: tastingDetails as any,
        liked: liked as any,
      } as any, {
        onConflict: 'user_id,wine_id'
      })
      .select('id')
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer votre dégustation",
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Enregistrer dans user_wine_notice_cellar
    if (noticeData?.id) {
      const { error: cellarNoticeError } = await supabase
        .from('user_wine_notice_cellar')
        .upsert({
          user_wine_notice_id: noticeData.id,
          cellar_id: cellarId,
        }, {
          onConflict: 'user_wine_notice_id,cellar_id'
        });

      if (cellarNoticeError) {
        console.error('Error saving to cellar notice:', cellarNoticeError);
      }
    }

    toast({
      title: 'Dégustation enregistrée',
    });
    setLoading(false);
  };

  const handlePostComment = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour commenter',
        variant: 'destructive',
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: 'Commentaire vide',
        description: 'Veuillez saisir un commentaire',
        variant: 'destructive',
      });
      return;
    }

    setIsPostingComment(true);

    const { error } = await supabase.from('user_wine_comment' as any).upsert({
      user_id: user.id,
      wine_id: wineData.wine_id,
      comment: newComment,
    }, {
      onConflict: 'user_id,wine_id'
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer votre commentaire",
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Commentaire enregistré',
      });
      setNewComment('');
      await fetchComments(0);
    }

    setIsPostingComment(false);
  };

  const handleEditComment = (userId: string, currentComment: string) => {
    setEditingCommentUserId(userId);
    setEditCommentText(currentComment);
  };

  const handleUpdateComment = async (userId: string) => {
    if (!user || user.id !== userId) return;

    if (!editCommentText.trim()) {
      toast({
        title: 'Commentaire vide',
        description: 'Veuillez saisir un commentaire',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('user_wine_comment' as any)
      .update({ comment: editCommentText })
      .eq('user_id', user.id)
      .eq('wine_id', wineData.wine_id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le commentaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Commentaire modifié',
      });
      setEditingCommentUserId(null);
      setEditCommentText('');
      await fetchComments(0);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentUserId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (commentUserId: string) => {
    if (!user || user.id !== commentUserId) return;

    const { error } = await supabase
      .from('user_wine_comment' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('wine_id', wineData.wine_id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le commentaire',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Commentaire supprimé',
      });
      await fetchComments(0);
    }
  };

  const handleCommentReaction = async (commentId: string, reaction: number) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour réagir',
        variant: 'destructive',
      });
      return;
    }

    const currentReaction = commentReactions[commentId]?.userReaction;
    
    if (currentReaction === reaction) {
      const { error } = await supabase
        .from('user_wine_comment_reaction' as any)
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de retirer la réaction',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_wine_comment_reaction' as any)
        .upsert({
          comment_id: commentId,
          user_id: user.id,
          reaction
        } as any, {
          onConflict: 'comment_id,user_id'
        });

      if (error) {
        toast({
          title: 'Erreur',
          description: "Impossible d'ajouter la réaction",
          variant: 'destructive',
        });
        return;
      }
    }

    await fetchReactionsForComments([commentId]);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter',
        variant: 'destructive',
      });
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorite')
        .delete()
        .eq('user_id', user.id)
        .eq('wine_id', wineData.wine_id);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de retirer ce vin de vos favoris',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Retiré des favoris',
        });
        setIsFavorite(false);
      }
    } else {
      const { error } = await supabase
        .from('user_favorite')
        .insert({
          user_id: user.id,
          wine_id: wineData.wine_id,
          domain_id: wineData.wine?.domain_id || null,
        });

      if (error) {
        toast({
          title: 'Erreur',
          description: "Impossible d'ajouter ce vin à vos favoris",
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ajouté aux favoris',
        });
        setIsFavorite(true);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      if (wineData.label_url) {
        const oldPath = wineData.label_url.split('/').slice(-2).join('/');
        await supabase.storage.from('cellar').remove([oldPath]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${wineData.wine_id}-${Date.now()}.${fileExt}`;
      const filePath = `${cellarId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cellar')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cellar')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('cellar_wine' as any)
        .update({ label_url: publicUrl })
        .eq('cellar_id', cellarId)
        .eq('wine_id', wineData.wine_id);

      if (updateError) throw updateError;

      toast({
        title: 'Succès',
        description: 'Photo mise à jour',
      });

      onUpdated();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger la photo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!wineData.label_url) return;
    
    setUploading(true);

    try {
      const oldPath = wineData.label_url.split('/').slice(-2).join('/');
      await supabase.storage.from('cellar').remove([oldPath]);

      const { error: updateError } = await supabase
        .from('cellar_wine' as any)
        .update({ label_url: null })
        .eq('cellar_id', cellarId)
        .eq('wine_id', wineData.wine_id);

      if (updateError) throw updateError;

      toast({
        title: 'Succès',
        description: 'Photo supprimée',
      });

      onUpdated();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la photo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!user || !isOwner) return;
    
    setLoading(true);

    const updates = {
      description: editedDescription || null,
      quantity: editedQuantity,
      price: editedPrice === 0 ? null : editedPrice,
    };

    const { error } = await supabase
      .from('cellar_wine' as any)
      .update(updates)
      .eq('cellar_id', cellarId)
      .eq('wine_id', wineData.wine_id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Vin mis à jour',
      });
      setIsEditing(false);
      onUpdated();
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);

    try {
      if (wineData.label_url) {
        const oldPath = wineData.label_url.split('/').slice(-2).join('/');
        await supabase.storage.from('cellar').remove([oldPath]);
      }

      const { error } = await supabase
        .from('cellar_wine' as any)
        .delete()
        .eq('cellar_id', cellarId)
        .eq('wine_id', wineData.wine_id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vin supprimé de la cave',
      });
      onClose();
      onUpdated();
    } catch (error) {
      console.error('Error deleting wine:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le vin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!wineData.wine) return null;

  const content = (
    <>
      <div className="flex flex-col gap-6 w-full overflow-x-hidden">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg md:text-2xl font-bold break-words flex-1 min-w-0">{wineData.wine.name}</h2>
            {/* Sur desktop seulement : bouton à droite du titre */}
            {isOwner && !isMobile && (
              <Button
                variant={isEditing ? 'secondary' : 'outline'}
                onClick={() => setIsEditing(!isEditing)}
                size="sm"
                className="shrink-0"
              >
                {isEditing ? 'Annuler' : 'Modifier'}
              </Button>
            )}
          </div>
          {/* Sur mobile seulement : bouton en dessous du titre */}
          {isOwner && isMobile && (
            <Button
              variant={isEditing ? 'secondary' : 'outline'}
              onClick={() => setIsEditing(!isEditing)}
              size="sm"
              className="w-full"
            >
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Image */}
          <div className="flex justify-center">
            <img
              src={wineData.label_url || wineData.wine.label_url || '/placeholder.svg'}
              alt={wineData.wine.name}
              className="w-full max-w-[200px] object-contain"
            />
          </div>

          {/* Info Section */}
          <div className="space-y-4 px-2">
            <div>
              <h3 className="text-xl md:text-2xl font-bold break-words">{wineData.wine.name}</h3>
              {domain && (
                <p className="text-muted-foreground">
                  {domain.name}
                  {wineData.wine.year && ` • ${wineData.wine.year}`}
                </p>
              )}
            </div>

            {/* Price Display */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prix</span>
              <span className="text-lg font-bold text-primary">
                {getPriceDisplay(wineData.price)}
              </span>
            </div>

            {/* Description */}
            {!isEditing && (wineData.description || wineData.wine.description) && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{wineData.description || wineData.wine.description}</p>
              </div>
            )}

            {/* Owner Edit Mode */}
            {isOwner && isEditing && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label>Description personnalisée</Label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder={wineData.wine.description || 'Description...'}
                  />
                </div>

                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editedQuantity}
                    onChange={(e) => setEditedQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label>Prix (optionnel)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedPrice === null ? '' : editedPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditedPrice(val === '' ? null : parseFloat(val));
                    }}
                    placeholder="Laisser vide pour 'Prix en attente'"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Si vide ou 0, "Prix en attente" sera affiché
                  </p>
                </div>

                <div>
                  <Label>Photo personnalisée</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {wineData.label_url && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        disabled={uploading}
                        onClick={handleDeleteImage}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button onClick={handleSaveEdits} disabled={loading} className="w-full">
                  Enregistrer les modifications
                </Button>
              </div>
            )}

            {/* Favorite Button */}
            {user && (
              <Button
                variant="outline"
                onClick={handleToggleFavorite}
                className="w-full"
              >
                <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="border-t pt-6 mt-6 px-2">
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'tasting' ? 'default' : 'outline'}
              onClick={() => setActiveTab('tasting')}
              className="flex-1 text-xs md:text-sm"
            >
              <Lock className="w-3 h-3 md:mr-2" />
              <span className="hidden md:inline">Mes impressions de dégustation</span>
              <span className="md:hidden">Dégustation</span>
            </Button>
            <Button
              variant={activeTab === 'comments' ? 'default' : 'outline'}
              onClick={() => setActiveTab('comments')}
              className="flex-1 text-xs md:text-sm"
            >
              <MessageSquare className="w-3 h-3 md:mr-2" />
              <span className="hidden md:inline">Commentaires</span>
              <span className="md:hidden">Avis</span>
            </Button>
          </div>

          {/* Tasting Tab */}
          {activeTab === 'tasting' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Vos impressions de dégustation restent personnelles et privées
              </p>

              <div className="space-y-2">
                <Label>Mon avis sur cette bouteille</Label>
                <div className="flex gap-2">
                  <Button
                    variant={liked === 1 ? 'default' : 'outline'}
                    onClick={() => handleSetLikeStatus(1)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ThumbsUp className={`h-4 w-4 mr-2 ${liked === 1 ? 'fill-current' : ''}`} />
                    J'aime
                  </Button>
                  <Button
                    variant={liked === -1 ? 'default' : 'outline'}
                    onClick={() => handleSetLikeStatus(-1)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ThumbsDown className={`h-4 w-4 mr-2 ${liked === -1 ? 'fill-current' : ''}`} />
                    Je n'aime pas
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
              <div>
                <Label>Acidité</Label>
                <Slider
                  value={[tastingDetails.acidity]}
                  onValueChange={([val]) => setTastingDetails(prev => ({ ...prev, acidity: Math.round(val * 10) / 10 }))}
                  min={0}
                  max={10}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1">{tastingDetails.acidity.toFixed(1)}/10 • 0 = Très faible • 10 = Très marquée</p>
              </div>
              <div>
                <Label>Tanins</Label>
                <Slider
                  value={[tastingDetails.tannins]}
                  onValueChange={([val]) => setTastingDetails(prev => ({ ...prev, tannins: Math.round(val * 10) / 10 }))}
                  min={0}
                  max={10}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1">{tastingDetails.tannins.toFixed(1)}/10 • 0 = Très doux • 10 = Très tannique</p>
              </div>
              <div>
                <Label>Corps</Label>
                <Slider
                  value={[tastingDetails.body]}
                  onValueChange={([val]) => setTastingDetails(prev => ({ ...prev, body: Math.round(val * 10) / 10 }))}
                  min={0}
                  max={10}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1">{tastingDetails.body.toFixed(1)}/10 • 0 = Très léger • 10 = Très corpulent</p>
              </div>
              <div>
                <Label>Douceur</Label>
                <Slider
                  value={[tastingDetails.sweetness]}
                  onValueChange={([val]) => setTastingDetails(prev => ({ ...prev, sweetness: Math.round(val * 10) / 10 }))}
                  min={0}
                  max={10}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground mt-1">{tastingDetails.sweetness.toFixed(1)}/10 • 0 = Très sec • 10 = Très sucré</p>
              </div>
              </div>

              <div>
                <Label htmlFor="remarks">Remarques supplémentaires</Label>
                <Textarea
                  id="remarks"
                  placeholder="Vos impressions personnelles..."
                  value={tastingDetails.remarks}
                  onChange={(e) => setTastingDetails(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveTastingDetails} disabled={loading} className="w-full">
                Enregistrer mes impressions
              </Button>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              {user && !comments.find(c => c.user_id === user.id) && (
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
            <ScrollArea className="h-[400px] lg:h-[500px] w-full">
              <div className="space-y-4 pr-2 w-full">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3 md:p-4 w-full overflow-hidden">
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
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => navigate(`/user/${comment.user_id}`)}
                                  className="cursor-pointer hover:opacity-80 shrink-0"
                                >
                                  <Avatar>
                                    <AvatarImage src={comment.user_profiles?.logo_adress || undefined} />
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                </button>
                                <div className="min-w-0 flex-1">
                                  <button
                                    onClick={() => navigate(`/user/${comment.user_id}`)}
                                    className="font-medium hover:underline cursor-pointer truncate block max-w-full"
                                  >
                                    {comment.user_profiles?.full_name || 'Utilisateur'}
                                  </button>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(comment.created_at), 'dd MMM yyyy', { locale: fr })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm mb-3 break-words">{comment.comment}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCommentReaction(comment.id, 1)}
                                className={`text-xs ${commentReactions[comment.id]?.userReaction === 1 ? 'text-primary' : ''}`}
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                {commentReactions[comment.id]?.likeCount || 0}
                              </Button>

                              {comment.user_id === user?.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditComment(comment.user_id, comment.comment)}
                                    className="text-xs"
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    <span className="hidden sm:inline">Modifier</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comment.user_id)}
                                    className="text-xs"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    <span className="hidden sm:inline">Supprimer</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Infinite scroll sentinel */}
                    {hasMoreComments && (
                      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                        {isLoadingMoreComments && (
                          <p className="text-sm text-muted-foreground">Chargement...</p>
                        )}
                      </div>
                    )}

                    {!hasMoreComments && comments.length >= COMMENTS_PER_PAGE && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tous les commentaires ont été chargés
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Owner Delete Button */}
        {isOwner && (
          <div className="border-t pt-4 mt-6 px-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer de la cave
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Voulez-vous vraiment supprimer ce vin de votre cave ? Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          className="max-h-[90dvh] h-[90dvh] overflow-y-auto overflow-x-hidden w-full p-4"
          style={{
            top: '80px',
            height: 'calc(100dvh - 80px)'
          }}
        >
          <SheetHeader>
            <SheetTitle className="sr-only">{wineData.wine.name}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{wineData.wine.name}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
