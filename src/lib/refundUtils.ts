// Configuration des frais de remboursement
// Ces valeurs doivent correspondre aux secrets Supabase REFUND_FEE_PERCENT et REFUND_FEE_FIXED
export const REFUND_FEE_PERCENT = 3.5; // 3.5%
export const REFUND_FEE_FIXED = 0.30; // 0.30€

// Prix minimum pour un événement payant
export const MIN_EVENT_PRICE = 1.00; // 1€

/**
 * Calcule les frais de remboursement estimés (fourchette haute)
 */
export function calculateRefundFees(amount: number): number {
  return (amount * REFUND_FEE_PERCENT / 100) + REFUND_FEE_FIXED;
}

/**
 * Calcule le montant qui sera remboursé au participant
 */
export function calculateRefundAmount(amount: number): number {
  const fees = calculateRefundFees(amount);
  return Math.max(0, amount - fees);
}

/**
 * Formate un montant en devise
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency 
  }).format(amount);
}
