import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const PostCardSkeleton = () => {
  return (
    <Card className="p-6 space-y-4">
      {/* Header avec avatar et nom */}
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      
      {/* Contenu du post */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      
      {/* Image du post */}
      <Skeleton className="h-48 w-full rounded-lg" />
      
      {/* Actions (like, comment) */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </Card>
  );
};
