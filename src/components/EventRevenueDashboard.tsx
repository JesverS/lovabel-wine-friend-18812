import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Euro, 
  Users, 
  RefreshCcw, 
  TrendingUp,
  AlertTriangle,
  Check,
  Clock,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { Link } from 'react-router-dom';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  completed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    logo_adress: string | null;
    slug: string | null;
  } | null;
}

interface RevenueData {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  platformFeePercent: number;
  participantCount: number;
  refundedCount: number;
  pendingCount: number;
  payments: Payment[];
  currency: string;
}

interface EventRevenueDashboardProps {
  eventId: string;
  canManageMembers: boolean;
}

export function EventRevenueDashboard({ eventId, canManageMembers }: EventRevenueDashboardProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Payment | null>(null);

  const fetchRevenue = async () => {
    setLoading(true);
    const { data: revenueData, error } = await supabase.functions.invoke('get-event-revenue', {
      body: { event_id: eventId }
    });

    if (error) {
      console.error('Error fetching revenue:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de revenus',
        variant: 'destructive',
      });
    } else {
      setData(revenueData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRevenue();
  }, [eventId]);

  const handleRefund = async (payment: Payment) => {
    setRefundingId(payment.id);
    
    const { error } = await supabase.functions.invoke('refund-event-payment', {
      body: { payment_id: payment.id }
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'effectuer le remboursement',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Remboursement effectué',
        description: `${payment.user?.full_name || 'Utilisateur'} a été remboursé et retiré de l'événement`,
      });
      fetchRevenue();
    }
    
    setRefundingId(null);
    setConfirmRefund(null);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" />Payé</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Ban className="w-3 h-3 mr-1" />Remboursé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Revenus de l'événement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Revenus de l'événement
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRevenue}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Revenus bruts</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(data.totalRevenue, data.currency)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Euro className="w-4 h-4" />
                  <span className="text-sm">Revenus nets ({100 - data.platformFeePercent}%)</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.netRevenue, data.currency)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Participants payants</span>
                </div>
                <p className="text-2xl font-bold">{data.participantCount}</p>
                {data.refundedCount > 0 && (
                  <p className="text-xs text-orange-600">{data.refundedCount} remboursé(s)</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payments list */}
          {data.payments.length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Historique des paiements</h4>
              <div className="divide-y rounded-lg border">
                {data.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={payment.user?.logo_adress || undefined} />
                        <AvatarFallback className="text-xs">
                          {payment.user?.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {payment.user?.slug ? (
                          <Link to={`/user/${payment.user.slug}`} className="font-medium text-sm hover:underline">
                            {payment.user.full_name || 'Utilisateur'}
                          </Link>
                        ) : (
                          <p className="font-medium text-sm">{payment.user?.full_name || 'Utilisateur'}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
                      {getStatusBadge(payment.status)}
                      
                      {canManageMembers && payment.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmRefund(payment)}
                          disabled={refundingId === payment.id}
                        >
                          <RefreshCcw className={`w-4 h-4 ${refundingId === payment.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Euro className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucun paiement pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund confirmation dialog */}
      <AlertDialog open={!!confirmRefund} onOpenChange={() => setConfirmRefund(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmer le remboursement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de rembourser <strong>{confirmRefund?.user?.full_name || 'cet utilisateur'}</strong> 
              pour un montant de <strong>{confirmRefund && formatCurrency(confirmRefund.amount, confirmRefund.currency)}</strong>.
              <br /><br />
              <span className="text-destructive font-medium">
                Cette action est irréversible. L'utilisateur sera automatiquement retiré de l'événement.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRefund && handleRefund(confirmRefund)}
            >
              Rembourser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
