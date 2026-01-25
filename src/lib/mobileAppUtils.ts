/**
 * Mobile platform detection and deep link utilities for WineNote app
 */

export type MobilePlatform = 'ios' | 'android' | null;

/**
 * Detect the mobile platform from user agent
 */
export function getMobilePlatform(): MobilePlatform {
  if (typeof navigator === 'undefined') return null;
  
  const userAgent = navigator.userAgent || navigator.vendor || '';
  
  // iOS detection (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  
  // Android detection
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  return null;
}

/**
 * Check if the current device is a mobile device (iOS or Android)
 */
export function isMobileDevice(): boolean {
  return getMobilePlatform() !== null;
}

// App Store URLs
export const APP_STORE_URL = 'https://apps.apple.com/fr/app/wine-note-meet-share-learn/id6757152544';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.winenote.android';

/**
 * Get the appropriate store URL for the current platform
 */
export function getStoreUrl(): string | null {
  const platform = getMobilePlatform();
  if (platform === 'ios') return APP_STORE_URL;
  if (platform === 'android') return PLAY_STORE_URL;
  return null;
}

// Deep link generators
export function getEventDeepLink(slug: string, token?: string | null): string {
  if (token) {
    return `winenote://event/${slug}?token=${encodeURIComponent(token)}`;
  }
  return `winenote://event/${slug}`;
}

export function getCellarDeepLink(slug: string): string {
  return `winenote://cellar/${slug}`;
}

export function getProfileDeepLink(slug: string): string {
  return `winenote://user/${slug}`;
}

/**
 * Get deep link for payment success redirect
 * Includes payment=success parameter for app to refresh event data
 */
export function getPaymentSuccessDeepLink(slug: string): string {
  return `winenote://event/${slug}?payment=success`;
}

/**
 * Attempt to open the app via deep link, with fallback to store
 * @param deepLink The deep link URL to open
 * @param fallbackDelay Delay before redirecting to store (ms)
 */
export function openInApp(deepLink: string, fallbackDelay: number = 2000): void {
  const platform = getMobilePlatform();
  const storeUrl = getStoreUrl();
  
  // Try to open the deep link
  window.location.href = deepLink;
  
  // If app is not installed, redirect to store after delay
  if (storeUrl) {
    setTimeout(() => {
      // Check if we're still on the page (app didn't open)
      if (document.visibilityState !== 'hidden') {
        window.location.href = storeUrl;
      }
    }, fallbackDelay);
  }
}

// Session storage key for dismissed banners
const DISMISSED_BANNER_KEY = 'winenote_app_banner_dismissed';

/**
 * Check if the user has dismissed the app banner in this session
 */
export function isBannerDismissed(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(DISMISSED_BANNER_KEY) === 'true';
}

/**
 * Mark the app banner as dismissed for this session
 */
export function dismissBanner(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(DISMISSED_BANNER_KEY, 'true');
}
