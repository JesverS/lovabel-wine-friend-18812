import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { Wine, MapPin, Calendar, Sparkles } from 'lucide-react';

export default function WineDetails() {
  const { id } = useParams<{ id: string }>();
  const [wine, setWine] = useState<any>(null);
  const [domaine, setDomaine] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWineData();
    }
  }, [id]);

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
    if ((wineData as any)?.domain_id) {
      const { data: domainData } = await supabase
        .from('domain' as any)
        .select('*')
        .eq('id', (wineData as any).domain_id)
        .single();
      setDomaine(domainData);
    }

    // Fetch posts mentioning this wine
    const { data: postsData } = await supabase
      .from('post' as any)
      .select('*')
      .eq('wine_id', id)
      .order('created_at', { ascending: false });
    setPosts(postsData || []);

    setLoading(false);
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Wine Header */}
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div className="flex justify-center">
            {wine.label_url ? (
              <img
                src={wine.label_url}
                alt={wine.name}
                className="max-w-sm w-full h-auto object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-64 h-96 bg-muted rounded-lg flex items-center justify-center">
                <Wine className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{wine.name}</h1>
              {domaine && (
                <Link to={`/domaine/${domaine.id}`} className="text-xl text-primary hover:underline">
                  {domaine.name}
                </Link>
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
              {wine.uber_order_url && (
                <Button asChild size="lg" className="flex-1">
                  <a href={wine.uber_order_url} target="_blank" rel="noopener noreferrer">
                    Commander via Merit (Uber Eats)
                  </a>
                </Button>
              )}
              {domaine && (
                <Button asChild size="lg" variant="outline" className="flex-1">
                  <Link to={`/domaine/${domaine.id}`}>
                    Commander auprès du domaine
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

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
