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
  custom_region: string | null;
  confidence: number;
  // Resolved IDs after matching
  domain_id: string | null;
  appellation_id: number | null;
  domain_created: boolean;
  appellation_created: boolean;
}

interface ScanErrorResponse {
  error: string;
  code?: 'PREMIUM_REQUIRED' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'CREDITS_EXHAUSTED' | 'UNAUTHORIZED' | 'INVALID_TOKEN' | 'MISSING_IMAGE' | 'PARSE_ERROR' | 'AI_ERROR' | 'NO_RESPONSE' | 'SERVICE_ERROR' | 'INTERNAL_ERROR';
  usage?: { current: number; limit: number };
}

interface UseWineLabelScanResult {
  scanning: boolean;
  scanResult: WineLabelData | null;
  scannedImageBase64: string | null;
  error: string | null;
  scanImage: (imageBase64: string) => Promise<WineLabelData | null>;
  reset: () => void;
}

const handleScanError = (data: ScanErrorResponse) => {
  switch (data.code) {
    case 'PREMIUM_REQUIRED':
      toast.error('Cette fonctionnalité est réservée aux membres premium');
      break;
    case 'QUOTA_EXCEEDED':
      toast.error(`Limite mensuelle atteinte (${data.usage?.current}/${data.usage?.limit} scans)`);
      break;
    case 'RATE_LIMITED':
      toast.warning('Trop de requêtes, veuillez patienter quelques secondes');
      break;
    case 'CREDITS_EXHAUSTED':
      toast.error('Service temporairement indisponible, réessayez plus tard');
      break;
    case 'UNAUTHORIZED':
    case 'INVALID_TOKEN':
      toast.error('Veuillez vous reconnecter');
      break;
    case 'PARSE_ERROR':
    case 'AI_ERROR':
    case 'NO_RESPONSE':
      toast.error('Erreur d\'analyse, veuillez réessayer avec une photo plus nette');
      break;
    default:
      toast.error(data.error || 'Erreur lors du scan');
  }
};

export function useWineLabelScan(): UseWineLabelScanResult {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<WineLabelData | null>(null);
  const [scannedImageBase64, setScannedImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanImage = async (imageBase64: string): Promise<WineLabelData | null> => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setScannedImageBase64(imageBase64);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-wine-label', {
        body: { image_base64: imageBase64 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        handleScanError(data as ScanErrorResponse);
        setError(data.error);
        return null;
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
        
        // Show creation info
        if (data.data.domain_created) {
          toast.info(`Nouveau domaine créé : ${data.data.domain_name}`);
        }
        if (data.data.appellation_created) {
          toast.info(`Nouvelle appellation créée : ${data.data.appellation}`);
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
    setScannedImageBase64(null);
    setError(null);
  };

  return {
    scanning,
    scanResult,
    scannedImageBase64,
    error,
    scanImage,
    reset,
  };
}
