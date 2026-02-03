import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ScanQuota {
  current: number;
  limit: number;
}

const SCAN_LIMITS: Record<string, number> = {
  member: 50,
  admin: 200,
  super_admin: 999999,
};

export function useScanQuota() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuota = async () => {
    if (!user) {
      setQuota(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch usage count and role in parallel
      const [usageResult, roleResult] = await Promise.all([
        supabase.rpc('get_monthly_scan_count', { p_user_id: user.id }),
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      ]);

      const usage = usageResult.data || 0;
      const role = roleResult.data?.role || 'member';
      const limit = SCAN_LIMITS[role] || 50;

      setQuota({ current: usage, limit });
    } catch (err) {
      console.error('Error fetching scan quota:', err);
      setQuota(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [user]);

  const refresh = () => {
    setLoading(true);
    fetchQuota();
  };

  return { quota, loading, refresh };
}
