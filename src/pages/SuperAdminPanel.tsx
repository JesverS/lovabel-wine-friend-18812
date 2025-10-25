import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import { Header } from '@/components/Header';
import { DomainApplications } from '@/components/admin/DomainApplications';

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      // Attendre que l'authentification soit chargée
      if (authLoading) {
        console.log('Auth still loading...');
        return;
      }

      console.log('Checking authorization for user:', user?.id);
      
      if (!user) {
        console.log('No user found, redirecting to auth');
        navigate('/auth');
        return;
      }

      try {
        // Vérification directe dans la table user_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();

        console.log('Role check result:', { roleData, roleError });

        if (roleError) {
          console.error('Error checking role:', roleError);
          throw roleError;
        }

        if (!roleData) {
          console.log('User is not super admin, redirecting');
          navigate('/');
          return;
        }

        console.log('User is super admin, granting access');
        setIsAuthorized(true);
      } catch (error) {
        console.error('Authorization error:', error);
        navigate('/');
      } finally {
        setChecking(false);
      }
    };

    checkAuthorization();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-foreground">Vérification des autorisations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Panneau Super Admin</h1>
          <p className="text-muted-foreground">Gestion des demandes et administration de la plateforme</p>
        </div>
        
        <div className="space-y-8">
          <DomainApplications />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
