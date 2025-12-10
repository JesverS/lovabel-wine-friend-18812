// Commission plateforme (même valeur que dans le checkout et l'edge function)
export const PLATFORM_FEE_PERCENT = 10; // 10%

// Prix minimum pour un événement payant
export const MIN_EVENT_PRICE = 1.00; // 1€

/**
 * Calcule les frais (commission plateforme) retenus lors d'un remboursement
 */
export function calculateRefundFees(amount: number): number {
  return amount * (PLATFORM_FEE_PERCENT / 100);
}

/**
 * Calcule le montant qui sera remboursé au participant
 * (ce que l'organisateur a reçu = montant original - commission plateforme)
 */
export function calculateRefundAmount(amount: number): number {
  return amount * (1 - PLATFORM_FEE_PERCENT / 100);
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
