import { useRef, useEffect, useCallback } from "react";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { Loader2 } from "lucide-react";

export const SocialFeed = () => {
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

  const allPosts = data?.pages.flatMap((page) => page) || [];

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
