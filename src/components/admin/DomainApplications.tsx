import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DomainApplication {
  user_id: string;
  domain_id: string;
  role: number;
  created_at: string;
  domain: {
    id: string;
    name: string;
    description: string | null;
  };
  user_profiles: {
    id: string;
    full_name: string | null;
  };
}

export const DomainApplications = () => {
  const [applications, setApplications] = useState<DomainApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      // Récupérer les applications pour les domaines sans propriétaire
      const { data: applicationsData, error: appsError } = await supabase
        .from('user_domain_application')
        .select(`
          user_id,
          domain_id,
          role,
          created_at,
          domain:domain_id (
            id,
            name,
            description
          ),
          user_profiles:user_id (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Filtrer pour ne garder que les applications pour des domaines sans propriétaire
      if (applicationsData) {
        const filteredApps = await Promise.all(
          applicationsData.map(async (app) => {
            const { data: ownerData } = await supabase
              .from('user_domain')
              .select('role')
              .eq('domain_id', app.domain_id)
              .eq('role', 1)
              .maybeSingle();

            return ownerData ? null : app;
          })
        );

        setApplications(filteredApps.filter(Boolean) as DomainApplication[]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (application: DomainApplication) => {
    try {
      // Créer l'entrée user_domain avec le rôle propriétaire
      const { error: insertError } = await supabase
        .from('user_domain')
        .insert({
          user_id: application.user_id,
          domain_id: application.domain_id,
          role: 1, // Propriétaire
        });

      if (insertError) throw insertError;

      // Supprimer l'application
      const { error: deleteError } = await supabase
        .from('user_domain_application')
        .delete()
        .eq('user_id', application.user_id)
        .eq('domain_id', application.domain_id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Demande approuvée',
        description: `${application.user_profiles.full_name || 'L\'utilisateur'} est maintenant propriétaire de ${application.domain.name}`,
      });

      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'approuver la demande',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (application: DomainApplication) => {
    try {
      const { error } = await supabase
        .from('user_domain_application')
        .delete()
        .eq('user_id', application.user_id)
        .eq('domain_id', application.domain_id);

      if (error) throw error;

      toast({
        title: 'Demande rejetée',
        description: 'La demande a été supprimée',
      });

      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter la demande',
        variant: 'destructive',
      });
    }
  };

  const getRoleLabel = (role: number) => {
    switch (role) {
      case 1:
        return 'Propriétaire';
      case 2:
        return 'Admin';
      case 3:
        return 'Membre';
      default:
        return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Demandes de propriété en attente</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Demandes de propriété en attente
        </CardTitle>
        <CardDescription>
          Applications pour devenir propriétaire de domaines sans gérant
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune demande en attente
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={`${app.user_id}-${app.domain_id}`}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">
                      {app.domain.name}
                    </h4>
                    <Badge variant="outline">{getRoleLabel(app.role)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Demandeur: {app.user_profiles.full_name || 'Nom non renseigné'}
                  </p>
                  {app.domain.description && (
                    <p className="text-sm text-muted-foreground">
                      {app.domain.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Demande du {new Date(app.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(app)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(app)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
