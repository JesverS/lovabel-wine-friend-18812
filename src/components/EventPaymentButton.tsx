import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2 } from 'lucide-react';

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
  );
}
