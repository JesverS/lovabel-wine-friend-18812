import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string;
  publishedAt: string | null;
  readingTime?: number;
}

export const BlogCard = ({
  slug,
  title,
  excerpt,
  coverImage,
  category,
  publishedAt,
  readingTime = 5,
}: BlogCardProps) => {
  return (
    <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-card">
      <Link to={`/blog/${slug}`}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-4xl">📝</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {category}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5">
          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(publishedAt), "d MMM yyyy", { locale: fr })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} min
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
              {excerpt}
            </p>
          )}

          {/* Read more */}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
            Lire l'article
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Link>
    </Card>
  );
};
