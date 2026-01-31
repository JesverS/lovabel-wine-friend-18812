import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WineLabelData {
  wine_name: string | null;
  domain_name: string | null;
  year: number | null;
  appellation: string | null;
  wine_type: 'rouge' | 'blanc' | 'rosé' | 'effervescent' | 'autre' | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  region: string | null;
  confidence: number;
}

interface UseWineLabelScanResult {
  scanning: boolean;
  scanResult: WineLabelData | null;
  error: string | null;
  scanImage: (imageBase64: string) => Promise<WineLabelData | null>;
  reset: () => void;
}

export function useWineLabelScan(): UseWineLabelScanResult {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<WineLabelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanImage = async (imageBase64: string): Promise<WineLabelData | null> => {
    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-wine-label', {
        body: { image_base64: imageBase64 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.data) {
        setScanResult(data.data);
        
        // Show confidence feedback
        const confidence = data.data.confidence;
        if (confidence >= 0.8) {
          toast.success('Étiquette analysée avec succès !');
        } else if (confidence >= 0.5) {
          toast.info('Étiquette partiellement reconnue, vérifiez les informations');
        } else {
          toast.warning('Reconnaissance difficile, complétez manuellement si nécessaire');
        }
        
        return data.data;
      }

      throw new Error('Réponse inattendue du serveur');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du scan';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setScanResult(null);
    setError(null);
  };

  return {
    scanning,
    scanResult,
    error,
    scanImage,
    reset,
  };
}
