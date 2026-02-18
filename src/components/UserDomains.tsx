import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

import { Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateDomainDialog } from '@/components/CreateDomainDialog';

interface UserDomainsProps {
  userId?: string;
}

export function UserDomains({ userId }: UserDomainsProps) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  const [domains, setDomains] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (effectiveUserId) {
      fetchUserDomains();
    }
  }, [effectiveUserId]);

  const fetchUserDomains = async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    
    // Récupérer les domaines validés
    const { data: userDomains } = await supabase
      .from('user_domain')
      .select('domain_id, domain(*), role')
      .eq('user_id', effectiveUserId);

    if (userDomains) {
      const domainsList = userDomains.map((ud: any) => ({
        ...ud.domain,
        user_role: ud.role
      })).filter(Boolean);
      setDomains(domainsList);
    }

    // Récupérer les demandes en attente (seulement pour son propre profil)
    if (isOwnProfile && user) {
      const { data: applications } = await supabase
        .from('user_domain_application')
        .select('*, domain(*)')
        .eq('user_id', user.id);
      setPendingApplications(applications || []);
    } else {
      setPendingApplications([]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const getRoleLabel = (role: number) => {
    switch (role) {
      case 1: return 'Propriétaire';
      case 2: return 'Administrateur';
      case 3: return 'Employé';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{isOwnProfile ? 'Mes domaines' : 'Domaines'}</h2>
        {isOwnProfile && <CreateDomainDialog onDomainCreated={fetchUserDomains} />}
      </div>

      {pendingApplications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Demandes en attente de validation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApplications.map((app) => (
              <Card key={app.domain.id} className="border-yellow-500/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-auto max-w-[80px] flex items-center justify-center flex-shrink-0">
                      {app.domain.logo_url ? (
                        <img 
                          src={app.domain.logo_url} 
                          alt={app.domain.name}
                          loading="lazy"
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                          <Store className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{app.domain.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Rôle demandé : {getRoleLabel(app.role)}
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                        ⏳ En attente de validation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {domains.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Aucun domaine pour le moment</p>
            <p className="text-sm text-muted-foreground">
              Créez votre premier domaine pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {domains.map((domain) => (
            <Link key={domain.id} to={`/domain/${domain.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-auto max-w-[100px] flex items-center justify-center flex-shrink-0">
                    {domain.logo_url ? (
                      <img 
                        src={domain.logo_url} 
                        alt={domain.name}
                        loading="lazy"
                        className="h-full w-auto object-contain"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                        <Store className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg truncate">{domain.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {getRoleLabel(domain.user_role)}
                      </span>
                    </div>
                    {domain.address && (
                      <p className="text-sm text-muted-foreground mb-2">📍 {domain.address}</p>
                    )}
                    {domain.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {domain.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {domain.website_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={domain.website_url} target="_blank" rel="noopener noreferrer">
                            Site web
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
