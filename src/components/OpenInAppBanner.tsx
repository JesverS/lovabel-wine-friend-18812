import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMobilePlatform,
  isMobileDevice,
  openInApp,
  isBannerDismissed,
  dismissBanner,
  getStoreUrl,
} from '@/lib/mobileAppUtils';

interface OpenInAppBannerProps {
  deepLink: string;
}

export function OpenInAppBanner({ deepLink }: OpenInAppBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    // Only show on iOS devices (Android app not available yet) and if not dismissed
    const detectedPlatform = getMobilePlatform();
    setPlatform(detectedPlatform);
    
    if (detectedPlatform === 'ios' && !isBannerDismissed()) {
      // Small delay to avoid layout shift on load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOpenApp = () => {
    openInApp(deepLink);
  };

  const handleDismiss = () => {
    dismissBanner();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const storeLabel = platform === 'ios' ? "App Store" : "Play Store";

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
      role="banner"
      aria-label="Ouvrir dans l'application"
    >
      <div className="bg-primary/95 backdrop-blur-sm text-primary-foreground px-4 py-3 shadow-lg">
        <div className="container mx-auto flex items-center justify-between gap-3">
          {/* Left: App info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">WineNote</p>
              <p className="text-xs text-primary-foreground/70 truncate">
                Meilleure expérience dans l'app
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleOpenApp}
              size="sm"
              variant="secondary"
              className="font-semibold"
            >
              Ouvrir
            </Button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Fermer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
