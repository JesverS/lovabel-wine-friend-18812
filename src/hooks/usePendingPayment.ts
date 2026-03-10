import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PendingPaymentData {
  paymentId: string;
  stripeUrl: string;
  expiresAt: string;
  amount: number;
  currency: string;
}

interface UsePendingPaymentReturn {
  hasPendingPayment: boolean;
  pendingData: PendingPaymentData | null;
  timeRemaining: number; // in seconds
  isLoading: boolean;
  resumePayment: () => void;
  cancelPayment: () => Promise<boolean>;
  isCanceling: boolean;
  refetch: () => Promise<void>;
}

export function usePendingPayment(eventId: string): UsePendingPaymentReturn {
  const { user } = useAuth();
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [pendingData, setPendingData] = useState<PendingPaymentData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateTimeRemaining = useCallback((expiresAt: string): number => {
    const expiresDate = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((expiresDate - now) / 1000));
    return diff;
  }, []);

  const fetchPendingPayment = useCallback(async () => {
    if (!user || !eventId) {
      setHasPendingPayment(false);
      setPendingData(null);
      setTimeRemaining(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-pending-payment', {
        body: { eventId },
      });

      if (error) {
        console.error('Error fetching pending payment:', error);
        setHasPendingPayment(false);
        setPendingData(null);
        setTimeRemaining(0);
      } else if (data?.hasPending) {
        setHasPendingPayment(true);
        setPendingData({
          paymentId: data.paymentId,
          stripeUrl: data.stripeUrl,
          expiresAt: data.expiresAt,
          amount: data.amount,
          currency: data.currency,
        });
        setTimeRemaining(calculateTimeRemaining(data.expiresAt));
      } else {
        setHasPendingPayment(false);
        setPendingData(null);
        setTimeRemaining(0);
      }
    } catch (err) {
      console.error('Error fetching pending payment:', err);
      setHasPendingPayment(false);
      setPendingData(null);
      setTimeRemaining(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, eventId, calculateTimeRemaining]);

  // Initial fetch
  useEffect(() => {
    fetchPendingPayment();
  }, [fetchPendingPayment]);

  // Countdown timer
  useEffect(() => {
    if (!hasPendingPayment || !pendingData) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining(pendingData.expiresAt);
      setTimeRemaining(remaining);

      // If expired, refetch to update status
      if (remaining <= 0) {
        fetchPendingPayment();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPendingPayment, pendingData, calculateTimeRemaining, fetchPendingPayment]);

  const resumePayment = useCallback(() => {
    if (pendingData?.stripeUrl) {
      window.location.href = pendingData.stripeUrl;
    }
  }, [pendingData]);

  const cancelPayment = useCallback(async (): Promise<boolean> => {
    if (!pendingData?.paymentId) return false;

    setIsCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-pending-payment', {
        body: { paymentId: pendingData.paymentId },
      });

      if (error || !data?.success) {
        console.error('Error canceling payment:', error);
        return false;
      }

      // Reset state
      setHasPendingPayment(false);
      setPendingData(null);
      setTimeRemaining(0);
      return true;
    } catch (err) {
      console.error('Error canceling payment:', err);
      return false;
    } finally {
      setIsCanceling(false);
    }
  }, [pendingData]);

  return {
    hasPendingPayment,
    pendingData,
    timeRemaining,
    isLoading,
    resumePayment,
    cancelPayment,
    isCanceling,
    refetch: fetchPendingPayment,
  };
}
