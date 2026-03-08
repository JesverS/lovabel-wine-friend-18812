import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Star, Trash2, Instagram } from 'lucide-react';

interface TastingCardProps {
  tasting: {
    id: string;
    wine_id: string;
    created_at: string;
    liked: number;
    rating: number | null;
    comment: string | null;
    details: any;
    wine: {
      id: string;
      name: string;
      year: number | null;
      label_url: string | null;
      type: number | null;
    };
    domain: {
      name: string;
      logo_url: string | null;
    };
  };
  isOwnProfile: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onShareStory?: () => void;
}

export const TastingCard = ({ tasting, isOwnProfile, onSelect, onDelete, onShareStory }: TastingCardProps) => {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {tasting.wine.label_url && (
            <img
              src={tasting.wine.label_url}
              alt={tasting.wine.name}
              className="w-20 h-20 object-cover rounded flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Top row: title + actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{tasting.wine.name}</h3>
                <p className="text-sm text-muted-foreground">{tasting.domain.name}</p>
              </div>
              {isOwnProfile && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); onShareStory?.(); }}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Details + rating */}
            <div className="flex items-end justify-between mt-1">
              <div className="min-w-0">
                {tasting.wine.year && (
                  <p className="text-sm text-muted-foreground">Année: {tasting.wine.year}</p>
                )}
                {tasting.comment && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {tasting.comment}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Dégusté le {new Date(tasting.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {tasting.rating && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span className="text-sm font-semibold">{tasting.rating}/5</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
