interface WineNotice {
  rating: number;
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
  liked?: number;
}

interface WineTastingNotesProps {
  wineNotice: WineNotice;
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

export const WineTastingNotes = ({ wineNotice }: WineTastingNotesProps) => {
  return (
    <div className="bg-[#f5f0e8] dark:bg-muted/50 rounded-lg p-4 space-y-3">
      {/* Header avec titre et note */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-foreground">Impressions de dégustation</h4>
        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
          {wineNotice.rating}/10
        </span>
      </div>
      
      {/* Grille 2x2 des caractéristiques */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <TastingBar label="Acidité" value={wineNotice.acidity} />
        <TastingBar label="Tanins" value={wineNotice.tannins} />
        <TastingBar label="Corps" value={wineNotice.body} />
        <TastingBar label="Douceur" value={wineNotice.sweetness} />
      </div>
    </div>
  );
};
