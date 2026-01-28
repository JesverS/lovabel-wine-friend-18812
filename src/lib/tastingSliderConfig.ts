/**
 * Configuration centralisée des sliders de dégustation selon le type de vin
 * Types de vin: 1=rouge, 2=blanc, 5=rosé, 7=autre, 8=effervescent
 */

export interface SliderConfig {
  key: 'slot1' | 'slot2' | 'slot3' | 'slot4';
  label: string;
  lowLabel: string;
  highLabel: string;
}

export interface WineTypeSliders {
  slot1: SliderConfig;
  slot2: SliderConfig;
  slot3: SliderConfig;
  slot4: SliderConfig;
}

const ROUGE_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Fruité', lowLabel: 'Peu fruité', highLabel: 'Très fruité' },
  slot2: { key: 'slot2', label: 'Épicé', lowLabel: 'Peu épicé', highLabel: 'Très épicé' },
  slot3: { key: 'slot3', label: 'Tannique', lowLabel: 'Très doux', highLabel: 'Très tannique' },
  slot4: { key: 'slot4', label: 'Boisé', lowLabel: 'Peu boisé', highLabel: 'Très boisé' },
};

const BLANC_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidité', lowLabel: 'Très faible', highLabel: 'Très marquée' },
  slot2: { key: 'slot2', label: 'Sec', lowLabel: 'Sucré', highLabel: 'Très sec' },
  slot3: { key: 'slot3', label: 'Sucrosité', lowLabel: 'Très sec', highLabel: 'Très sucré' },
  slot4: { key: 'slot4', label: 'Gras', lowLabel: 'Très léger', highLabel: 'Très gras' },
};

const ROSE_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidité', lowLabel: 'Très faible', highLabel: 'Très marquée' },
  slot2: { key: 'slot2', label: 'Fruité', lowLabel: 'Peu fruité', highLabel: 'Très fruité' },
  slot3: { key: 'slot3', label: 'Sec', lowLabel: 'Sucré', highLabel: 'Très sec' },
  slot4: { key: 'slot4', label: 'Frais', lowLabel: 'Lourd', highLabel: 'Très frais' },
};

const EFFERVESCENT_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidité', lowLabel: 'Très faible', highLabel: 'Très marquée' },
  slot2: { key: 'slot2', label: 'Sec', lowLabel: 'Doux', highLabel: 'Brut' },
  slot3: { key: 'slot3', label: 'Sucrosité', lowLabel: 'Très sec', highLabel: 'Très sucré' },
  slot4: { key: 'slot4', label: 'Effervescence', lowLabel: 'Peu pétillant', highLabel: 'Très pétillant' },
};

/**
 * Retourne la configuration des sliders selon le type de vin
 */
export function getSlidersForWineType(wineTypeId: number | null | undefined): WineTypeSliders {
  switch (wineTypeId) {
    case 2: return BLANC_SLIDERS;
    case 5: return ROSE_SLIDERS;
    case 8: return EFFERVESCENT_SLIDERS;
    case 1: // rouge
    case 7: // autre
    default: return ROUGE_SLIDERS;
  }
}

/**
 * Interface pour les détails de dégustation avec slots génériques
 */
export interface TastingDetails {
  rating: number;
  slot1: number;
  slot2: number;
  slot3: number;
  slot4: number;
  remarks?: string;
}

/**
 * Migre les anciennes données (acidity, tannins, body, sweetness) vers le nouveau format (slot1-4)
 * Compatible lecture seule - ne modifie pas les données en base
 */
export function migrateTastingDetails(details: any): TastingDetails {
  if (!details || typeof details !== 'object') {
    return {
      rating: 5.0,
      slot1: 5.0,
      slot2: 5.0,
      slot3: 5.0,
      slot4: 5.0,
      remarks: '',
    };
  }

  // Si nouvelles clés déjà présentes, les utiliser
  if ('slot1' in details) {
    return {
      rating: details.rating ?? 5.0,
      slot1: details.slot1 ?? 5.0,
      slot2: details.slot2 ?? 5.0,
      slot3: details.slot3 ?? 5.0,
      slot4: details.slot4 ?? 5.0,
      remarks: details.remarks || '',
    };
  }

  // Sinon, migrer les anciennes clés
  return {
    rating: details.rating ?? 5.0,
    slot1: details.acidity ?? 5.0,
    slot2: details.tannins ?? 5.0,
    slot3: details.body ?? 5.0,
    slot4: details.sweetness ?? 5.0,
    remarks: details.remarks || '',
  };
}

/**
 * Convertit les TastingDetails vers le format de sauvegarde en base
 * Utilise les nouvelles clés slot1-4 pour les nouvelles sauvegardes
 */
export function tastingDetailsToDbFormat(details: TastingDetails): Record<string, any> {
  return {
    rating: Math.round(details.rating * 10) / 10,
    slot1: Math.round(details.slot1 * 10) / 10,
    slot2: Math.round(details.slot2 * 10) / 10,
    slot3: Math.round(details.slot3 * 10) / 10,
    slot4: Math.round(details.slot4 * 10) / 10,
    remarks: details.remarks || '',
  };
}
