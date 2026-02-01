import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasRole(false);
      setRole(null);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setHasRole(true);
          setRole(data.role);
        } else {
          setHasRole(false);
          setRole(null);
        }
      } catch (err) {
        console.error('Error checking user role:', err);
        setHasRole(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { hasRole, role, loading, canUseAI: hasRole };
}
