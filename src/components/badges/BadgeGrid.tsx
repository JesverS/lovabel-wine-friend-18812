import { useState } from 'react';
import { Badge as BadgeType, useBadges } from '@/hooks/useBadges';
import { BadgeCard } from './BadgeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Users, PartyPopper, Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  userId?: string;
  showFilters?: boolean;
  compact?: boolean;
}

const categoryConfig = {
  learning: {
    label: 'Apprentissage',
    icon: GraduationCap,
    description: 'Progressez dans vos leçons et accumulez de l\'XP',
  },
  social: {
    label: 'Social',
    icon: Users,
    description: 'Interagissez avec la communauté',
  },
  events: {
    label: 'Événements',
    icon: PartyPopper,
    description: 'Participez et organisez des événements',
  },
  collection: {
    label: 'Collection',
    icon: Wine,
    description: 'Gérez vos caves et vos favoris',
  },
};

export function BadgeGrid({ userId, showFilters = true, compact = false }: BadgeGridProps) {
  const { allBadges, loading, stats, isUnlocked, getUnlockedDate, newBadges } = useBadges(userId);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filteredBadges = activeCategory === 'all' 
    ? allBadges 
    : allBadges.filter(b => b.category === activeCategory);

  const isNewBadge = (badge: BadgeType) => newBadges.some(nb => nb.id === badge.id);

  const CategorySection = ({ category }: { category: keyof typeof categoryConfig }) => {
    const config = categoryConfig[category];
    const Icon = config.icon;
    const categoryBadges = allBadges.filter(b => b.category === category);
    const categoryStats = stats.byCategory[category];
    const progress = categoryStats.total > 0 
      ? (categoryStats.unlocked / categoryStats.total) * 100 
      : 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{config.label}</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {categoryStats.unlocked}/{categoryStats.total}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className={cn(
          'grid gap-4',
          compact ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
        )}>
          {categoryBadges.map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              isUnlocked={isUnlocked(badge.id)}
              unlockedDate={getUnlockedDate(badge.id)}
              isNew={isNewBadge(badge)}
              size={compact ? 'sm' : 'md'}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            🏆 Badges
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.unlocked} sur {stats.total} débloqués
          </p>
        </div>
        <div className="text-right">
          <Progress 
            value={(stats.unlocked / stats.total) * 100} 
            className="w-32 h-3"
          />
        </div>
      </div>

      {showFilters ? (
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="learning" className="gap-1">
              <GraduationCap className="w-4 h-4 hidden sm:inline" />
              <span className="sm:hidden">🎓</span>
              <span className="hidden sm:inline">Apprentissage</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1">
              <Users className="w-4 h-4 hidden sm:inline" />
              <span className="sm:hidden">👥</span>
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1">
              <PartyPopper className="w-4 h-4 hidden sm:inline" />
              <span className="sm:hidden">🎉</span>
              <span className="hidden sm:inline">Événements</span>
            </TabsTrigger>
            <TabsTrigger value="collection" className="gap-1">
              <Wine className="w-4 h-4 hidden sm:inline" />
              <span className="sm:hidden">🍷</span>
              <span className="hidden sm:inline">Collection</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-8">
            {Object.keys(categoryConfig).map(cat => (
              <CategorySection key={cat} category={cat as keyof typeof categoryConfig} />
            ))}
          </TabsContent>

          {Object.keys(categoryConfig).map(cat => (
            <TabsContent key={cat} value={cat}>
              <CategorySection category={cat as keyof typeof categoryConfig} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-8">
          {Object.keys(categoryConfig).map(cat => (
            <CategorySection key={cat} category={cat as keyof typeof categoryConfig} />
          ))}
        </div>
      )}
    </div>
  );
}
