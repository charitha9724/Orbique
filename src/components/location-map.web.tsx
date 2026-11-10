import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { BRAND_COLOR } from '@/components/form';

import type { LocationMapProps } from './location-map';

// The interactive map (web). The pin stays in the middle; people move the map under it.
export default function LocationMap({ center, onMoveEnd }: LocationMapProps) {
  return (
    <div style={{ position: 'relative', height: 320, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FollowCenter lat={center.lat} lng={center.lng} />
        <ReportMoves onMoveEnd={onMoveEnd} />
      </MapContainer>
      <CenterPin />
    </div>
  );
}

// When the chosen spot changes from outside (search, "use my location"), move the map there.
function FollowCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    const current = map.getCenter();
    if (Math.abs(current.lat - lat) > 1e-6 || Math.abs(current.lng - lng) > 1e-6) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);
  return null;
}

function ReportMoves({ onMoveEnd }: { onMoveEnd: LocationMapProps['onMoveEnd'] }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMoveEnd({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

function CenterPin() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}>
      <svg width="36" height="48" viewBox="0 0 24 32">
        <path
          d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z"
          fill={BRAND_COLOR}
          stroke="#fff"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="11.5" r="4.5" fill="#fff" />
      </svg>
    </div>
  );
}
