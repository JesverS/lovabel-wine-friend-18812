import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Euro, 
  Calendar, 
  RefreshCcw, 
  TrendingUp,
  Users,
  ExternalLink,
  Banknote
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { PayoutRequestDialog } from './PayoutRequestDialog';

interface EventRevenue {
  id: string;
  name: string;
  slug: string;
  start_date: string;
  access_type: string;
  price: number | null;
  currency: string | null;
  revenue: number;
  refunded: number;
  netRevenue: number;
  participantCount: number;
}

interface OrganizerRevenueData {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  platformFeePercent: number;
  eventCount: number;
  participantCount: number;
  events: EventRevenue[];
}

export function OrganizerRevenueDashboard() {
  const [data, setData] = useState<OrganizerRevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async () => {
    setLoading(true);
    const { data: revenueData, error } = await supabase.functions.invoke('get-organizer-revenue');

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
  }, []);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Euro className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>Impossible de charger les données</p>
      </div>
    );
  }

  const paidEvents = data.events.filter(e => e.access_type === 'paid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Mes revenus d'organisateur</h3>
        <div className="flex items-center gap-2">
          <PayoutRequestDialog
            triggerButton={
              <Button variant="default" size="sm">
                <Banknote className="w-4 h-4 mr-2" />
                Demander un virement
              </Button>
            }
          />
          <Button variant="ghost" size="sm" onClick={fetchRevenue}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Revenus bruts totaux</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Euro className="w-4 h-4" />
              <span className="text-sm">TTC (net des frais WineNote)</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.netRevenue)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Participants payants</span>
            </div>
            <p className="text-2xl font-bold">{data.participantCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Events list */}
      {paidEvents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Revenus par événement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {paidEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/event/${event.slug}`} 
                        className="font-medium text-sm hover:underline truncate"
                      >
                        {event.name}
                      </Link>
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_date), 'dd MMMM yyyy', { locale: fr })}
                      {event.participantCount > 0 && ` • ${event.participantCount} participant(s)`}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-medium text-green-600">
                      {formatCurrency(event.netRevenue, event.currency || 'EUR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      sur {formatCurrency(event.revenue, event.currency || 'EUR')} brut
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Aucun événement payant</p>
              <p className="text-sm">Créez un événement payant pour commencer à générer des revenus</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VAT Notice */}
      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        💡 Les montants affichés sont TTC. La déclaration et le paiement de la TVA 
        restent à votre charge. Vous pouvez gérer cela depuis votre compte Stripe 
        ou auprès de votre comptable.
      </p>

      {/* Info about refunds */}
      {data.totalRefunded > 0 && (
        <p className="text-sm text-muted-foreground">
          Total remboursé : {formatCurrency(data.totalRefunded)}
        </p>
      )}
    </div>
  );
}
