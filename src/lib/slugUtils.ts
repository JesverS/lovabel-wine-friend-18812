export function sanitizeSlugInput(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime accents
    .replace(/[^a-z0-9-]/g, "-")     // remplace interdits par -
    .replace(/-+/g, "-")             // évite "----"
    .replace(/^-+|-+$/g, "")         // trim "-"
    .slice(0, 60);                   // limite 60 caractères
}

/**
 * Génère un slug unique pour un utilisateur OAuth (Apple, Google)
 * Format : prenom-nom-XXXX (4 chiffres aléatoires)
 */
export function generateUserSlug(firstName: string, lastName: string): string {
  const baseSlug = sanitizeSlugInput(`${firstName} ${lastName}`.trim());
  const randomId = Math.floor(1000 + Math.random() * 9000).toString();
  return `${baseSlug}-${randomId}`;
}

/**
 * Génère un slug unique pour un événement
 * Format : slugify(event_name) + "-" + randomShortId
 */
export function generateEventSlug(eventName: string): string {
  const baseSlug = sanitizeSlugInput(eventName);
  // Générer un ID court de 8 caractères
  const randomId = crypto.randomUUID().slice(0, 8);
  return `${baseSlug}-${randomId}`;
}
