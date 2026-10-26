import { useState, useRef, useMemo, type MouseEvent } from 'react';
import { Navigation, Star, Clock } from 'lucide-react';
import type { Vendor } from '@/types';
import { formatDistance, vendorIsOpenNow } from '@/lib/format';
import { Link } from 'react-router-dom';

// Map bounds for our demo area (Vijayawada region)
const BOUNDS = { minLat: 16.43, maxLat: 16.57, minLng: 80.55, maxLng: 80.72 };
const MAP_W = 800;
const MAP_H = 600;

function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

// Inverse of project() — turns an SVG click position back into a real
// lat/lng within the demo area's bounds. Used by the vendor-registration
// location picker (see VendorRegisterPage) so a new vendor gets an
// actual, distinct coordinate instead of every registration silently
// reusing one hardcoded "city center" point.
function unproject(x: number, y: number): { lat: number; lng: number } {
  const lng = BOUNDS.minLng + (x / MAP_W) * (BOUNDS.maxLng - BOUNDS.minLng);
  const lat = BOUNDS.maxLat - (y / MAP_H) * (BOUNDS.maxLat - BOUNDS.minLat);
  return { lat, lng };
}

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

interface MapViewProps {
  vendors: Vendor[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Location-picker mode (used by vendor registration): clicking the map calls onPick with real lat/lng instead of selecting a vendor marker. */
  pickable?: boolean;
  pickedLocation?: { lat: number; lng: number } | null;
  onPick?: (location: { lat: number; lng: number }) => void;
}

export function MapView({ vendors, selectedId, onSelect, pickable, pickedLocation, onPick }: MapViewProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ x: number; y: number } | null>(null);
  const [finding, setFinding] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const pickedPoint = pickedLocation ? project(pickedLocation.lat, pickedLocation.lng) : null;

  const handleMapClick = (e: MouseEvent<SVGSVGElement>) => {
    if (pickable && onPick && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * MAP_W;
      const y = ((e.clientY - rect.top) / rect.height) * MAP_H;
      onPick(unproject(x, y));
      return;
    }
    onSelect?.('');
  };

  const markers = useMemo(() => vendors.map((v) => ({ ...v, ...project(v.location.lat, v.location.lng) })), [vendors]);

  const findNearMe = () => {
    setFinding(true);
    if (!navigator.geolocation) {
      // No geolocation support — fall back to the city center rather than
      // silently pretending we found the user.
      const center = project(16.5062, 80.648);
      setUserLoc(center);
      setFinding(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Clamp to the demo map's bounds so an out-of-area location doesn't
        // place the marker off-canvas.
        const clampedLat = Math.min(Math.max(latitude, BOUNDS.minLat), BOUNDS.maxLat);
        const clampedLng = Math.min(Math.max(longitude, BOUNDS.minLng), BOUNDS.maxLng);
        setUserLoc(project(clampedLat, clampedLng));
        setFinding(false);
      },
      () => {
        // Permission denied or unavailable — fall back to city center.
        const center = project(16.5062, 80.648);
        setUserLoc(center);
        setFinding(false);
      },
      { timeout: 8000 },
    );
  };

