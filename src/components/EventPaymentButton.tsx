import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { calculateRefundAmount, REFUND_FEE_PERCENT, REFUND_FEE_FIXED, formatCurrency } from '@/lib/refundUtils';

interface EventPaymentButtonProps {
  eventId: string;
  eventName: string;
  price: number;
  currency: string;
  disabled?: boolean;
}

export function EventPaymentButton({
  eventId,
  eventName,
  price,
  currency,
  disabled = false,
}: EventPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  const estimatedRefund = calculateRefundAmount(price);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const currentUrl = window.location.href;
      // Utiliser & si l'URL contient déjà des paramètres (ex: ?token=xxx)
      const separator = currentUrl.includes('?') ? '&' : '?';
      const successUrl = `${currentUrl}${separator}payment=success`;
      const cancelUrl = `${currentUrl}${separator}payment=cancelled`;

      const { data, error } = await supabase.functions.invoke('create-event-checkout-session', {
        body: {
          eventId,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors du paiement.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePayment}
        disabled={disabled || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Redirection...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Payer {formatPrice(price, currency)} pour accéder
          </>
        )}
      </Button>
      
      {/* Avertissement sur le remboursement */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium mb-1">Politique de remboursement</p>
            <p>
              En cas d'annulation, le remboursement sera diminué des frais bancaires 
              (~{REFUND_FEE_PERCENT}% + {REFUND_FEE_FIXED.toFixed(2)}€).
            </p>
            <p className="mt-1">
              Remboursement estimé : <strong>{formatCurrency(estimatedRefund, currency)}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
