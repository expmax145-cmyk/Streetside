import { useState, useEffect, useCallback } from 'react';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface UseUserLocationResult {
  location: UserLocation | null;
  status: LocationStatus;
  requestLocation: () => void;
}

/**
 * Permission-aware geolocation hook.
 * - Never silently falls back to a fake city-center position
 * - Exposes locationStatus so callers can hide distance UI when denied
 * - On denial or failure, location stays null (no fake "you are here")
 */
export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_geolocationErr) => {
        // Do NOT fall back to city center — set null and denied status
        setLocation(null);
        setStatus('denied');
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    // Auto-request on mount if permission was previously granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        }
      }).catch(() => {
        // permissions API unavailable — wait for explicit request
      });
    }
  }, [requestLocation]);

  return { location, status, requestLocation };
}
