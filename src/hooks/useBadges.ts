import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  criteria: unknown;
  xp_reward: number | null;
  sort_order: number | null;
}

export interface UserBadge {
  id: string;
  badge_id: string;
  unlocked_at: string;
  notified: boolean;
  badge: Badge;
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
}

export function useBadges(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  const fetchBadges = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all badge definitions
      const { data: badgeDefinitions, error: defError } = await supabase
        .from('badge_definition')
        .select('*')
        .order('sort_order');

      if (defError) throw defError;
      setAllBadges((badgeDefinitions || []) as Badge[]);

      // Fetch user's unlocked badges
      const { data: userBadgesData, error: userError } = await supabase
        .from('user_badge')
        .select(`
          id,
          badge_id,
          unlocked_at,
          notified,
          badge:badge_definition(*)
        `)
        .eq('user_id', targetUserId)
        .order('unlocked_at', { ascending: false });

      if (userError) throw userError;
      
      const formattedUserBadges = (userBadgesData || []).map((ub: any) => ({
        ...ub,
        badge: ub.badge as Badge
      }));
      setUserBadges(formattedUserBadges);

      // Check for new badges (unlocked in last 24h and not notified)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentBadges = formattedUserBadges.filter(
        (ub: UserBadge) => ub.unlocked_at > oneDayAgo && !ub.notified
      );
      setNewBadges(recentBadges.map((ub: UserBadge) => ub.badge));

    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Subscribe to new badge notifications
  useEffect(() => {
    if (!user?.id || user.id !== targetUserId) return;

    const channel = supabase
      .channel('user-badges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badge',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the new badge details
          const { data: badge } = await supabase
            .from('badge_definition')
            .select('*')
            .eq('id', payload.new.badge_id)
            .single();

          if (badge) {
            // La notification système suffit, pas besoin de toast redondant
            fetchBadges();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, targetUserId, fetchBadges]);

  const markBadgeAsNotified = async (badgeId: string) => {
    if (!user?.id) return;
    
    // Optimistic update: retirer immédiatement du state local
    setNewBadges(prev => prev.filter(b => b.id !== badgeId));
    
    // Puis mettre à jour la BDD
    await supabase
      .from('user_badge')
      .update({ notified: true })
      .eq('user_id', user.id)
      .eq('badge_id', badgeId);
  };

  const getBadgesByCategory = (category: string) => {
    return allBadges.filter(b => b.category === category);
  };

  const isUnlocked = (badgeId: string) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  };

  const getUnlockedDate = (badgeId: string) => {
    const ub = userBadges.find(ub => ub.badge_id === badgeId);
    return ub ? new Date(ub.unlocked_at) : null;
  };

  const stats = {
    total: allBadges.length,
    unlocked: userBadges.length,
    byCategory: {
      learning: {
        total: allBadges.filter(b => b.category === 'learning').length,
        unlocked: userBadges.filter(ub => ub.badge.category === 'learning').length,
      },
      social: {
        total: allBadges.filter(b => b.category === 'social').length,
        unlocked: userBadges.filter(ub => ub.badge.category === 'social').length,
      },
      events: {
        total: allBadges.filter(b => b.category === 'events').length,
        unlocked: userBadges.filter(ub => ub.badge.category === 'events').length,
      },
      collection: {
        total: allBadges.filter(b => b.category === 'collection').length,
        unlocked: userBadges.filter(ub => ub.badge.category === 'collection').length,
      },
    },
  };

  return {
    allBadges,
    userBadges,
    loading,
    newBadges,
    stats,
    getBadgesByCategory,
    isUnlocked,
    getUnlockedDate,
    markBadgeAsNotified,
    refetch: fetchBadges,
  };
}
