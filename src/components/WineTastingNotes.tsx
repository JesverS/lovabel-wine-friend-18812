import { getSlidersForWineType, migrateTastingDetails } from '@/lib/tastingSliderConfig';

interface WineNotice {
  rating: number;
  // Ancien format
  acidity?: number;
  tannins?: number;
  body?: number;
  sweetness?: number;
  // Nouveau format
  slot1?: number;
  slot2?: number;
  slot3?: number;
  slot4?: number;
  liked?: number;
}

interface WineTastingNotesProps {
  wineNotice: WineNotice;
  wineTypeId?: number | null;
}

const TastingBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{value}/10</span>
    </div>
    <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  </div>
);

export const WineTastingNotes = ({ wineNotice, wineTypeId }: WineTastingNotesProps) => {
  // Migrer les données vers le nouveau format si nécessaire
  const migratedDetails = migrateTastingDetails(wineNotice);
  const sliders = getSlidersForWineType(wineTypeId);

  return (
    <div className="bg-[#f5f0e8] dark:bg-muted/50 rounded-lg p-4 space-y-3">
      {/* Header avec titre et note */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-foreground">Impressions de dégustation</h4>
        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
          {migratedDetails.rating}/10
        </span>
      </div>
      
      {/* Grille 2x2 des caractéristiques avec labels dynamiques */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <TastingBar label={sliders.slot1.label} value={migratedDetails.slot1} />
        <TastingBar label={sliders.slot2.label} value={migratedDetails.slot2} />
        <TastingBar label={sliders.slot3.label} value={migratedDetails.slot3} />
        <TastingBar label={sliders.slot4.label} value={migratedDetails.slot4} />
      </div>
    </div>
  );
};
