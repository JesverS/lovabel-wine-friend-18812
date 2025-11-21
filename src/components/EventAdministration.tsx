import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Mail, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventAdministrationProps {
  eventId: string;
  userRole: 'organizer' | 'co_organizer' | 'admin' | null;
}

interface Member {
  user_id: string;
  role: string;
  user_profiles_public: {
    full_name: string | null;
    logo_adress: string | null;
  } | null;
}

interface Invitation {
  id: string;
  invitee_email: string;
  role: string;
  created_at: string;
}

export function EventAdministration({ eventId, userRole }: EventAdministrationProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'member' | 'invitation', id: string, name: string } | null>(null);

  const canManageMembers = userRole === 'organizer' || userRole === 'co_organizer';
  const isReadOnly = userRole === null;

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch members
    const { data: membersData } = await supabase
      .from('user_event')
      .select(`
        user_id,
        role,
        user_profiles_public (
          slug,
          full_name,
          logo_adress
        )
      `)
      .eq('event_id', eventId)
      .order('role', { ascending: true }) as any;

    if (membersData) {
      setMembers(membersData);
    }

    // Fetch invitations (uniquement si organizer ou co_organizer)
    if (canManageMembers) {
      const { data: invitationsData } = await supabase
        .from('event_invitation')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invitationsData) {
        setInvitations(invitationsData);
      }
    }

    setLoading(false);
  };

  const handleDeleteMember = async () => {
    if (!deletingItem || deletingItem.type !== 'member') return;

    try {
      const { data, error } = await supabase.functions.invoke(
        'remove-event-member',
        { 
          body: { 
            member_user_id: deletingItem.id, 
            event_id: eventId 
          } 
        }
      );
      
      if (error) throw error;

      toast.success('Membre supprimé de l\'événement');
      fetchData();
    } catch (error: any) {
      toast.error('Impossible de supprimer le membre');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleCancelInvitation = async () => {
    if (!deletingItem || deletingItem.type !== 'invitation') return;

    try {
      const { data, error } = await supabase.functions.invoke(
        'cancel-event-invitation',
        { 
          body: { 
            invitation_id: deletingItem.id 
          } 
        }
      );
      
      if (error) throw error;

      toast.success('Invitation annulée');
      fetchData();
    } catch (error: any) {
      toast.error('Impossible d\'annuler l\'invitation');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const openDeleteDialog = (type: 'member' | 'invitation', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'organizer':
        return 'Organisateur';
      case 'co_organizer':
        return 'Organisateur';
      case 'admin':
        return 'Administrateur';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'organizer':
      case 'co_organizer':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const canDeleteMember = (memberRole: string, memberId: string) => {
    // Ne peut pas se supprimer soi-même
    if (memberId === user?.id) return false;
    
    // Organizer peut supprimer co_organizer et admin
    if (userRole === 'organizer' && memberRole !== 'organizer') return true;
    
    // Co_organizer peut supprimer admin uniquement
    if (userRole === 'co_organizer' && memberRole === 'admin') return true;
    
    return false;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Membres */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Membres de l'équipe organisatrice</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.user_profiles_public?.logo_adress || undefined} />
                  <AvatarFallback>
                    <UserCircle className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link to={`/user/${(member.user_profiles_public as any)?.slug || ''}`}>
                    <p className="font-medium hover:underline cursor-pointer text-primary">
                      {member.user_profiles_public?.full_name || 'Utilisateur'}
                      {member.user_id === user?.id && (
                        <span className="text-sm text-muted-foreground ml-2">(Vous)</span>
                      )}
                    </p>
                  </Link>
                  {/* Distinction interne visible uniquement par l'organizer */}
                  {userRole === 'organizer' && member.role === 'co_organizer' && (
                    <p className="text-xs text-muted-foreground">(Co-organisateur - distinction interne)</p>
                  )}
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </div>
              </div>
              {!isReadOnly && canDeleteMember(member.role, member.user_id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    openDeleteDialog(
                      'member',
                      member.user_id,
                      member.user_profiles_public?.full_name || 'ce membre'
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Invitations en attente */}
      {!isReadOnly && canManageMembers && invitations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Invitations en attente</h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invitation.invitee_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {getRoleLabel(invitation.role)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    openDeleteDialog('invitation', invitation.id, invitation.invitee_email)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dialog de confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === 'member'
                ? `Voulez-vous vraiment retirer ${deletingItem.name} de l'événement ?`
                : `Voulez-vous vraiment annuler l'invitation de ${deletingItem?.name} ?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletingItem?.type === 'member' ? handleDeleteMember : handleCancelInvitation}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
