import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, AlertTriangle } from 'lucide-react';
import { calculateRefundAmount, PLATFORM_FEE_PERCENT, formatCurrency } from '@/lib/refundUtils';
import { usePendingPayment } from '@/hooks/usePendingPayment';
import { PendingPaymentBanner } from '@/components/PendingPaymentBanner';
import { Skeleton } from '@/components/ui/skeleton';

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
  
  const {
    hasPendingPayment,
    pendingData,
    timeRemaining,
    isLoading: isPendingLoading,
    resumePayment,
    cancelPayment,
    isCanceling,
    refetch: refetchPending,
  } = usePendingPayment(eventId);

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
      const url = new URL(window.location.href);
      const successParams = new URLSearchParams(url.search);
      successParams.set('payment', 'success');
      const cancelParams = new URLSearchParams(url.search);
      cancelParams.set('payment', 'cancelled');
      const successUrl = `${url.origin}${url.pathname}?${successParams.toString()}`;
      const cancelUrl = `${url.origin}${url.pathname}?${cancelParams.toString()}`;

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
      // Refetch pending status in case something changed
      refetchPending();
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isPendingLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Show pending payment banner if exists
  if (hasPendingPayment && pendingData) {
    return (
      <PendingPaymentBanner
        timeRemaining={timeRemaining}
        amount={pendingData.amount}
        currency={pendingData.currency}
        onResume={resumePayment}
        onCancel={cancelPayment}
        isCanceling={isCanceling}
      />
    );
  }

  // Normal payment button
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
              En cas d'annulation, le remboursement sera diminué de la commission plateforme ({PLATFORM_FEE_PERCENT}%).
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
