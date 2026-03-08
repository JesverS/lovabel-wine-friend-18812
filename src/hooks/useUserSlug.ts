import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserSlug() {
  const { user } = useAuth();

  const { data: slug } = useQuery({
    queryKey: ['user-slug', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_profiles_public' as any)
        .select('slug')
        .eq('id', user.id)
        .maybeSingle();
      return (data as any)?.slug || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  return slug as string | null;
}
