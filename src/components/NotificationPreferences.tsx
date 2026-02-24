import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Heart, MessageCircle, AtSign, UserPlus, Users, UserCheck, CalendarDays, ShieldQuestion, Mail, Wine, ReceiptText } from 'lucide-react';

interface NotificationPrefs {
  post_like: boolean;
  post_comment: boolean;
  mention: boolean;
  follow_request: boolean;
  new_follower: boolean;
  follow_accepted: boolean;
  event_join: boolean;
  event_access_request: boolean;
  event_invitation: boolean;
  cellar_invitation: boolean;
  refund_request: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  post_like: true,
  post_comment: true,
  mention: true,
  follow_request: true,
  new_follower: true,
  follow_accepted: true,
  event_join: true,
  event_access_request: true,
  event_invitation: true,
  cellar_invitation: true,
  refund_request: true,
};

const PREF_CATEGORIES = [
  {
    title: 'Social',
    items: [
      { key: 'post_like' as const, label: 'Likes sur mes posts', icon: Heart },
      { key: 'post_comment' as const, label: 'Commentaires sur mes posts', icon: MessageCircle },
      { key: 'mention' as const, label: 'Mentions dans un post', icon: AtSign },
      { key: 'follow_request' as const, label: "Demandes d'abonnement", icon: UserPlus },
      { key: 'new_follower' as const, label: 'Nouveaux abonnés', icon: Users },
      { key: 'follow_accepted' as const, label: 'Abonnement accepté', icon: UserCheck },
    ],
  },
  {
    title: 'Événements',
    items: [
      { key: 'event_join' as const, label: 'Nouveau participant', icon: CalendarDays },
      { key: 'event_access_request' as const, label: "Demandes d'accès", icon: ShieldQuestion },
      { key: 'event_invitation' as const, label: 'Invitations à un événement', icon: Mail },
      { key: 'refund_request' as const, label: 'Demandes de remboursement', icon: ReceiptText },
    ],
  },
  {
    title: 'Caves',
    items: [
      { key: 'cellar_invitation' as const, label: 'Invitations à une cave', icon: Wine },
    ],
  },
];

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefId, setPrefId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchPrefs();
  }, [user]);

  const fetchPrefs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_preferences' as any)
      .select('*')
      .eq('user_id', user.id)
      .is('token_id', null)
      .maybeSingle();

    if (data && !error) {
      setPrefId((data as any).id);
      setPrefs({
        post_like: (data as any).post_like ?? true,
        post_comment: (data as any).post_comment ?? true,
        mention: (data as any).mention ?? true,
        follow_request: (data as any).follow_request ?? true,
        new_follower: (data as any).new_follower ?? true,
        follow_accepted: (data as any).follow_accepted ?? true,
        event_join: (data as any).event_join ?? true,
        event_access_request: (data as any).event_access_request ?? true,
        event_invitation: (data as any).event_invitation ?? true,
        cellar_invitation: (data as any).cellar_invitation ?? true,
        refund_request: (data as any).refund_request ?? true,
      });
    }
    setLoading(false);
  };

  const handleToggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;

    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    if (prefId) {
      // Update existing row
      const { error } = await supabase
        .from('notification_preferences' as any)
        .update({ [key]: value } as any)
        .eq('id', prefId);

      if (error) {
        setPrefs(prev => ({ ...prev, [key]: !value }));
        toast.error('Erreur lors de la mise à jour');
        return;
      }
    } else {
      // Create global preferences row
      const { data, error } = await supabase
        .from('notification_preferences' as any)
        .insert({ user_id: user.id, token_id: null, ...newPrefs } as any)
        .select('id')
        .single();

      if (error) {
        setPrefs(prev => ({ ...prev, [key]: !value }));
        toast.error('Erreur lors de la création des préférences');
        return;
      }
      setPrefId((data as any).id);
    }

    toast.success('Préférence mise à jour');
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6 py-4">
      <p className="text-sm text-muted-foreground">
        Choisissez quelles notifications vous souhaitez recevoir. Ces paramètres s'appliquent à tous vos appareils par défaut.
      </p>

      {PREF_CATEGORIES.map((category) => (
        <div key={category.title}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {category.title}
          </h4>
          <div className="space-y-1">
            {category.items.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor={key} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
                <Switch
                  id={key}
                  checked={prefs[key]}
                  onCheckedChange={(v) => handleToggle(key, v)}
                />
              </div>
            ))}
          </div>
          <div className="border-t mt-3" />
        </div>
      ))}
    </div>
  );
}
