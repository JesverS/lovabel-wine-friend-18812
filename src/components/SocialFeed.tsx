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
      let followedPosts: any[] = [];
      let randomPosts: any[] = [];

      // Si l'utilisateur est connecté, charger 70% de posts des utilisateurs suivis
      if (user) {
        const { data: following } = await supabase
          .from('user_follow')
          .select('following_id')
          .eq('follower_id', user.id);

        if (following && following.length > 0) {
          const followingIds = following.map(f => f.following_id);
          const followedCount = Math.ceil(POSTS_PER_PAGE * 0.7);

          const { data } = await supabase
            .from('post')
            .select('*')
            .in('user_id', followingIds)
            .order('created_at', { ascending: false })
            .range(pageNumber * followedCount, (pageNumber + 1) * followedCount - 1);

          followedPosts = data || [];
        }
      }

      // Calculer le nombre de posts aléatoires nécessaires
      const targetTotal = POSTS_PER_PAGE;
      const randomCount = targetTotal - followedPosts.length;

      if (randomCount > 0) {
        let randomQuery = supabase
          .from('post')
          .select('*')
          .order('created_at', { ascending: false })
          .range(pageNumber * randomCount, (pageNumber + 1) * randomCount - 1);

        // Exclure les posts des utilisateurs suivis si applicable
        if (user && followedPosts.length > 0) {
          const followingIds = followedPosts.map(p => p.user_id);
          randomQuery = randomQuery.not('user_id', 'in', `(${followingIds.join(',')})`);
        }

        const { data: randomData } = await randomQuery;
        randomPosts = randomData || [];
      }

      // Mélanger les posts
      const allNewPosts = [...followedPosts, ...randomPosts];
      const shuffled = allNewPosts.sort(() => Math.random() - 0.5);

      if (pageNumber === 0) {
        setPosts(shuffled);
      } else {
        setPosts(prev => [...prev, ...shuffled]);
      }

      setHasMore(shuffled.length >= POSTS_PER_PAGE);
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
