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
import { Helmet } from 'react-helmet-async';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TastingSlidersGrid } from '@/components/TastingSliders';
import { TastingDetails, migrateTastingDetails, tastingDetailsToDbFormat } from '@/lib/tastingSliderConfig';

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
    slot1: 5.0,
    slot2: 5.0,
    slot3: 5.0,
    slot4: 5.0,
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
      .maybeSingle();
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
    if (user && wineData) {
      await fetchUserTastingData();
      if ((wineData as any).domain_id) {
        await fetchFavoriteStatus((wineData as any).domain_id);
      }
    }

    setLoading(false);
  };

  const fetchUserTastingData = async () => {
    if (!user || !id) return;

    const { data: noticeData } = await supabase
      .from('user_wine_notice' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('wine_id', id)
      .maybeSingle();

    if (noticeData) {
      setLiked((noticeData as any).liked || 0);
      if ((noticeData as any).details) {
        const migrated = migrateTastingDetails((noticeData as any).details);
        setTastingDetails(migrated);
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
            liked,
            details: tastingDetailsToDbFormat(tastingDetails),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,wine_id' }
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

  const wineSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": wine.name,
    "description": wine.description || `Vin ${wine.name}`,
    "image": wine.label_url,
    "brand": {
      "@type": "Brand",
      "name": domaine?.name || "Domaine inconnu"
    },
    "category": "Wine",
    ...(wine.price && {
      "offers": {
        "@type": "Offer",
        "price": wine.price,
        "priceCurrency": "EUR"
      }
    })
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{wine.name} {wine.year ? `(${wine.year})` : ''} | Vin - Wine Note</title>
        <meta name="description" content={wine.description?.slice(0, 155) || `Découvrez ${wine.name}${domaine ? ` du domaine ${domaine.name}` : ''}`} />
        <link rel="canonical" href={`https://winenote.me/wine/${id}`} />
        <meta property="og:title" content={`${wine.name} - Wine Note`} />
        <meta property="og:description" content={wine.description?.slice(0, 155) || `Vin ${wine.name}`} />
        {wine.label_url && <meta property="og:image" content={wine.label_url} />}
        <meta property="og:url" content={`https://winenote.me/wine/${id}`} />
        <meta property="og:type" content="product" />
        <script type="application/ld+json">
          {JSON.stringify(wineSchema)}
        </script>
      </Helmet>

      <Header />
      
      <main className="container mx-auto px-4 py-12 pt-32 flex-grow min-h-screen">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Accueil</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {domaine && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/domain/${domaine.id}`}>{domaine.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{wine.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
                  aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  className={isFavorite ? "text-red-500 border-red-500 hover:bg-red-50" : ""}
                >
                  {loadingFavorite ? (
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} aria-hidden="true" />
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

              {/* Characteristics Sliders - dynamiques selon le type */}
              <TastingSlidersGrid
                wineTypeId={wine.type}
                values={{
                  slot1: tastingDetails.slot1,
                  slot2: tastingDetails.slot2,
                  slot3: tastingDetails.slot3,
                  slot4: tastingDetails.slot4,
                }}
                onChange={(key, value) => setTastingDetails(prev => ({ ...prev, [key]: value }))}
              />

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
