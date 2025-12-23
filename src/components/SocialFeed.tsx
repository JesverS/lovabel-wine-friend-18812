import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/PostCard";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const POSTS_PER_PAGE = 10;

export const SocialFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async (pageNumber = 0) => {
    if (pageNumber === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Requête simplifiée - RLS filtre automatiquement les posts visibles
      // Une seule requête au lieu de 2-3 requêtes séparées
      const { data, error } = await supabase
        .from('post')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNumber * POSTS_PER_PAGE, (pageNumber + 1) * POSTS_PER_PAGE - 1);

      if (error) {
        console.error('Erreur lors du chargement des posts:', error);
        return;
      }

      const newPosts = data || [];

      if (pageNumber === 0) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setHasMore(newPosts.length >= POSTS_PER_PAGE);
    } catch (error) {
      console.error('Erreur lors du chargement des posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage);
  };

  if (loading) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            La communauté Lovabel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les dernières trouvailles et recommandations de nos membres
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun post à afficher pour le moment
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>

        {hasMore && posts.length > 0 && (
          <div className="text-center mt-8">
            <Button 
              size="lg" 
              variant="outline" 
              className="hover-lift"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Chargement...
                </>
              ) : (
                'Voir plus de posts'
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
