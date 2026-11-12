'use client';

import { useEffect, useRef } from 'react';
import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

type PickupMapProps = {
  position: [number, number];
  hasPin: boolean;
  onChange: (position: [number, number]) => void;
};

const pickupIcon = divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border:3px solid white;border-radius:50%;background:#dc2626;box-shadow:0 1px 5px #0008"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onChange }: { onChange: PickupMapProps['onChange'] }) {
  useMapEvents({
    click: ({ latlng }) => onChange([latlng.lat, latlng.lng]),
  });
  return null;
}

function CenterOnPosition({ position, hasPin }: Pick<PickupMapProps, 'position' | 'hasPin'>) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, hasPin ? 16 : map.getZoom());
  }, [map, position, hasPin]);

  return null;
}

export default function PickupMap({ position, hasPin, onChange }: PickupMapProps) {
  const marker = useRef<LeafletMarker | null>(null);

  return (
    <div role="application" aria-label="Pickup location map">
      <MapContainer center={position} zoom={hasPin ? 16 : 12} scrollWheelZoom style={{ height: 256, width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <CenterOnPosition position={position} hasPin={hasPin} />
        {hasPin ? (
          <Marker
            ref={marker}
            position={position}
            icon={pickupIcon}
            draggable
            eventHandlers={{
              dragend: () => {
                const nextPosition = marker.current?.getLatLng();
                if (nextPosition) onChange([nextPosition.lat, nextPosition.lng]);
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
