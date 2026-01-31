import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, X, Scan, CheckCircle, AlertCircle } from 'lucide-react';
import { useWineLabelScan, WineLabelData } from '@/hooks/useWineLabelScan';
import { cn } from '@/lib/utils';

interface WineLabelScannerProps {
  onScanComplete: (data: WineLabelData) => void;
  disabled?: boolean;
  className?: string;
}

export function WineLabelScanner({ onScanComplete, disabled, className }: WineLabelScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'none' | 'camera' | 'file'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { scanning, scanResult, error, scanImage, reset } = useWineLabelScan();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setCaptureMode('file');
      
      // Auto-scan
      const result = await scanImage(base64);
      if (result) {
        onScanComplete(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setImagePreview(null);
    setCaptureMode('none');
    reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRetry = async () => {
    if (imagePreview) {
      const result = await scanImage(imagePreview);
      if (result) {
        onScanComplete(result);
      }
    }
  };

  // Compact mode when no image
  if (!imagePreview) {
    return (
      <div className={cn("space-y-3 p-3 border rounded-lg bg-muted/30", className)}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scan className="w-4 h-4 text-primary" />
            Scanner une étiquette
          </div>
          <p className="text-xs text-muted-foreground">
            Prenez une photo de l'étiquette pour remplir automatiquement les champs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            disabled={disabled}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFileUpload}
            disabled={disabled}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Fichier
          </Button>
        </div>
        
        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // Preview mode with scan results
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Analyse en cours...
            </>
          ) : scanResult ? (
          <>
              <CheckCircle className="w-4 h-4 text-primary" />
              Étiquette analysée
              <span className="text-xs text-muted-foreground">
                ({Math.round(scanResult.confidence * 100)}% confiance)
              </span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-4 h-4 text-destructive" />
              Erreur d'analyse
            </>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Image preview */}
      <div className="relative rounded-lg overflow-hidden border bg-muted/50">
        <img
          src={imagePreview}
          alt="Étiquette scannée"
          className={cn(
            "w-full h-32 object-contain",
            scanning && "opacity-50"
          )}
        />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 rounded-full p-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Scan results preview */}
      {scanResult && (
        <div className="text-xs space-y-1 p-2 bg-muted/50 rounded-md">
          {scanResult.domain_name && (
            <p><span className="text-muted-foreground">Domaine:</span> {scanResult.domain_name}</p>
          )}
          {scanResult.wine_name && (
            <p><span className="text-muted-foreground">Vin:</span> {scanResult.wine_name}</p>
          )}
          {scanResult.year && (
            <p><span className="text-muted-foreground">Année:</span> {scanResult.year}</p>
          )}
          {scanResult.appellation && (
            <p><span className="text-muted-foreground">Appellation:</span> {scanResult.appellation}</p>
          )}
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex-1"
          >
            Réessayer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="flex-1"
          >
            Annuler
          </Button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
