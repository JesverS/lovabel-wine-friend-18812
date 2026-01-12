import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wine, MapPin, Calendar, Sparkles, Heart, ThumbsUp, ThumbsDown, Save, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { wineNoticeSchema } from '@/lib/validation-schemas';

interface TastingDetails {
  rating: number;
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
  remarks: string;
}

export default function WineDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [wine, setWine] = useState<any>(null);
  const [domaine, setDomaine] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tasting states
  const [isFavorite, setIsFavorite] = useState(false);
  const [liked, setLiked] = useState<number>(0);
  const [tastingDetails, setTastingDetails] = useState<TastingDetails>({
    rating: 5.0,
    acidity: 5.0,
    tannins: 5.0,
    body: 5.0,
    sweetness: 5.0,
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWineData();
    }
  }, [id, user]);

  const fetchWineData = async () => {
    setLoading(true);

    // Fetch wine details
    const { data: wineData } = await supabase
      .from('wine' as any)
      .select('*')
      .eq('id', id)
      .single();
    setWine(wineData);

    // Fetch domain
    let domainData = null;
    if ((wineData as any)?.domain_id) {
      const { data } = await supabase
        .from('domain' as any)
        .select('*')
        .eq('id', (wineData as any).domain_id)
        .single();
      domainData = data;
      setDomaine(data);
    }

    // Fetch posts mentioning this wine
    const { data: postsData } = await supabase
      .from('post' as any)
      .select('*')
      .eq('wine_id', id)
      .order('created_at', { ascending: false });
    setPosts(postsData || []);

    // If user is logged in, fetch their tasting data and favorites
    if (user && wineData && domainData) {
      await fetchUserTastingData((wineData as any).domain_id);
      await fetchFavoriteStatus((wineData as any).domain_id);
    }

    setLoading(false);
  };

  const fetchUserTastingData = async (domainId: string) => {
    if (!user || !id) return;

    const { data: noticeData } = await supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('wine_id', id)
      .eq('domain_id', domainId)
      .maybeSingle();

    if (noticeData) {
      setLiked((noticeData as any).liked || 0);
      if ((noticeData as any).details) {
        setTastingDetails({
          rating: (noticeData as any).details.rating ?? 5.0,
          acidity: (noticeData as any).details.acidity ?? 5.0,
          tannins: (noticeData as any).details.tannins ?? 5.0,
          body: (noticeData as any).details.body ?? 5.0,
          sweetness: (noticeData as any).details.sweetness ?? 5.0,
          remarks: (noticeData as any).details.remarks ?? '',
        });
      }
    }
  };

  const fetchFavoriteStatus = async (domainId: string) => {
    if (!user || !id) return;

    const { data: favoriteData } = await supabase
      .from('user_favorite' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('wine_id', id)
      .eq('domain_id', domainId)
      .maybeSingle();

    setIsFavorite(!!favoriteData);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ajouter aux favoris.",
        variant: "destructive",
      });
      return;
    }

    if (!wine?.domain_id) {
      toast({
        title: "Erreur",
        description: "Ce vin n'a pas de domaine associé.",
        variant: "destructive",
      });
      return;
    }

    setLoadingFavorite(true);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorite' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('wine_id', id)
          .eq('domain_id', wine.domain_id);

        if (error) {
          console.error('Favorite delete error:', error);
          toast({
            title: "Erreur",
            description: `Impossible de retirer des favoris: ${error.message} (${error.code})`,
            variant: "destructive",
          });
          return;
        }

        setIsFavorite(false);
        toast({
          title: "Retiré des favoris",
          description: "Ce vin a été retiré de vos favoris.",
        });
      } else {
        const { error } = await supabase
          .from('user_favorite' as any)
          .insert({
            user_id: user.id,
            wine_id: id,
            domain_id: wine.domain_id,
          });

        if (error) {
          console.error('Favorite insert error:', error);
          toast({
            title: "Erreur",
            description: `Impossible d'ajouter aux favoris: ${error.message} (${error.code})`,
            variant: "destructive",
          });
          return;
        }

        setIsFavorite(true);
        toast({
          title: "Ajouté aux favoris",
          description: "Ce vin a été ajouté à vos favoris.",
        });
      }
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleSetLikeStatus = async (newLiked: number) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour noter ce vin.",
        variant: "destructive",
      });
      return;
    }

    // Toggle if clicking same button
    const finalLiked = liked === newLiked ? 0 : newLiked;
    setLiked(finalLiked);
  };

  const handleSaveTastingDetails = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour enregistrer vos notes.",
        variant: "destructive",
      });
      return;
    }

    if (!wine?.domain_id) {
      toast({
        title: "Erreur",
        description: "Ce vin n'a pas de domaine associé.",
        variant: "destructive",
      });
      return;
    }

    // Validate with zod
    try {
      wineNoticeSchema.parse({
        liked,
        details: tastingDetails,
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({
          title: "Erreur de validation",
          description: e.errors[0]?.message || "Données invalides",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_wine_notice' as any)
        .upsert(
          {
            user_id: user.id,
            wine_id: id,
            domain_id: wine.domain_id,
            liked,
            details: tastingDetails,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,wine_id,domain_id' }
        );

      if (error) {
        console.error('Save tasting error:', error);
        toast({
          title: "Erreur",
          description: `Impossible d'enregistrer: ${error.message} (${error.code})`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Notes enregistrées",
        description: "Vos notes de dégustation ont été sauvegardées.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!wine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Bouteille introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-12 pt-32 flex-grow min-h-screen">
        {/* Wine Header */}
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div className="flex justify-center">
            {wine.label_url ? (
              <img
                src={wine.label_url}
                alt={wine.name}
                loading="lazy"
                className="max-w-sm w-full h-auto object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-64 h-96 bg-muted rounded-lg flex items-center justify-center">
                <Wine className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{wine.name}</h1>
                {domaine && (
                  <Link to={`/domain/${domaine.id}`} className="text-xl text-primary hover:underline">
                    {domaine.name}
                  </Link>
                )}
              </div>
              
              {/* Favorite Button */}
              {user && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleFavorite}
                  disabled={loadingFavorite}
                  className={isFavorite ? "text-red-500 border-red-500 hover:bg-red-50" : ""}
                >
                  {loadingFavorite ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
                  )}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-muted-foreground">
              {wine.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{wine.year}</span>
                </div>
              )}
              {wine.characteristics?.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{wine.characteristics.region}</span>
                </div>
              )}
              {wine.characteristics?.style && (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{wine.characteristics.style}</span>
                </div>
              )}
            </div>

            {wine.description && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-foreground leading-relaxed">{wine.description}</p>
              </div>
            )}

            {wine.characteristics && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Caractéristiques</h2>
                <div className="space-y-2">
                  {wine.characteristics.color && (
                    <p><span className="font-medium">Couleur:</span> {wine.characteristics.color}</p>
                  )}
                  {wine.characteristics.grapes && (
                    <p><span className="font-medium">Cépages:</span> {wine.characteristics.grapes}</p>
                  )}
                  {wine.alcohol_percentage && (
                    <p><span className="font-medium">Alcool:</span> {wine.alcohol_percentage}%</p>
                  )}
                </div>
              </div>
            )}

            {wine.price && (
              <div className="text-3xl font-bold text-primary">{wine.price} €</div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {wine.website_order_url && (
                <Button asChild size="lg" className="flex-1">
                  <a href={wine.website_order_url} target="_blank" rel="noopener noreferrer">
                    Commander sur le site
                  </a>
                </Button>
              )}
              {domaine && (
                <Button asChild size="lg" variant="outline" className="flex-1">
                  <Link to={`/domain/${domaine.id}`}>
                    Commander auprès du domaine
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tasting Section - Only visible when logged in */}
        {user && (
          <Card className="max-w-4xl mx-auto mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="w-5 h-5" />
                Mes notes de dégustation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Like/Dislike Buttons */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">Mon avis :</span>
                <div className="flex gap-2">
                  <Button
                    variant={liked === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetLikeStatus(1)}
                    className={liked === 1 ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    J'aime
                  </Button>
                  <Button
                    variant={liked === -1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetLikeStatus(-1)}
                    className={liked === -1 ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    Je n'aime pas
                  </Button>
                </div>
              </div>

              {/* Rating Slider */}
              <div className="space-y-2">
                <Label className="flex justify-between">
                  <span>Note globale</span>
                  <span className="font-bold text-primary">{tastingDetails.rating.toFixed(1)}/10</span>
                </Label>
                <Slider
                  value={[tastingDetails.rating]}
                  onValueChange={([v]) => setTastingDetails(prev => ({ ...prev, rating: v }))}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </div>

              {/* Characteristics Sliders */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    <span>Acidité</span>
                    <span className="text-muted-foreground">{tastingDetails.acidity.toFixed(1)}</span>
                  </Label>
                  <Slider
                    value={[tastingDetails.acidity]}
                    onValueChange={([v]) => setTastingDetails(prev => ({ ...prev, acidity: v }))}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between">
                    <span>Tanins</span>
                    <span className="text-muted-foreground">{tastingDetails.tannins.toFixed(1)}</span>
                  </Label>
                  <Slider
                    value={[tastingDetails.tannins]}
                    onValueChange={([v]) => setTastingDetails(prev => ({ ...prev, tannins: v }))}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between">
                    <span>Corps</span>
                    <span className="text-muted-foreground">{tastingDetails.body.toFixed(1)}</span>
                  </Label>
                  <Slider
                    value={[tastingDetails.body]}
                    onValueChange={([v]) => setTastingDetails(prev => ({ ...prev, body: v }))}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex justify-between">
                    <span>Douceur</span>
                    <span className="text-muted-foreground">{tastingDetails.sweetness.toFixed(1)}</span>
                  </Label>
                  <Slider
                    value={[tastingDetails.sweetness]}
                    onValueChange={([v]) => setTastingDetails(prev => ({ ...prev, sweetness: v }))}
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-2">
                <Label>Remarques personnelles</Label>
                <Textarea
                  value={tastingDetails.remarks}
                  onChange={(e) => setTastingDetails(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Décrivez vos impressions, les arômes perçus, les accords mets-vins..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {tastingDetails.remarks.length}/500 caractères
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveTastingDetails}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer mes notes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Posts Section */}
        {posts.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Ce qu'en disent les amateurs</h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
