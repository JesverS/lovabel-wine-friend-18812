import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Mail, UserCircle, Users, AlertTriangle, Euro } from 'lucide-react';
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
import { calculateRefundAmount, calculateRefundFees, formatCurrency, REFUND_FEE_PERCENT, REFUND_FEE_FIXED } from '@/lib/refundUtils';

interface EventAdministrationProps {
  eventId: string;
  userRole: 'organizer' | 'co_organizer' | 'admin' | 'participant' | null;
}

interface Member {
  user_id: string;
  role: string;
  access_origin: string | null;
  user_profiles_public: {
    slug: string | null;
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

interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export function EventAdministration({ eventId, userRole }: EventAdministrationProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: 'member' | 'invitation', id: string, name: string } | null>(null);
  const [memberPayment, setMemberPayment] = useState<PaymentInfo | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const canManageMembers = userRole === 'organizer' || userRole === 'co_organizer';
  const isReadOnly = userRole === null;

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all members from user_event
    const { data: membersData } = await supabase
      .from('user_event')
      .select(`
        user_id,
        role,
        access_origin,
        user_profiles_public (
          slug,
          full_name,
          logo_adress
        )
      `)
      .eq('event_id', eventId)
      .order('role', { ascending: true }) as any;

    if (membersData) {
      // Séparer équipe organisatrice et participants
      const team = membersData.filter((m: Member) => 
        ['organizer', 'co_organizer', 'admin'].includes(m.role)
      );
      const partis = membersData.filter((m: Member) => 
        m.role === 'participant'
      );
      
      setTeamMembers(team);
      setParticipants(partis);
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

  const checkMemberPayment = async (userId: string): Promise<PaymentInfo | null> => {
    const { data } = await supabase
      .from('event_payment')
      .select('id, amount, currency, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();
    
    return data;
  };

  const openDeleteDialog = async (type: 'member' | 'invitation', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setMemberPayment(null);
    
    // Si c'est un membre, vérifier s'il a un paiement
    if (type === 'member') {
      setCheckingPayment(true);
      const payment = await checkMemberPayment(id);
      setMemberPayment(payment);
      setCheckingPayment(false);
    }
    
    setDeleteDialogOpen(true);
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

      if (data?.refunded) {
        toast.success(`Membre supprimé et remboursé (${formatCurrency(data.refund_info?.refunded_amount || 0, 'EUR')})`);
      } else {
        toast.success('Membre supprimé de l\'événement');
      }
      fetchData();
    } catch (error: any) {
      toast.error('Impossible de supprimer le membre');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      setMemberPayment(null);
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'organizer':
        return 'Organisateur';
      case 'co_organizer':
        return 'Organisateur';
      case 'admin':
        return 'Administrateur';
      case 'participant':
        return 'Participant';
      default:
        return role;
    }
  };

  const getAccessOriginLabel = (origin: string | null) => {
    switch (origin) {
      case 'paid':
        return 'Payé';
      case 'approved':
        return 'Demande approuvée';
      case 'invited':
        return 'Invité';
      case 'public':
        return 'Public';
      default:
        return null;
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
    
    // Organizer peut supprimer co_organizer, admin et participant
    if (userRole === 'organizer' && memberRole !== 'organizer') return true;
    
    // Co_organizer peut supprimer admin et participant
    if (userRole === 'co_organizer' && ['admin', 'participant'].includes(memberRole)) return true;
    
    return false;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Équipe organisatrice */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Équipe organisatrice</h3>
        <div className="space-y-2">
          {teamMembers.map((member) => (
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
                  <Link to={`/user/${member.user_profiles_public?.slug || ''}`}>
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

      {/* Participants */}
      {participants.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            <h3 className="text-xl font-semibold">Participants ({participants.length})</h3>
          </div>
          <div className="space-y-2">
            {participants.map((member) => (
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
                    <Link to={`/user/${member.user_profiles_public?.slug || ''}`}>
                      <p className="font-medium hover:underline cursor-pointer text-primary">
                        {member.user_profiles_public?.full_name || 'Utilisateur'}
                        {member.user_id === user?.id && (
                          <span className="text-sm text-muted-foreground ml-2">(Vous)</span>
                        )}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                      {member.access_origin && getAccessOriginLabel(member.access_origin) && (
                        <span className="text-xs text-muted-foreground">
                          • {getAccessOriginLabel(member.access_origin)}
                        </span>
                      )}
                    </div>
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
                        member.user_profiles_public?.full_name || 'ce participant'
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
      )}

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
            {/* Dialog spécifique pour les membres payants */}
            {deletingItem?.type === 'member' && memberPayment ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-full bg-destructive/10">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <AlertDialogTitle className="text-xl">
                    ⚠️ ATTENTION - REMBOURSEMENT
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p className="text-foreground font-medium">
                      Cet utilisateur a payé <strong className="text-lg">{formatCurrency(memberPayment.amount, memberPayment.currency)}</strong> pour accéder à l'événement.
                    </p>
                    
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                      <p className="text-destructive font-bold text-lg mb-2">
                        CET UTILISATEUR SERA AUTOMATIQUEMENT REMBOURSÉ
                      </p>
                    </div>

                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-green-600" />
                          Montant remboursé au participant :
                        </span>
                        <strong className="text-green-600">
                          {formatCurrency(calculateRefundAmount(memberPayment.amount), memberPayment.currency)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Frais bancaires perdus (non récupérables) :
                        </span>
                        <strong className="text-amber-600">
                          ~{formatCurrency(calculateRefundFees(memberPayment.amount), memberPayment.currency)}
                        </strong>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Ces frais (~{REFUND_FEE_PERCENT}% + {REFUND_FEE_FIXED.toFixed(2)}€) seront déduits de vos revenus.
                      Cette action est <strong>irréversible</strong>.
                    </p>
                  </div>
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {checkingPayment ? (
                    'Vérification du paiement...'
                  ) : deletingItem?.type === 'member' ? (
                    `Voulez-vous vraiment retirer ${deletingItem?.name} de l'événement ?`
                  ) : (
                    `Voulez-vous vraiment annuler l'invitation de ${deletingItem?.name} ?`
                  )}
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletingItem?.type === 'member' ? handleDeleteMember : handleCancelInvitation}
              className={memberPayment ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              disabled={checkingPayment}
            >
              {memberPayment ? 'Confirmer le remboursement' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
