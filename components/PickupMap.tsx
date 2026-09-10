'use client';

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

type PickupMapProps = {
  position: [number, number];
  hasPin: boolean;
  onChange: (position: [number, number]) => void;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function PickupMap({ position, hasPin, onChange }: PickupMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError("Google Maps is not configured.");
      return;
    }

    const initializeMap = () => {
      if (!mapElement.current || !window.google?.maps) return;
      map.current = new window.google.maps.Map(mapElement.current, {
        center: { lat: position[0], lng: position[1] },
        zoom: hasPin ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      map.current.addListener("click", (event: any) => {
        if (event.latLng) onChange([event.latLng.lat(), event.latLng.lng()]);
      });
    };

    if (window.google?.maps) {
      initializeMap();
      return;
    }

    const existingScript = document.querySelector('script[data-google-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeMap);
      return () => existingScript.removeEventListener("load", initializeMap);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = initializeMap;
    script.onerror = () => setLoadError("Unable to load Google Maps.");
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !window.google?.maps) return;
    const location = { lat: position[0], lng: position[1] };
    map.current.setCenter(location);
    if (hasPin) {
      if (!marker.current) {
        marker.current = new window.google.maps.Marker({ map: map.current, position: location, draggable: true });
        marker.current.addListener("dragend", () => {
          const markerPosition = marker.current.getPosition();
          onChange([markerPosition.lat(), markerPosition.lng()]);
        });
      } else {
        marker.current.setPosition(location);
      }
    } else if (marker.current) {
      marker.current.setMap(null);
      marker.current = null;
    }
  }, [position, hasPin, onChange]);

  if (loadError) {
    return <div className="flex h-64 w-full items-center justify-center bg-slate-100 p-4 text-center text-sm text-red-600">{loadError}</div>;
  }

  return <div ref={mapElement} className="h-64 w-full bg-slate-100" />;
}
