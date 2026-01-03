import { MapPin, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WineCardProps {
  name: string;
  domain: string;
  year: number;
  region: string;
  price: number;
  imageUrl: string;
  available?: boolean;
  distance?: string;
  tags?: string[];
}

export const WineCard = ({
  name,
  domain,
  year,
  region,
  price,
  imageUrl,
  available,
  distance,
  tags = [],
}: WineCardProps) => {
  // Déterminer le statut de disponibilité
  const getAvailabilityBadge = () => {
    if (available === true && distance) {
      return (
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card/90 backdrop-blur-sm 
                      border border-border flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium">{distance}</span>
        </div>
      );
    }
    if (available === false) {
      return (
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-muted-foreground/90 backdrop-blur-sm">
          <span className="text-xs font-medium text-primary-foreground">Contacter le domaine</span>
        </div>
      );
    }
    // Si available n'est pas défini, on n'affiche rien ou un badge neutre
    return null;
  };

  return (
    <Card className="group hover-lift overflow-hidden border-0 shadow-md">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img 
          src={imageUrl} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {getAvailabilityBadge()}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{domain} • {year}</p>
          <p className="text-xs text-slate-light mt-1">{region}</p>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            {price > 0 ? (
              <p className="text-xl font-bold text-primary">{price}€</p>
            ) : (
              <p className="text-sm text-muted-foreground">Prix non communiqué</p>
            )}
          </div>
          {price > 0 && (
            <Button 
              size="sm"
              className="bg-gradient-wine hover:opacity-90 transition-opacity"
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Commander
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
