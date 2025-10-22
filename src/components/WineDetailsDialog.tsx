import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
}: WineDetailsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [comments, setComments] = useState<UserComment[]>([]);

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

      // Fetch private tasting notes
      const { data: noticeData } = await supabase
        .from("user_wine_notice")
        .select("*")
        .eq("user_id", user.id)
        .eq("wine_id", wine.id)
        .is("event_id", null)
        .maybeSingle();

      if (noticeData && noticeData.details && typeof noticeData.details === 'object' && !Array.isArray(noticeData.details)) {
        const details = noticeData.details as any;
        setTastingDetails({
          acidity: details.acidity || 3,
          tannins: details.tannins || 3,
          body: details.body || 3,
          sweetness: details.sweetness || 3,
          remarks: details.remarks || "",
        });
      }

      // Fetch public comments
      const { data: commentsData } = await supabase
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
        .order("created_at", { ascending: false });

      if (commentsData) {
        setComments(commentsData as any);
      }
    };

    fetchData();
  }, [user, wine.id, wine.domain_id]);

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif flex items-center justify-between">
            <span>{wine.name}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
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
                    <p className="text-xl font-semibold">{domain.name}</p>
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

          {/* Private Tasting Notes */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Mes impressions de dégustation</h3>
              <div className="bg-muted/50 border border-border rounded-lg px-3 py-1">
                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <span className="text-primary">🔒</span>
                  Vos impressions de dégustation restent personnelles et privées
                </p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </div>

          {/* Public Comments Section */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold mb-4">Commentaires des utilisateurs</h3>
            
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun commentaire pour l'instant
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.user_id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={comment.user_profiles?.logo_adress || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {comment.user_profiles?.full_name || "Utilisateur"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
