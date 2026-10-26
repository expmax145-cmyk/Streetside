/**
 * Loads the Google Maps JS API exactly once.
 * Changes from original:
 * - If script tag already exists AND window.google.maps is ready → resolve immediately
 * - 10-second timeout that rejects so SmartMap can show the fallback
 * - Clears loaderPromise on rejection so a retry can be attempted
 */

export interface GMapsLatLngLiteral { lat: number; lng: number; }
export interface GMapsMapOptions {
  center: GMapsLatLngLiteral;
  zoom: number;
  mapId?: string;
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  fullscreenControl?: boolean;
  streetViewControl?: boolean;
  styles?: unknown[];
}
export interface GMapsMapInstance {
  setCenter: (latLng: GMapsLatLngLiteral) => void;
  panTo: (latLng: GMapsLatLngLiteral) => void;
}
export interface GMapsMarkerOptions {
  position: GMapsLatLngLiteral;
  map: GMapsMapInstance;
  title?: string;
  icon?: unknown;
}
export interface GMapsMarkerInstance {
  setMap: (map: GMapsMapInstance | null) => void;
  setIcon: (icon: unknown) => void;
  setTitle: (title: string) => void;
  addListener: (event: string, handler: () => void) => void;
}
export interface GMapsNamespace {
  Map: new (el: HTMLElement, options: GMapsMapOptions) => GMapsMapInstance;
  Marker: new (options: GMapsMarkerOptions) => GMapsMarkerInstance;
  SymbolPath: { CIRCLE: number };
}

declare global {
  interface Window {
    google?: { maps: GMapsNamespace };
    __streetsideGoogleMapsCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

let loaderPromise: Promise<GMapsNamespace> | null = null;
const LOAD_TIMEOUT_MS = 10_000;

export function loadGoogleMaps(): Promise<GMapsNamespace> {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps can only load in the browser'));
      return;
    }

    // If already loaded, resolve immediately without re-injecting script
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      loaderPromise = null;
      reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
      return;
    }

    // 10-second timeout → triggers SmartMap fallback
    const timeoutId = setTimeout(() => {
      loaderPromise = null;
      reject(new Error('Google Maps timed out after 10 s — showing fallback map'));
    }, LOAD_TIMEOUT_MS);

    const done = (success: boolean, err?: Error) => {
      clearTimeout(timeoutId);
      if (success && window.google?.maps) {
        resolve(window.google.maps);
      } else {
        loaderPromise = null;
        reject(err ?? new Error('Google Maps failed to load'));
      }
    };

    const existing = document.getElementById('streetside-google-maps-script');
    if (existing) {
      // Script tag exists but maps not ready — it's still loading
      existing.addEventListener('load', () => done(true));
      existing.addEventListener('error', () => done(false, new Error('Failed to load Google Maps script')));
      return;
    }

    window.gm_authFailure = () => {
      done(false, new Error('Google Maps authentication failed — check the API key'));
    };

    window.__streetsideGoogleMapsCallback = () => done(true);

    const script = document.createElement('script');
    script.id = 'streetside-google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__streetsideGoogleMapsCallback&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => done(false, new Error('Failed to load Google Maps script — check your network connection'));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
