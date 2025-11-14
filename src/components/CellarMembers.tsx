import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserCircle, Trash2 } from 'lucide-react';
import { InviteMemberDialog } from './InviteMemberDialog';

interface CellarMembersProps {
  cellarId: string;
  cellarName: string;
  userRole: 'owner' | 'co_owner' | 'admin' | null;
}

export function CellarMembers({ cellarId, cellarName, userRole }: CellarMembersProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchUserProfile();
  }, [cellarId]);

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    setUserProfile(data);
  };

  const fetchData = async () => {
    setLoading(true);

    // Récupérer les membres
    const { data: membs } = await supabase
      .from('user_cellar')
      .select(`
        *,
        user_profiles_public!user_cellar_user_id_fkey (
          full_name,
          logo_adress
        )
      `)
      .eq('user_cellar_id', cellarId)
      .order('role', { ascending: true }) as any;

    setMembers(membs || []);

    // Récupérer les invitations en attente (si owner ou co_owner)
    if (userRole === 'owner' || userRole === 'co_owner') {
      const { data: invites } = await supabase
        .from('cellar_invitation')
        .select('*')
        .eq('cellar_id', cellarId)
        .eq('status', 'pending');
      
      setInvitations(invites || []);
    }

    setLoading(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) return;

    try {
      const { error } = await supabase
        .from('user_cellar')
        .delete()
        .eq('user_id', userId)
        .eq('user_cellar_id', cellarId);

      if (error) throw error;

      toast.success('Membre retiré');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('cellar_invitation')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation annulée');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'co_owner': return 'Copropriétaire';
      case 'admin': return 'Administrateur';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" => {
    return (role === 'owner' || role === 'co_owner') ? 'default' : 'secondary';
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Membres de la cave</CardTitle>
          {(userRole === 'owner' || userRole === 'co_owner') && (
            <InviteMemberDialog 
              cellarId={cellarId} 
              cellarName={cellarName}
              inviterName={userProfile?.full_name || 'Un membre'}
              onInvitationSent={fetchData}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="bg-white">
                  <AvatarImage src={member.user_profiles?.logo_adress || undefined} />
                  <AvatarFallback>
                    <UserCircle className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{member.user_profiles?.full_name || 'Utilisateur'}</p>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              </div>
              {userRole === 'owner' && member.user_id !== user?.id && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleRemoveMember(member.user_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {(userRole === 'owner' || userRole === 'co_owner') && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold">{inv.invitee_email}</p>
                  <p className="text-sm text-muted-foreground">
                    Rôle : {getRoleLabel(inv.role)} • Envoyée le {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCancelInvitation(inv.id)}
                >
                  Annuler
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}