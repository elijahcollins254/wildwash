'use client';

import { useEffect, useRef, useState } from 'react';

type Coordinate = { lat: number; lng: number };
type GoogleLatLng = { lat: () => number; lng: () => number };
type MapsEventListener = { remove: () => void };
type GoogleMarker = {
  addListener: (event: 'dragend', callback: () => void) => MapsEventListener;
  getPosition: () => GoogleLatLng | null;
  setMap: (map: GoogleMap | null) => void;
  setPosition: (position: Coordinate) => void;
};
type GoogleMap = {
  addListener: (event: 'click', callback: (event: { latLng: GoogleLatLng | null }) => void) => MapsEventListener;
  setCenter: (position: Coordinate) => void;
  setZoom: (zoom: number) => void;
};
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: {
    center: Coordinate;
    zoom: number;
    mapTypeControl: boolean;
    streetViewControl: boolean;
    fullscreenControl: boolean;
  }) => GoogleMap;
  Marker: new (options: { map: GoogleMap; position: Coordinate; draggable: boolean; title: string }) => GoogleMarker;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
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

function loadGoogleMaps(): Promise<void> {
  if (typeof window.google?.maps?.Map === 'function') return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    window.__wildwashGoogleMapsReady = () => {
      delete window.__wildwashGoogleMapsReady;
      if (typeof window.google?.maps?.Map === 'function') resolve();
      else reject(new Error('Google Maps loaded without the Maps JavaScript API.'));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY || '')}&loading=async&callback=__wildwashGoogleMapsReady`;
    script.async = true;
    script.onerror = () => {
      delete window.__wildwashGoogleMapsReady;
      reject(new Error('Unable to load Google Maps. Check the API key and Maps JavaScript API settings.'));
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
  const map = useRef<GoogleMap | null>(null);
  const marker = useRef<GoogleMarker | null>(null);
  const markerListener = useRef<MapsEventListener | null>(null);
  const onChangeRef = useRef(onChange);
  const positionRef = useRef(position);
  const hasPinRef = useRef(hasPin);
  const [mapReady, setMapReady] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [loadError, setLoadError] = useState(
    GOOGLE_MAPS_API_KEY ? '' : 'Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.',
  );

  useEffect(() => {
    onChangeRef.current = onChange;
    positionRef.current = position;
    hasPinRef.current = hasPin;
  }, [onChange, position, hasPin]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let active = true;
    let clickListener: MapsEventListener | undefined;

    loadGoogleMaps().then(() => {
      if (!active || !mapElement.current || !window.google?.maps) return;
      map.current = new window.google.maps.Map(mapElement.current, {
        center: { lat: positionRef.current[0], lng: positionRef.current[1] },
        zoom: hasPinRef.current ? 16 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      clickListener = map.current.addListener('click', (event) => {
        if (event.latLng) onChangeRef.current([event.latLng.lat(), event.latLng.lng()]);
      });
      setMapReady(true);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load Google Maps.');
    });

    return () => {
      active = false;
      clickListener?.remove();
      markerListener.current?.remove();
      markerListener.current = null;
      marker.current?.setMap(null);
      marker.current = null;
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current || !window.google?.maps?.Marker) return;
    const location = { lat: position[0], lng: position[1] };
    map.current.setCenter(location);
    map.current.setZoom(hasPin ? 16 : 12);

    if (!hasPin) {
      markerListener.current?.remove();
      markerListener.current = null;
      marker.current?.setMap(null);
      marker.current = null;
      return;
    }

    if (!marker.current) {
      marker.current = new window.google.maps.Marker({
        map: map.current,
        position: location,
        draggable: true,
        title: 'Pickup location',
      });
      markerListener.current = marker.current.addListener('dragend', () => {
        const markerPosition = marker.current?.getPosition();
        if (markerPosition) onChangeRef.current([markerPosition.lat(), markerPosition.lng()]);
      });
    } else {
      marker.current.setPosition(location);
    }
  }, [position, hasPin, mapReady]);

  const useCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location services are not available in this browser.');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange([coords.latitude, coords.longitude]);
        setLoadingLocation(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser settings and try again.'
          : error.code === error.TIMEOUT
            ? 'Finding your location timed out. Please try again or tap the map to set the pin.'
            : 'Unable to access your location. You can tap the map to set the pin.';
        setLocationError(message);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loadingLocation}
          className="text-xs font-medium text-red-600 hover:text-red-500 disabled:cursor-wait disabled:opacity-60"
        >
          {loadingLocation ? 'Finding your location…' : 'Use my location'}
        </button>
        {hasPin ? (
          <span className="text-xs text-slate-500">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        ) : null}
      </div>
      {locationError ? <p role="alert" className="mb-2 text-xs text-red-600">{locationError}</p> : null}
      {loadError ? (
        <div className="flex h-64 w-full items-center justify-center bg-slate-100 p-4 text-center text-sm text-red-600">
          {loadError}
        </div>
      ) : (
        <div ref={mapElement} className="h-64 w-full bg-slate-100" role="application" aria-label="Pickup location map" />
      )}
    </div>
  );
}
