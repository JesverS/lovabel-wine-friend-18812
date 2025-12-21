import { cn } from '@/lib/utils';
import { Badge as BadgeType } from '@/hooks/useBadges';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BadgeCardProps {
  badge: BadgeType;
  isUnlocked: boolean;
  unlockedDate?: Date | null;
  isNew?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

const tierColors = {
  bronze: {
    border: 'border-orange-400/60',
    bg: 'bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20',
    glow: 'shadow-orange-200/50 dark:shadow-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
  },
  silver: {
    border: 'border-slate-300',
    bg: 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700/30 dark:to-slate-600/20',
    glow: 'shadow-slate-200/50 dark:shadow-slate-400/20',
    text: 'text-slate-600 dark:text-slate-300',
  },
  gold: {
    border: 'border-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-100 to-amber-50 dark:from-yellow-900/30 dark:to-amber-800/20',
    glow: 'shadow-yellow-200/50 dark:shadow-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  platinum: {
    border: 'border-violet-400',
    bg: 'bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/30 dark:to-purple-800/20',
    glow: 'shadow-violet-200/50 dark:shadow-violet-500/30',
    text: 'text-violet-700 dark:text-violet-400',
  },
};

const sizeClasses = {
  sm: {
    container: 'w-16 h-16',
    icon: 'text-xl',
    padding: 'p-2',
  },
  md: {
    container: 'w-20 h-20',
    icon: 'text-2xl',
    padding: 'p-3',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'text-3xl',
    padding: 'p-4',
  },
};

export function BadgeCard({
  badge,
  isUnlocked,
  unlockedDate,
  isNew = false,
  size = 'md',
  showTooltip = true,
}: BadgeCardProps) {
  const tier = (badge.tier || 'bronze') as TierKey;
  const tierStyle = tierColors[tier];
  const sizeStyle = sizeClasses[size];

  const BadgeContent = (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1 group',
        'transition-all duration-300',
        isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'
      )}
    >
      {/* Badge Icon Container */}
      <div
        className={cn(
          'relative rounded-full border-2 flex items-center justify-center',
          'transition-all duration-300',
          sizeStyle.container,
          sizeStyle.padding,
          isUnlocked ? [tierStyle.border, tierStyle.bg] : 'border-muted bg-muted/50',
          isUnlocked && 'hover:scale-110 hover:shadow-lg',
          isUnlocked && tierStyle.glow,
          isNew && 'animate-pulse ring-2 ring-primary ring-offset-2'
        )}
      >
        {isUnlocked ? (
          <span className={cn('select-none', sizeStyle.icon)}>{badge.icon}</span>
        ) : (
          <Lock className={cn('text-muted-foreground', size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6')} />
        )}

        {/* New Badge Indicator */}
        {isNew && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
        )}
      </div>

      {/* Badge Name */}
      {size !== 'sm' && (
        <span
          className={cn(
            'text-xs font-medium text-center line-clamp-2 max-w-[80px]',
            isUnlocked ? tierStyle.text : 'text-muted-foreground'
          )}
        >
          {badge.name}
        </span>
      )}
    </div>
  );

  if (!showTooltip) return BadgeContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-pointer">{BadgeContent}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{badge.icon}</span>
            <span className="font-semibold">{badge.name}</span>
            <span className={cn('text-xs capitalize px-1.5 py-0.5 rounded', tierStyle.bg, tierStyle.text)}>
              {tier}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          {(badge.xp_reward ?? 0) > 0 && (
            <p className="text-xs text-secondary">+{badge.xp_reward} XP</p>
          )}
          {isUnlocked && unlockedDate && (
            <p className="text-xs text-muted-foreground">
              Débloqué le {format(unlockedDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
