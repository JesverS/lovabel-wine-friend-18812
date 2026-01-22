import { useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const SocialFeed = () => {
  const { user } = useAuth();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useSocialFeed();

  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll avec IntersectionObserver
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "100px",
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Message pour les utilisateurs non connectés
  if (!user) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">La communauté Wine Note</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les dernières trouvailles et recommandations de nos membres
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center glass-card">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Users className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-3">Rejoignez la communauté</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connectez-vous pour découvrir les dégustations, notes et partages de nos membres passionnés de vin
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>
    );
  }

  const allPosts = data?.pages.flatMap((page) => page.posts) || [];

  if (isLoading) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">La communauté Wine Note</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les dernières trouvailles et recommandations de nos membres
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            {[...Array(3)].map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center py-12 text-muted-foreground">
            Une erreur est survenue lors du chargement des posts
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">La communauté Wine Note</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les dernières trouvailles et recommandations de nos membres
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {allPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Aucun post à afficher pour le moment</div>
          ) : (
            allPosts.map((post) => <PostCard key={post.id} post={post} preloadedData />)
          )}
        </div>

        {/* Trigger pour infinite scroll */}
        <div ref={observerRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>

        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-center text-sm text-muted-foreground mt-4">Vous avez vu tous les posts</p>
        )}
      </div>
    </section>
  );
};
