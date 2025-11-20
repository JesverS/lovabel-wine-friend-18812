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
 * Génère un slug unique pour un événement
 * Format : slugify(event_name) + "-" + randomShortId
 */
export function generateEventSlug(eventName: string): string {
  const baseSlug = sanitizeSlugInput(eventName);
  // Générer un ID court de 8 caractères
  const randomId = crypto.randomUUID().slice(0, 8);
  return `${baseSlug}-${randomId}`;
}
