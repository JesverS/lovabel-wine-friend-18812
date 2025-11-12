import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';

export default function CellarInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [cellar, setCellar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
        .from('cellar_invitation')
        .select('*, cellar(*)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !inv) {
        toast.error('Invitation introuvable ou expirée', {
          duration: 8000,
        });
        navigate('/');
        return;
      }

      // Vérifier si expirée
      if (new Date(inv.expires_at) < new Date()) {
        toast.error('Cette invitation a expiré', {
          duration: 8000,
        });
        navigate('/');
        return;
      }

      setInvitation(inv);
      setCellar(inv.cellar);
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      toast.error(error.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour accepter cette invitation');
      navigate(`/auth?redirect=/cellar-invitation/${token}`);
      return;
    }

    setProcessing(true);
    try {
      // Ajouter à user_cellar
      const { error: insertError } = await supabase
        .from('user_cellar')
        .insert({
          user_id: user.id,
          user_cellar_id: invitation.cellar_id,
          role: invitation.role,
        });

      if (insertError) throw insertError;

      // SUPPRIMER l'invitation (au lieu de UPDATE status)
      const { error: deleteError } = await supabase
        .from('cellar_invitation')
        .delete()
        .eq('id', invitation.id);

      if (deleteError) throw deleteError;

      toast.success('Vous avez rejoint la cave !');
      navigate(`/cellar/${invitation.cellar_id}`);
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
      // DELETE au lieu de UPDATE status
      const { error } = await supabase
        .from('cellar_invitation')
        .delete()
        .eq('id', invitation.id);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invitation à rejoindre une cave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {cellar && (
              <div>
                <p className="text-lg mb-2">
                  Vous êtes invité à rejoindre la cave{' '}
                  <strong>{cellar.name}</strong>
                </p>
                <p className="text-muted-foreground">
                  en tant que{' '}
                  <strong>
                    {invitation.role === 'admin' ? 'Administrateur' : 'Propriétaire'}
                  </strong>
                </p>
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
                disabled={processing}
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