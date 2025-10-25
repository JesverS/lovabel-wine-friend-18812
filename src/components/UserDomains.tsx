import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateDomainDialog } from '@/components/CreateDomainDialog';

export function UserDomains() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserDomains();
    }
  }, [user]);

  const fetchUserDomains = async () => {
    if (!user) return;

    setLoading(true);
    
    const { data: userDomains } = await supabase
      .from('user_domain')
      .select('domain_id, domain(*)')
      .eq('user_id', user.id);

    if (userDomains) {
      const domainsList = userDomains.map((ud: any) => ud.domain).filter(Boolean);
      setDomains(domainsList);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mes domaines</h2>
        <CreateDomainDialog onDomainCreated={fetchUserDomains} />
      </div>

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
            <Card key={domain.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={domain.logo_url || undefined} />
                    <AvatarFallback>
                      <Store className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate mb-2">{domain.name}</h3>
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
          ))}
        </div>
      )}
    </div>
  );
}
