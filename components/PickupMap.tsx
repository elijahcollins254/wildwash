'use client';

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type PickupMapProps = {
  position: [number, number];
  hasPin: boolean;
  onChange: (position: [number, number]) => void;
};

function PickupPin({ position, onChange }: { position: [number, number]; onChange: (position: [number, number]) => void }) {
  return <Marker position={position} draggable eventHandlers={{ dragend: (event) => {
    const marker = event.target as L.Marker;
    const location = marker.getLatLng();
    onChange([location.lat, location.lng]);
  }}} />;
}

function PickupMapClickHandler({ onChange }: { onChange: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position);
  }, [map, position]);
  return null;
}

export default function PickupMap({ position, hasPin, onChange }: PickupMapProps) {
  return (
    <MapContainer
      center={position}
      zoom={hasPin ? 16 : 12}
      scrollWheelZoom
      className="h-64 w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PickupMapClickHandler onChange={onChange} />
      {hasPin && <PickupPin position={position} onChange={onChange} />}
      <RecenterMap position={position} />
    </MapContainer>
  );
}