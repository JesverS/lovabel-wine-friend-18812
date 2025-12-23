import { Database } from "@/integrations/supabase/types";

type DomainRegion = Database["public"]["Enums"]["domain_region"];

export const REGIONS: { value: DomainRegion | "unknown" | "other"; label: string }[] = [
  { value: "unknown", label: "Je ne sais pas" },
  { value: "Alsace", label: "Alsace" },
  { value: "Beaujolais", label: "Beaujolais" },
  { value: "Bordeaux", label: "Bordeaux" },
  { value: "Bourgogne", label: "Bourgogne" },
  { value: "Champagne", label: "Champagne" },
  { value: "Corse", label: "Corse" },
  { value: "Jura", label: "Jura" },
  { value: "Languedoc-Roussillon", label: "Languedoc-Roussillon" },
  { value: "Loire", label: "Loire" },
  { value: "Provence", label: "Provence" },
  { value: "Rhône", label: "Rhône" },
  { value: "Sud-Ouest", label: "Sud-Ouest" },
  { value: "other", label: "Autre" },
];

// Type pour un domaine avec les champs région
interface DomainWithRegion {
  region?: DomainRegion | "unknown" | "other" | null;
  custom_region?: string | null;
}

/**
 * Retourne le nom de la région à afficher
 * - Si region est null ou 'unknown', retourne "Non renseignée"
 * - Si region est 'other', retourne custom_region ou "Autre région"
 * - Sinon retourne le nom de la région
 */
export function getDisplayRegion(domain: DomainWithRegion | null | undefined): string {
  if (!domain) return "Non renseignée";
  
  const { region, custom_region } = domain;
  
  if (!region || region === "unknown") {
    return "Non renseignée";
  }
  
  if (region === "other") {
    return custom_region?.trim() || "Autre région";
  }
  
  return region;
}

/**
 * Vérifie si une région est connue (pas unknown/other/null)
 */
export function isKnownRegion(region: DomainRegion | "unknown" | "other" | null | undefined): boolean {
  return !!region && region !== "unknown" && region !== "other";
}
