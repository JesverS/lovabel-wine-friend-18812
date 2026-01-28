import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface WineType {
  id: number;
  type: string;
}

interface WineTypeSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

// Labels d'affichage pour les types de vin
const WINE_TYPE_LABELS: Record<string, string> = {
  'rouge': 'Rouge',
  'blanc': 'Blanc',
  'rosé': 'Rosé',
  'rose': 'Rosé',
  'effervescent': 'Effervescent',
  'autre': 'Autre',
};

export function WineTypeSelect({
  value,
  onChange,
  label = 'Type de vin',
  required = false,
  className = '',
}: WineTypeSelectProps) {
  const [wineTypes, setWineTypes] = useState<WineType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWineTypes = async () => {
      const { data, error } = await supabase
        .from('wine_type')
        .select('id, type')
        .order('id');

      if (!error && data) {
        setWineTypes(data);
      }
      setLoading(false);
    };

    fetchWineTypes();
  }, []);

  const getDisplayLabel = (type: string): string => {
    return WINE_TYPE_LABELS[type.toLowerCase()] || type;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Select 
        value={value?.toString() || ''} 
        onValueChange={(val) => onChange(val ? parseInt(val) : null)}
        disabled={loading}
      >
        <SelectTrigger className="h-11">
          <SelectValue placeholder={loading ? 'Chargement...' : 'Sélectionner un type'} />
        </SelectTrigger>
        <SelectContent>
          {wineTypes.map((wineType) => (
            <SelectItem key={wineType.id} value={wineType.id.toString()}>
              {getDisplayLabel(wineType.type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Export pour compatibilité avec l'ancien code (mapping ID -> label)
export { WINE_TYPE_LABELS };