  const selected = vendors.find((v) => v.id === selectedId || v.id === hovered);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-charcoal-200 bg-[#edf5e3] shadow-card">
      {/* Map controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button
          onClick={findNearMe}
          disabled={finding}
          className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-charcoal-700 shadow-card hover:bg-charcoal-50 disabled:opacity-60"
        >
          <Navigation size={16} className={finding ? 'animate-spin-slow text-brand-500' : 'text-brand-500'} />
          {finding ? 'Locating...' : 'Find Near Me'}
        </button>
      </div>

      {/* Legend */}
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="h-full w-full"
        style={{ minHeight: '400px', maxHeight: '70vh', cursor: pickable ? 'crosshair' : undefined }}
        onClick={handleMapClick}
      >
        {/* Stylized map background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4dccb" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="landGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#f0f7e8" />
            <stop offset="100%" stopColor="#e3eed8" />
          </radialGradient>
        </defs>

        <rect width={MAP_W} height={MAP_H} fill="url(#landGlow)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />

        {/* Stylized river (Krishna River) */}
        <path
          d="M 0 280 Q 200 240, 350 300 T 800 320 L 800 360 Q 600 340, 350 360 T 0 340 Z"
          fill="#b8d4e8"
          opacity="0.6"
        />
        <path
          d="M 0 280 Q 200 240, 350 300 T 800 320"
          fill="none"
          stroke="#9bc2db"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Stylized roads */}
        <g stroke="#d6d3d1" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M 0 200 L 800 180" />
          <path d="M 0 400 L 800 420" />
          <path d="M 200 0 L 220 600" />
          <path d="M 500 0 L 520 600" />
          <path d="M 0 100 L 800 500" />
        </g>
        <g stroke="#e7e5e4" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
          <path d="M 100 50 L 100 600" />
          <path d="M 350 0 L 350 600" />
          <path d="M 650 0 L 650 600" />
          <path d="M 0 300 L 800 300" />
          <path d="M 0 500 L 800 500" />
        </g>

        {/* Area labels */}
        <g fill="#78716c" fontSize="13" fontWeight="600" opacity="0.6">
          <text x="150" y="160">Governorpet</text>
          <text x="450" y="150">Labbipet</text>
          <text x="600" y="280">Auto Nagar</text>
          <text x="100" y="450">One Town</text>
          <text x="550" y="480">Gollapudi</text>
        </g>

        {/* User location */}
        {userLoc && (
          <g>
            <circle cx={userLoc.x} cy={userLoc.y} r="24" fill="#3b82f6" opacity="0.15" className="animate-ping" />
            <circle cx={userLoc.x} cy={userLoc.y} r="8" fill="#3b82f6" stroke="#fff" strokeWidth="3" />
          </g>
        )}

        {/* Picked location (vendor registration) */}
        {pickedPoint && (
          <g transform={`translate(${pickedPoint.x}, ${pickedPoint.y})`}>
            <circle r="26" fill="#16a34a" opacity="0.18" className="animate-ping" />
            <path d="M0 -24 C -13 -24, -13 -9, 0 0 C 13 -9, 13 -24, 0 -24 Z" fill="#16a34a" stroke="#fff" strokeWidth="2" />
            <circle cx="0" cy="-16" r="5" fill="#fff" />
          </g>
        )}

        {/* Vendor markers */}
        {markers.map((m) => {
          const isSelected = m.id === selectedId;
          const isHovered = m.id === hovered;
          // Use the vendor's food `categories` (e.g. 'Dosa', 'Momos') to pick
          // the pin color, not the generic `cuisine` label ('South Indian',
          // 'Fast Food', etc.) — cuisine almost never matches a key in
          // categoryColors, so every pin was silently falling back to orange.
          const color = categoryColors[m.categories[0]] || '#f97316';
          return (
            <g
              key={m.id}
              transform={`translate(${m.x}, ${m.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); onSelect?.(m.id); }}
            >
              {(isSelected || isHovered) && (
                <circle r="28" fill={color} opacity="0.15" className="animate-ping" />
              )}
              <path
                d="M0 -22 C -12 -22, -12 -8, 0 0 C 12 -8, 12 -22, 0 -22 Z"
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                transform={isSelected || isHovered ? 'scale(1.25)' : 'scale(1)'}
                style={{ transition: 'transform 0.2s ease', transformBox: 'fill-box', transformOrigin: 'center' }}
              />
              <circle cx="0" cy="-15" r="5" fill="#fff" />
              {!vendorIsOpenNow(m) && (
                <circle cx="0" cy="-15" r="3" fill="#9ca3af" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Preview card */}
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
