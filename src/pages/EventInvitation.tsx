import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, X, Loader2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EventInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [invitationNotFound, setInvitationNotFound] = useState(false);

  useEffect(() => {
    if (token && !invitation) {
      fetchInvitation();
    }
  }, [token]);

  useEffect(() => {
    const getUserEmail = async () => {
      if (user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUserEmail(authUser?.email || null);
      } else {
        setUserEmail(null);
      }
    };
    getUserEmail();
  }, [user]);

  const emailMatches = userEmail && invitation && userEmail === invitation.invitee_email;

  const fetchInvitation = async () => {
    setLoading(true);
    try {
      const { data: inv, error } = await supabase
        .from('event_invitation')
        .select('*, event(id, slug, name, start_date, end_date, city, banner_url)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !inv) {
        setInvitationNotFound(true);
        return;
      }

      // Vérifier si expirée
      if (new Date(inv.expires_at) < new Date()) {
        setInvitationNotFound(true);
        return;
      }

      setInvitation(inv);
      setEvent(inv.event);
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      setInvitationNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour accepter cette invitation');
      navigate(`/auth?redirect=/event-invitation/${token}`);
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-event-invitation', {
        body: { token },
      });

      if (error) throw error;

      toast.success('Vous avez rejoint l\'événement !');
      navigate(`/event/${data.event_slug}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('reject-event-invitation', {
        body: { token },
      });

      if (error) throw error;

      toast.success('Invitation refusée');
      navigate('/');
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'co_organizer':
        return 'Co-organisateur';
      case 'admin':
        return 'Administrateur';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Invitation Événement - Wine Note</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Header />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (invitationNotFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <title>Invitation Événement - Wine Note</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Header />
        <main className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Invitation à rejoindre un événement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium mb-2">
                  🔒 Accès restreint
                </p>
                <p className="text-sm text-amber-700">
                  Merci de vous connecter et de vérifier que vous disposez bien d'un lien d'invitation valide pour votre email.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate(`/auth?redirect=/event-invitation/${token}`)}
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Invitation à rejoindre un événement | Wine Note</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
        <Card className="max-w-md w-full">
          {event?.banner_url && (
            <img
              src={event.banner_url}
              alt={event.name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          )}
          <CardHeader>
            <CardTitle>Invitation à rejoindre un événement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {event && (
              <div>
                <p className="text-lg mb-2">
                  Vous êtes invité à rejoindre l'événement{' '}
                  <strong>{event.name}</strong>
                </p>
                <p className="text-muted-foreground mb-4">
                  en tant que{' '}
                  <strong>{getRoleLabel(invitation.role)}</strong>
                </p>
                
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(event.start_date), 'PPP', { locale: fr })}
                      {event.end_date &&
                        ` - ${format(new Date(event.end_date), 'PPP', { locale: fr })}`}
                    </span>
                  </div>
                  {event.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.city}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!user && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                Merci de vous connecter pour accepter cette invitation
              </p>
            )}

            {user && !emailMatches && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded font-medium">
                ⚠️ Votre email ne correspond pas à celle de l'invitation
              </p>
            )}

            {user && emailMatches && (
              <p className="text-sm text-green-600 bg-green-50 p-3 rounded">
                ✓ Cette invitation est destinée à <strong>{invitation.invitee_email}</strong>
              </p>
            )}

            <div className="flex flex-col md:flex-row gap-3">
              <Button
                className="flex-1 w-full md:w-auto"
                onClick={handleAccept}
                disabled={processing || !user || !emailMatches}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Accepter
                  </>
                )}
              </Button>
              <Button
                className="flex-1 w-full md:w-auto"
                variant="outline"
                onClick={handleReject}
                disabled={processing || !user || !emailMatches}
              >
                <X className="w-4 h-4 mr-2" />
                Refuser
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
