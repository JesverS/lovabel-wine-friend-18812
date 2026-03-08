import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  Heart,
  MessageCircle,
  Users,
  Lock,
  Mail,
  CreditCard,
  Store,
  Check,
  X,
  Bell,
  Newspaper
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

const getNotificationConfig = (type: string) => {
  const configs: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    follow_request: { icon: UserPlus, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    new_follower: { icon: UserCheck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    follow_accepted: { icon: UserCheck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    post_like: { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    post_comment: { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    event_join: { icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    event_access_request: { icon: Lock, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    event_access_approved: { icon: Check, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    event_access_rejected: { icon: X, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    event_invitation: { icon: Mail, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    refund_request: { icon: CreditCard, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    refund_processed: { icon: CreditCard, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    cellar_invitation: { icon: Store, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    event_post: { icon: Newspaper, color: 'text-blue-500', bgColor: 'bg-blue-500/10' }
  };
  return configs[type] || { icon: Bell, color: 'text-muted-foreground', bgColor: 'bg-muted' };
};

const getNotificationLink = (notification: Notification): string | null => {
  const { type, data } = notification;
  
  switch (type) {
    case 'follow_request':
    case 'new_follower':
      return data.follower_slug ? `/user/${data.follower_slug}` : null;
    case 'follow_accepted':
      return data.following_slug ? `/user/${data.following_slug}` : null;
    case 'post_like':
    case 'post_comment':
      return data.user_slug ? `/user/${data.user_slug}` : null;
    case 'event_join':
    case 'event_access_request':
    case 'refund_request':
      return data.event_slug ? `/event/${data.event_slug}` : null;
    case 'event_invitation':
      return data.token ? `/event-invitation/${data.token}` : null;
    case 'cellar_invitation':
      return data.token ? `/cellar-invitation/${data.token}` : null;
    default:
      return null;
  }
};

export const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false
}: NotificationItemProps) => {
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;
  const link = getNotificationLink(notification);

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: fr
  });

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        !notification.read ? 'bg-primary/5' : 'hover:bg-muted/50',
        compact && 'p-2'
      )}
      onClick={handleClick}
    >
      <div className={cn('p-2 rounded-full flex-shrink-0', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          !notification.read && 'text-foreground',
          notification.read && 'text-muted-foreground'
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>

      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
      
      {!compact && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block group">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
};
