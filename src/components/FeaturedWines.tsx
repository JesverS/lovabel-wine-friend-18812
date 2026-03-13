import { Link } from "react-router-dom";
import { useRecentWines } from "@/hooks/useRecentWines";
import { Skeleton } from "@/components/ui/skeleton";
import { Wine, ChevronRight } from "lucide-react";

const DEFAULT_LABEL = "https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png";

export const FeaturedWines = () => {
  const { data: wines, isLoading } = useRecentWines(14);

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8">
            Dernières <span className="text-gradient-wine">découvertes</span>
          </h2>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40">
                <Skeleton className="w-40 h-52 rounded-xl" />
                <Skeleton className="w-28 h-4 mt-3" />
                <Skeleton className="w-20 h-3 mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!wines || wines.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Wine className="h-7 w-7 text-primary" />
            <h2 className="font-serif text-3xl md:text-4xl font-bold">
              Dernières <span className="text-gradient-wine">découvertes</span>
            </h2>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
          {wines.map((wine) => (
            <Link
              key={wine.id}
              to={`/wine/${wine.id}`}
              className="group flex-shrink-0 w-40 snap-start"
            >
              <div className="relative w-40 h-52 rounded-xl overflow-hidden bg-card border border-border/60 shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-300">
                <img
                  src={wine.label_url || DEFAULT_LABEL}
                  alt={wine.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {wine.year && (
                  <span className="absolute bottom-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground border border-border/40">
                    {wine.year}
                  </span>
                )}
              </div>
              <div className="mt-3 px-0.5">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {wine.name}
                </p>
                {wine.domain_name && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {wine.domain_name}
                  </p>
                )}
              </div>
            </Link>
          ))}

          {/* Fade-out edge hint */}
          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </section>
  );
};
