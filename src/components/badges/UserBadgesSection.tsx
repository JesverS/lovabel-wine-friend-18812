import { useBadges } from '@/hooks/useBadges';
import { BadgeCard } from './BadgeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserBadgesSectionProps {
  userId: string;
  maxDisplay?: number;
  showViewAll?: boolean;
}

export function UserBadgesSection({ userId, maxDisplay = 8, showViewAll = true }: UserBadgesSectionProps) {
  const { userBadges, loading, stats, newBadges } = useBadges(userId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userBadges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Aucun badge débloqué pour le moment.
          </p>
          {showViewAll && (
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/badges">
                Voir tous les badges
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayedBadges = userBadges.slice(0, maxDisplay);
  const hasMore = userBadges.length > maxDisplay;

  const isNewBadge = (badgeId: string) => newBadges.some(nb => nb.id === badgeId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            Badges
            <span className="text-sm font-normal text-muted-foreground">
              ({stats.unlocked}/{stats.total})
            </span>
          </CardTitle>
          {showViewAll && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/badges">
                Voir tout
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {displayedBadges.map((ub) => (
            <BadgeCard
              key={ub.id}
              badge={ub.badge}
              isUnlocked={true}
              unlockedDate={new Date(ub.unlocked_at)}
              isNew={isNewBadge(ub.badge.id)}
              size="sm"
            />
          ))}
          {hasMore && (
            <Link
              to="/badges"
              className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              +{userBadges.length - maxDisplay}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
