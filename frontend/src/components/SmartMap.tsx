import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Vendor } from '@/types';
import { GoogleMapView } from '@/components/GoogleMapView';
import { MapView } from '@/components/MapView';

interface SmartMapProps {
  vendors: Vendor[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

/**
 * Renders StreetSide's map using Google Maps. If the API key is missing,
 * invalid, or the script fails to load (offline, network block, quota,
 * etc.), this falls back to the app's original stylized map instead of
 * showing a broken/blank map or crashing the page.
 */
export function SmartMap({ vendors, selectedId, onSelect }: SmartMapProps) {
  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  if (googleMapsFailed) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2 text-xs text-gold-700">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Google Maps couldn't load{failureReason ? ` (${failureReason})` : ''} — showing the built-in map instead.</span>
        </div>
        <MapView vendors={vendors} selectedId={selectedId} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <GoogleMapView
      vendors={vendors}
      selectedId={selectedId}
      onSelect={onSelect}
      onError={(err) => {
        setFailureReason(err.message);
        setGoogleMapsFailed(true);
      }}
    />
  );
}
