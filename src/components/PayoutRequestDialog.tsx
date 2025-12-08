import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Banknote, 
  Clock, 
  Zap, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Euro
} from 'lucide-react';

interface PayoutOption {
  method: string;
  fee: number;
  feePercent?: number;
  feeDescription: string;
  deliveryTime: string;
  netAmount: number;
}

interface BalanceData {
  availableAmount: number;
  currency: string;
  payoutOptions: {
    standard: PayoutOption;
    instant: PayoutOption;
  };
}

interface PayoutRequestDialogProps {
  triggerButton?: React.ReactNode;
}

export function PayoutRequestDialog({ triggerButton }: PayoutRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'standard' | 'instant'>('standard');
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchBalance();
      setPayoutSuccess(false);
      setError(null);
    }
  }, [open]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase.functions.invoke('request-stripe-payout', {
      body: { currency: 'eur' }
    });

    if (fetchError) {
      setError('Impossible de récupérer votre solde');
      console.error('Balance fetch error:', fetchError);
    } else if (data.error) {
      setError(data.error);
    } else if (data.balanceOnly) {
      setBalanceData({
        availableAmount: data.availableAmount,
        currency: data.currency,
        payoutOptions: data.payoutOptions
      });
    }
    setBalanceLoading(false);
  };

  const handleRequestPayout = async () => {
    if (!balanceData) return;
    
    setLoading(true);
    setError(null);

    const { data, error: payoutError } = await supabase.functions.invoke('request-stripe-payout', {
      body: {
        method: selectedMethod,
        amount: balanceData.availableAmount,
        currency: 'eur'
      }
    });

    if (payoutError) {
      setError('Erreur lors de la demande de virement');
      console.error('Payout error:', payoutError);
    } else if (data.error) {
      setError(data.error);
    } else if (data.success) {
      setPayoutSuccess(true);
      toast({
        title: 'Virement demandé !',
        description: `Votre virement de ${data.payout.amount.toFixed(2)} € sera effectué ${selectedMethod === 'instant' ? 'dans ~30 minutes' : 'sous 1-2 jours ouvrables'}.`,
      });
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button>
            <Banknote className="w-4 h-4 mr-2" />
            Demander un virement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander un virement</DialogTitle>
          <DialogDescription>
            Transférez vos gains sur votre compte bancaire
          </DialogDescription>
        </DialogHeader>

        {balanceLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error && !balanceData ? (
          <div className="py-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchBalance}>
              Réessayer
            </Button>
          </div>
        ) : payoutSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Virement initié !</h3>
            <p className="text-muted-foreground">
              Votre virement est en cours de traitement.
              {selectedMethod === 'instant' 
                ? ' Il arrivera dans environ 30 minutes.'
                : ' Il arrivera sous 1 à 2 jours ouvrables.'}
            </p>
            <Button className="mt-6" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        ) : balanceData && balanceData.availableAmount > 0 ? (
          <div className="space-y-6 py-4">
            {/* Solde disponible */}
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(balanceData.availableAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sélection du mode de virement */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Mode de virement</Label>
              
              <RadioGroup 
                value={selectedMethod} 
                onValueChange={(v) => setSelectedMethod(v as 'standard' | 'instant')}
                className="space-y-3"
              >
                {/* Virement standard */}
                <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedMethod === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <RadioGroupItem value="standard" id="standard" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Virement standard</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Gratuit</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Réception sous 1-2 jours ouvrables
                      </p>
                      <p className="text-sm font-medium text-green-600 mt-2">
                        Vous recevrez : {formatCurrency(balanceData.payoutOptions.standard.netAmount)}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Virement instantané */}
                <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedMethod === 'instant' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <RadioGroupItem value="instant" id="instant" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">Virement instantané</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                          {balanceData.payoutOptions.instant.feeDescription}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Réception en ~30 minutes
                      </p>
                      <div className="text-sm mt-2 space-y-0.5">
                        <p className="text-muted-foreground">
                          Frais : {formatCurrency(balanceData.payoutOptions.instant.fee)}
                        </p>
                        <p className="font-medium text-green-600">
                          Vous recevrez : {formatCurrency(balanceData.payoutOptions.instant.netAmount)}
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleRequestPayout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4 mr-2" />
                  Confirmer le virement
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Le virement sera effectué vers le compte bancaire configuré dans votre compte Stripe.
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Euro className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">Aucun solde disponible</p>
            <p className="text-sm text-muted-foreground mt-1">
              Votre solde est actuellement de 0 €. Les fonds deviennent disponibles quelques jours après les paiements.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
