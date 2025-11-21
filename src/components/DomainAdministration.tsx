import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, UserCircle } from 'lucide-react';

interface DomainAdministrationProps {
  domainId: string;
  userRole: number;
}

export function DomainAdministration({ domainId, userRole }: DomainAdministrationProps) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole >= 1 && userRole <= 2) {
      fetchData();
    }
  }, [domainId, userRole]);

  const fetchData = async () => {
    setLoading(true);

    // Récupérer les demandes en attente selon le rôle
    let query = supabase
      .from('user_domain_application')
      .select(`
        *,
        user_profiles_public (
          full_name,
          logo_adress
        )
      `)
      .eq('domain_id', domainId) as any;

    // Filtrage selon le rôle de l'utilisateur connecté
    if (userRole === 2) {
      // Administrateur : ne voit que les demandes de membres (rang 3)
      query = query.eq('role', 3);
    }
    // Propriétaire (userRole === 1) : voit toutes les demandes (pas de filtre supplémentaire)

    const { data: apps } = await query;
    setApplications(apps || []);

    // Récupérer les membres actuels
    const { data: membs } = await supabase
      .from('user_domain')
      .select(`
        *,
        user_profiles_public (
          full_name,
          logo_adress
        )
      `)
      .eq('domain_id', domainId) as any;

    setMembers(membs || []);
    setLoading(false);
  };

  const handleApprove = async (application: any) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'approve-domain-application',
        { 
          body: { 
            application_user_id: application.user_id, 
            domain_id: domainId 
          } 
        }
      );
      
      if (error) throw error;
      
      toast.success('Demande approuvée');
      fetchData();
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (application: any) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'reject-domain-application',
        { 
          body: { 
            application_user_id: application.user_id, 
            domain_id: domainId 
          } 
        }
      );
      
      if (error) throw error;
      
      toast.success('Demande rejetée');
      fetchData();
    } catch (error: any) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'remove-domain-member',
        { 
          body: { 
            member_user_id: userId, 
            domain_id: domainId 
          } 
        }
      );
      
      if (error) throw error;
      
      toast.success('Membre retiré');
      fetchData();
    } catch (error: any) {
      toast.error('Erreur lors du retrait');
    }
  };

  const getRoleLabel = (role: number) => {
    switch (role) {
      case 1: return 'Propriétaire';
      case 2: return 'Administrateur';
      case 3: return 'Employé';
      default: return 'Inconnu';
    }
  };

  const getRoleBadgeVariant = (role: number): "default" | "secondary" | "outline" => {
    switch (role) {
      case 1: return 'default';
      case 2: return 'secondary';
      case 3: return 'outline';
      default: return 'outline';
    }
  };

  if (userRole > 2) {
    return null;
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Demandes d'accès en attente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {applications.map((app) => (
              <div key={app.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={app.user_profiles_public?.logo_adress || undefined} />
                    <AvatarFallback>
                      <UserCircle className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{app.user_profiles_public?.full_name || 'Utilisateur'}</p>
                    <p className="text-sm text-muted-foreground">
                      Demande : {getRoleLabel(app.role)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(app)}>
                    <Check className="w-4 h-4 mr-1" />
                    Approuver
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(app)}>
                    <X className="w-4 h-4 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membres du domaine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user_profiles_public?.logo_adress || undefined} />
                  <AvatarFallback>
                    <UserCircle className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{member.user_profiles_public?.full_name || 'Utilisateur'}</p>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              </div>
              {userRole === 1 && member.user_id !== user?.id && member.role !== 1 && (
                <Button size="sm" variant="outline" onClick={() => handleRemoveMember(member.user_id)}>
                  Retirer
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
