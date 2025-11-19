import { Badge } from "@/components/ui/badge";

interface WineListItemProps {
  wine: {
    id: string;
    name: string;
    year: number | null;
    label_url: string;
    domain: {
      id: string;
      name: string;
      region: string | null;
    };
    wine_type: {
      type: string;
    };
  };
  onSelect: (wine: any) => void;
}

export function WineListItem({ wine, onSelect }: WineListItemProps) {
  return (
    <div
      onClick={() => onSelect(wine)}
      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-0 transition-colors"
    >
      {/* Miniature 48x48px */}
      <img
        src={wine.label_url || "/placeholder.svg"}
        alt={wine.name}
        className="w-12 h-12 rounded object-cover flex-shrink-0"
        loading="lazy"
      />

      {/* Infos condensées */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{wine.name}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <span className="truncate">{wine.domain.name}</span>
          {wine.year && (
            <>
              <span>•</span>
              <span>{wine.year}</span>
            </>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {wine.wine_type.type}
          </Badge>
          {wine.domain.region && (
            <>
              <span>•</span>
              <span className="truncate">{wine.domain.region}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
