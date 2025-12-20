import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/NotificationItem';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const categorizeNotification = (type: string): string => {
  const socialTypes = ['follow_request', 'new_follower', 'follow_accepted', 'post_like', 'post_comment'];
  const eventTypes = ['event_join', 'event_access_request', 'event_access_approved', 'event_access_rejected', 'event_invitation', 'refund_request', 'refund_processed'];
  const cellarTypes = ['cellar_invitation'];

  if (socialTypes.includes(type)) return 'social';
  if (eventTypes.includes(type)) return 'events';
  if (cellarTypes.includes(type)) return 'cellars';
  return 'other';
};

const Notifications = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return categorizeNotification(n.type) === activeTab;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-28 pb-16">
          <div className="max-w-2xl mx-auto text-center py-16">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-4">Notifications</h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour voir vos notifications
            </p>
            <Button asChild>
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-28 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                Tout
                {notifications.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted px-1.5 rounded">
                    {notifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                Non lues
                {unreadCount > 0 && (
                  <span className="ml-1.5 text-xs bg-primary text-primary-foreground px-1.5 rounded">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="events">Événements</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bell className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Aucune notification</p>
                  <p className="text-sm">
                    {activeTab === 'unread' 
                      ? 'Toutes vos notifications ont été lues'
                      : 'Vous n\'avez pas encore de notifications dans cette catégorie'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-1 bg-card rounded-lg border">
                  {filteredNotifications.map((notification, index) => (
                    <div key={notification.id}>
                      <NotificationItem
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                      {index < filteredNotifications.length - 1 && (
                        <Separator />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
