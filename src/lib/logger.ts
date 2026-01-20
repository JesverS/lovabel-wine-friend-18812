/**
 * Logger centralisé pour le projet
 * En production, seules les erreurs sont loggées
 * En développement, tous les logs sont affichés
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log de debug - uniquement en développement
   */
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log d'avertissement - uniquement en développement
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log d'erreur - toujours affiché (nécessaire pour le débogage production)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Log d'info - uniquement en développement
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log de debug - uniquement en développement
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log groupé - uniquement en développement
   */
  group: (label: string): void => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * Fin de groupe - uniquement en développement
   */
  groupEnd: (): void => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Log de table - uniquement en développement
   */
  table: (data: unknown): void => {
    if (isDev) {
      console.table(data);
    }
  },
};

export default logger;
