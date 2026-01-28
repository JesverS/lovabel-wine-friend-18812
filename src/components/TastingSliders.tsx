import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getSlidersForWineType, TastingDetails } from '@/lib/tastingSliderConfig';

interface TastingSlidersProps {
  wineTypeId: number | null | undefined;
  values: {
    slot1: number;
    slot2: number;
    slot3: number;
    slot4: number;
  };
  onChange: (key: 'slot1' | 'slot2' | 'slot3' | 'slot4', value: number) => void;
  readOnly?: boolean;
}

export function TastingSliders({ wineTypeId, values, onChange, readOnly = false }: TastingSlidersProps) {
  const sliders = getSlidersForWineType(wineTypeId);

  return (
    <div className="space-y-4">
      {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((key) => {
        const config = sliders[key];
        return (
          <div key={key}>
            <Label className="flex justify-between">
              <span>{config.label}</span>
              <span className="text-muted-foreground">{values[key].toFixed(1)}/10</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              0 = {config.lowLabel} • 10 = {config.highLabel}
            </p>
            <Slider
              value={[values[key]]}
              onValueChange={([v]) => onChange(key, Math.round(v * 10) / 10)}
              min={0}
              max={10}
              step={0.1}
              disabled={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Version en grille 2x2 pour les affichages compacts
 */
interface TastingSlidersGridProps {
  wineTypeId: number | null | undefined;
  values: {
    slot1: number;
    slot2: number;
    slot3: number;
    slot4: number;
  };
  onChange: (key: 'slot1' | 'slot2' | 'slot3' | 'slot4', value: number) => void;
  readOnly?: boolean;
}

export function TastingSlidersGrid({ wineTypeId, values, onChange, readOnly = false }: TastingSlidersGridProps) {
  const sliders = getSlidersForWineType(wineTypeId);

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((key) => {
        const config = sliders[key];
        return (
          <div key={key} className="space-y-2">
            <Label className="flex justify-between">
              <span>{config.label}</span>
              <span className="text-muted-foreground">{values[key].toFixed(1)}</span>
            </Label>
            <Slider
              value={[values[key]]}
              onValueChange={([v]) => onChange(key, Math.round(v * 10) / 10)}
              min={0}
              max={10}
              step={0.5}
              disabled={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}
