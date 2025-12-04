import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StripeAccountStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  accountStatus?: string;
}

export function OrganizerStripeSetup() {
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);

  useEffect(() => {
    fetchAccountStatus();
  }, []);

  // Check for onboarding completion from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_onboarding') === 'complete') {
      toast.success('Configuration Stripe terminée !');
      fetchAccountStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('stripe_refresh') === 'true') {
      toast.info('Veuillez compléter la configuration Stripe');
      handleSetupStripe();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAccountStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-account-status');
      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Error fetching Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupStripe = async () => {
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-stripe-connect-account', {
        body: { returnUrl: window.location.href },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la configuration');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setDashboardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-login-link');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ouverture du dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Paiements organisateur
            </CardTitle>
            <CardDescription>
              Configurez votre compte pour recevoir les paiements de vos événements
            </CardDescription>
          </div>
          {status?.onboardingComplete && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Actif
            </Badge>
          )}
          {status?.hasAccount && !status?.onboardingComplete && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <AlertCircle className="w-3 h-3 mr-1" />
              Configuration incomplète
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.hasAccount ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pour recevoir les paiements de vos événements payants, vous devez configurer un compte Stripe Connect.
              Les fonds seront directement versés sur votre compte bancaire.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Ce dont vous aurez besoin :</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Une pièce d'identité</li>
                <li>• Vos coordonnées bancaires (IBAN)</li>
                <li>• Quelques minutes pour compléter le processus</li>
              </ul>
            </div>
            <Button onClick={handleSetupStripe} disabled={setupLoading} className="w-full">
              {setupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configuration en cours...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Configurer mes paiements
                </>
              )}
            </Button>
          </div>
        ) : !status?.onboardingComplete ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Votre compte Stripe a été créé mais la configuration n'est pas terminée.
              Veuillez compléter les informations requises pour pouvoir recevoir des paiements.
            </p>
            <Button onClick={handleSetupStripe} disabled={setupLoading} className="w-full">
              {setupLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Compléter la configuration
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Paiements</p>
                <p className="font-medium flex items-center gap-1">
                  {status.chargesEnabled ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Activés
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      En attente
                    </>
                  )}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Virements</p>
                <p className="font-medium flex items-center gap-1">
                  {status.payoutsEnabled ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Activés
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      En attente
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleOpenDashboard} 
              disabled={dashboardLoading}
              className="w-full"
            >
              {dashboardLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Accéder à mon dashboard Stripe
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Gérez vos paiements, consultez vos revenus et configurez vos virements
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
