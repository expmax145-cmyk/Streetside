import { useEffect, useRef, useState } from 'react';
import { Navigation, Star, Clock } from 'lucide-react';
import type { Vendor } from '@/types';
import { Link } from 'react-router-dom';
import { formatDistance, vendorIsOpenNow } from '@/lib/format';
import { loadGoogleMaps, type GMapsMapInstance, type GMapsMarkerInstance } from '@/lib/googleMapsLoader';

const CITY_CENTER = { lat: 16.5062, lng: 80.648 };

const categoryColors: Record<string, string> = {
  Biryani: '#ea580c',
  Dosa: '#d97706',
  Momos: '#16a34a',
  Chaat: '#dc2626',
  Shawarma: '#57534e',
  Burgers: '#f59e0b',
  Desserts: '#f97316',
  'Tea & Coffee': '#78716c',
};

interface GoogleMapViewProps {
  vendors: Vendor[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onError?: (error: Error) => void;
}

export function GoogleMapView({ vendors, selectedId, onSelect, onError }: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GMapsMapInstance | null>(null);
  const markersRef = useRef<Map<string, GMapsMarkerInstance>>(new Map());
  const [ready, setReady] = useState(false);
  const [finding, setFinding] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const markers = markersRef.current;
    return () => {
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      mapRef.current = null;
    };
  }, []);

  // Load the API and create the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: CITY_CENTER,
          zoom: 13,
          disableDefaultUI: false,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
        });
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) onError?.(err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever the vendor list or map readiness changes.
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const maps = window.google.maps;
    const map = mapRef.current;

    // Clear stale markers (e.g. after a filter change).
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    vendors.forEach((v) => {
      // Use the vendor's food `categories` (e.g. 'Dosa', 'Momos') to pick the
      // marker color, not the generic `cuisine` label ('South Indian', 'Fast
      // Food', etc.) — cuisine almost never matches a categoryColors key, so
      // every marker was silently falling back to the same orange.
      const color = categoryColors[v.categories[0]] || '#f97316';
      const marker = new maps.Marker({
        position: { lat: v.location.lat, lng: v.location.lng },
        map,
        title: v.name,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: v.id === selectedId ? 11 : 8,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => onSelect?.(v.id));
      markersRef.current.set(v.id, marker);
    });

    const markers = markersRef.current;
    return () => {
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, vendors, selectedId]);

  const findNearMe = () => {
    setFinding(true);
    if (!navigator.geolocation) {
      setUserLoc(CITY_CENTER);
      mapRef.current?.panTo(CITY_CENTER);
      setFinding(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLoc(loc);
        mapRef.current?.panTo(loc);
        setFinding(false);
      },
      () => {
        setUserLoc(CITY_CENTER);
        mapRef.current?.panTo(CITY_CENTER);
        setFinding(false);
      },
      { timeout: 8000 },
    );
  };

  const selected = vendors.find((v) => v.id === selectedId);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-charcoal-200 bg-[#edf5e3] shadow-card">
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button
          onClick={findNearMe}
          disabled={finding || !ready}
          className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-charcoal-700 shadow-card hover:bg-charcoal-50 disabled:opacity-60"
        >
          <Navigation size={16} className={finding ? 'animate-spin-slow text-brand-500' : 'text-brand-500'} />
          {finding ? 'Locating...' : 'Find Near Me'}
        </button>
      </div>

      <div className="absolute left-3 top-3 z-20 hidden rounded-xl bg-white/90 p-3 text-xs shadow-card backdrop-blur sm:block">
        <p className="mb-2 font-bold text-charcoal-700">Categories</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {Object.entries(categoryColors).map(([cat, color]) => (
            <span key={cat} className="flex items-center gap-1.5 text-charcoal-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div ref={containerRef} style={{ minHeight: '400px', maxHeight: '70vh', height: '70vh' }} className="w-full" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-charcoal-400">
          Loading map...
        </div>
      )}

      {selected && (
        <Link to={`/vendor/${selected.id}`} className="absolute bottom-3 left-3 right-3 z-20 animate-fade-in-up rounded-2xl border border-charcoal-100 bg-white p-3 shadow-card-hover sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-1/2">
          <div className="flex gap-3"><img src={selected.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h4 className="truncate font-bold text-charcoal-900">{selected.name}</h4><span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-charcoal-700"><Star size={12} fill="currentColor" className="text-gold-500" />{selected.rating.toFixed(1)}</span></div><p className="mb-1 truncate text-xs text-charcoal-500">{selected.cuisine} · {selected.location.area}</p><div className="flex items-center gap-3 text-xs"><span className={vendorIsOpenNow(selected) ? 'text-success-600 font-semibold' : 'text-danger-500 font-semibold'}><Clock size={11} className="inline" /> {vendorIsOpenNow(selected) ? 'Open' : 'Closed'}</span>{selected.distance !== undefined && <span className="text-charcoal-400">{formatDistance(selected.distance)}</span>}</div></div></div>
        </Link>
      )}

      {userLoc && (
        <div className="absolute bottom-3 right-3 z-20 rounded-lg bg-blue-500 px-2.5 py-1 text-xs font-semibold text-white shadow-card">
          You are here
        </div>
      )}
    </div>
  );
}
