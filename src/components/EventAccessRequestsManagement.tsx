import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X, User, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AccessRequest {
  id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  user_profiles?: {
    full_name: string | null;
    email: string | null;
    logo_adress: string | null;
  };
}

interface EventAccessRequestsManagementProps {
  eventId: string;
}

export function EventAccessRequestsManagement({ eventId }: EventAccessRequestsManagementProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [eventId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_access_request')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils utilisateurs séparément
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('user_profiles_public')
            .select('full_name, email, logo_adress')
            .eq('id', request.user_id)
            .single();
          
          return {
            ...request,
            user_profiles: profile || undefined,
          };
        })
      );

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes d\'accès.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId);

    try {
      const { error } = await supabase.functions.invoke('process-access-request', {
        body: {
          request_id: requestId,
          approve,
        },
      });

      if (error) throw error;

      toast({
        title: approve ? 'Demande approuvée' : 'Demande rejetée',
        description: approve 
          ? 'L\'utilisateur a maintenant accès à l\'événement.'
          : 'La demande a été rejetée.',
      });

      // Rafraîchir la liste
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Chargement des demandes...
        </div>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Demandes en attente ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {request.user_profiles?.logo_adress ? (
                      <img
                        src={request.user_profiles.logo_adress}
                        alt={request.user_profiles.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {request.user_profiles?.full_name || 'Utilisateur'}
                      </h4>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.created_at), 'd MMM yyyy', { locale: fr })}
                      </Badge>
                    </div>
                    
                    {request.user_profiles?.email && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {request.user_profiles.email}
                      </p>
                    )}

                    {request.message && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground">{request.message}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleProcessRequest(request.id, true)}
                        disabled={processingId === request.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessRequest(request.id, false)}
                        disabled={processingId === request.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Historique des demandes
          </h3>
          <div className="space-y-3">
            {processedRequests.map((request) => (
              <Card key={request.id} className="p-4 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {request.user_profiles?.logo_adress ? (
                      <img
                        src={request.user_profiles.logo_adress}
                        alt={request.user_profiles.full_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">
                        {request.user_profiles?.full_name || 'Utilisateur'}
                      </h4>
                      <Badge 
                        variant={request.status === 'approved' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune demande d'accès pour le moment</p>
          </div>
        </Card>
      )}
    </div>
  );
}
