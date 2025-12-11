import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard, X, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface PendingPaymentBannerProps {
  timeRemaining: number; // in seconds
  amount: number;
  currency: string;
  onResume: () => void;
  onCancel: () => Promise<boolean>;
  isCanceling: boolean;
}

export function PendingPaymentBanner({
  timeRemaining,
  amount,
  currency,
  onResume,
  onCancel,
  isCanceling,
}: PendingPaymentBannerProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (amt: number, curr: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: curr,
    }).format(amt);
  };

  const handleCancel = async () => {
    const success = await onCancel();
    setShowCancelDialog(false);
    
    if (success) {
      toast({
        title: 'Réservation annulée',
        description: 'Votre place a été libérée.',
      });
    } else {
      toast({
        title: 'Erreur',
        description: "Impossible d'annuler la réservation.",
        variant: 'destructive',
      });
    }
  };

  const isExpiringSoon = timeRemaining <= 300; // 5 minutes

  return (
    <>
      <div className="space-y-3">
        <div className={`rounded-lg border p-4 ${
          isExpiringSoon 
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              isExpiringSoon 
                ? 'bg-amber-100 dark:bg-amber-900/50' 
                : 'bg-blue-100 dark:bg-blue-900/50'
            }`}>
              <Clock className={`w-5 h-5 ${
                isExpiringSoon 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${
                isExpiringSoon 
                  ? 'text-amber-800 dark:text-amber-200' 
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                Réservation en cours
              </h4>
              <p className={`text-sm mt-1 ${
                isExpiringSoon 
                  ? 'text-amber-700 dark:text-amber-300' 
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                Vous avez une place réservée pour {formatPrice(amount, currency)}.
                {isExpiringSoon && ' Finalisez rapidement votre paiement !'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-2xl font-mono font-bold ${
                  isExpiringSoon 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
                <span className={`text-sm ${
                  isExpiringSoon 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  restantes
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={onResume} 
            className="flex-1"
            size="lg"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Reprendre mon paiement
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowCancelDialog(true)}
            disabled={isCanceling}
            size="lg"
          >
            {isCanceling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            Annuler
          </Button>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler votre réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre place sera libérée et disponible pour d'autres participants. 
              Vous devrez recommencer le processus de paiement si vous souhaitez participer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Non, garder ma réservation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCanceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                'Oui, annuler ma réservation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
