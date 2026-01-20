/**
 * Utilitaires de gestion d'erreurs typées
 * Remplace les patterns catch (error: any) par une gestion appropriée
 */

/**
 * Extrait un message d'erreur lisible depuis une erreur inconnue
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Une erreur inattendue est survenue';
}

/**
 * Vérifie si l'erreur est une erreur Supabase
 */
export interface SupabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Vérifie si l'erreur est une erreur de validation Zod
 */
export function isZodError(error: unknown): error is { errors: Array<{ message: string }> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown }).errors)
  );
}

/**
 * Vérifie si l'erreur est une erreur réseau
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('offline')
    );
  }
  return false;
}

/**
 * Vérifie si l'erreur est une erreur d'authentification
 */
export function isAuthError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    return (
      error.code.startsWith('auth/') ||
      error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('unauthorized') ||
      error.message.toLowerCase().includes('unauthenticated')
    );
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('unauthenticated') ||
      message.includes('token')
    );
  }
  return false;
}

/**
 * Retourne un message d'erreur utilisateur-friendly basé sur le type d'erreur
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Problème de connexion. Vérifiez votre connexion internet.';
  }
  
  if (isAuthError(error)) {
    return 'Session expirée. Veuillez vous reconnecter.';
  }

  if (isSupabaseError(error)) {
    // Messages personnalisés pour certains codes Supabase courants
    switch (error.code) {
      case '23505': // unique_violation
        return 'Cette valeur existe déjà.';
      case '23503': // foreign_key_violation
        return 'Impossible de supprimer cet élément car il est utilisé ailleurs.';
      case '42501': // insufficient_privilege
        return 'Vous n\'avez pas les permissions nécessaires.';
      case 'PGRST116': // No rows found
        return 'Élément introuvable.';
      default:
        return error.message;
    }
  }

  if (isZodError(error)) {
    return error.errors[0]?.message || 'Erreur de validation des données.';
  }

  return getErrorMessage(error);
}

/**
 * Log une erreur de manière appropriée selon l'environnement
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, {
    message: getErrorMessage(error),
    isSupabase: isSupabaseError(error),
    isNetwork: isNetworkError(error),
    isAuth: isAuthError(error),
    raw: error,
  });
}
