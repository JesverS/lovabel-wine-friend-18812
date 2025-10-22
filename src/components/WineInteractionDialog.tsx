import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Heart, MessageSquare, FileText, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState<boolean | null>(null);
  const [publicComment, setPublicComment] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string } | null>(null);

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
        .eq("event_id", eventId)
        .maybeSingle();

      if (noticeData) {
        setLiked(noticeData.liked);
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

      // Fetch public comment
      const { data: commentData } = await supabase
        .from("user_wine_comment" as any)
        .select("comment")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .maybeSingle();

      if (commentData) {
        setPublicComment((commentData as any)?.comment || "");
      }

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

  const handleToggleLike = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour liker un vin",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const newLiked = !liked;

    const { error } = await supabase.from("user_wine_notice").upsert({
      user_id: user.id,
      wine_id: wine.id,
      event_id: eventId,
      liked: newLiked,
    }, {
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
        title: newLiked ? "J'aime ajouté" : "J'aime retiré",
      });
    }

    setLoading(false);
  };

  const handleSaveComment = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour commenter",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("user_wine_comment" as any).upsert({
      user_id: user.id,
      wine_id: wine.id,
      comment: publicComment || null,
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
        title: "Commentaire public enregistré",
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
      event_id: eventId,
      details: tastingDetails as any,
      liked,
    }, {
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
              variant={liked ? "default" : "outline"}
              onClick={handleToggleLike}
              disabled={loading}
              className="flex-1"
            >
              <Heart className={`h-4 w-4 mr-2 ${liked ? "fill-current" : ""}`} />
              {liked ? "J'aime" : "J'aime cette bouteille"}
            </Button>
            <Button
              variant={isFavorite ? "default" : "outline"}
              onClick={handleToggleFavorite}
              disabled={loading}
              className="flex-1"
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
              <div>
                <Label htmlFor="comment">Votre commentaire public</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ce commentaire sera visible par tous les utilisateurs
                </p>
                <Textarea
                  id="comment"
                  placeholder="Partagez votre impression sur ce vin..."
                  value={publicComment}
                  onChange={(e) => setPublicComment(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveComment} disabled={loading} className="w-full">
                Enregistrer le commentaire
              </Button>
            </TabsContent>

              <TabsContent value="tasting" className="space-y-6">
              <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <span className="text-primary">🔒</span>
                  Ces notes de dégustation restent personnelles et privées
                </p>
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
