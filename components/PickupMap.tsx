'use client';

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
    __wildwashGoogleMapsReady?: () => void;
  }
}

type PickupMapProps = {
  position: [number, number];
  hasPin: boolean;
  onChange: (position: [number, number]) => void;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window.google?.maps?.Map === "function") return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    window.__wildwashGoogleMapsReady = () => {
      delete window.__wildwashGoogleMapsReady;
      if (typeof window.google?.maps?.Map === "function") {
        resolve();
      } else {
        reject(new Error("Google Maps loaded without the Maps JavaScript API."));
      }
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__wildwashGoogleMapsReady`;
    script.async = true;
    script.dataset.googleMaps = "true";
    script.onerror = () => {
      delete window.__wildwashGoogleMapsReady;
      reject(new Error("Unable to load Google Maps."));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    googleMapsLoadPromise = null;
    throw error;
  });

  return googleMapsLoadPromise;
}

export default function PickupMap({ position, hasPin, onChange }: PickupMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError("Google Maps is not configured.");
      return;
    }

    let cancelled = false;

    const initializeMap = () => {
      if (cancelled || !mapElement.current || typeof window.google?.maps?.Map !== "function") return;
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
      setMapReady(true);
    };

    loadGoogleMaps(GOOGLE_MAPS_API_KEY).then(initializeMap).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load Google Maps.");
    });

    return () => {
      cancelled = true;
      map.current?.setMap?.(null);
      map.current = null;
      marker.current?.setMap(null);
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current || typeof window.google?.maps?.Marker !== "function") return;
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
  }, [position, hasPin, onChange, mapReady]);

  if (loadError) {
    return <div className="flex h-64 w-full items-center justify-center bg-slate-100 p-4 text-center text-sm text-red-600">{loadError}</div>;
  }

  return <div ref={mapElement} className="h-64 w-full bg-slate-100" />;
}
