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
