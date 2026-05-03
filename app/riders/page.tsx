"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, MapPin, User, Phone, Truck, Star } from "lucide-react";
import Modal from "@/components/ui/Modal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* --- Types --- */
type RawProfile = Record<string, any>;
type RawLocation = Record<string, any>;

type RiderProfile = {
  id: number;
  user?: string | null;
  display_name?: string | null;
  phone?: string | null;
  vehicle_type?: string | null;
  vehicle_reg?: string | null;
  rating?: number | null;
  completed_jobs?: number | null;
  id_document?: string | null;
  license_document?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  raw?: RawProfile;
};

type RiderLocation = {
  id?: number;
  rider?: number | string | null;
  rider_display?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  recorded_at?: string | null;
  raw?: RawLocation;
};

/* --- Component --- */
export default function RidersPage(): React.ReactElement {
  const [profiles, setProfiles] = useState<RiderProfile[]>([]);
  const [locations, setLocations] = useState<RiderLocation[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(true);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [errorProfiles, setErrorProfiles] = useState<string | null>(null);
  const [errorLocations, setErrorLocations] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [profileDetail, setProfileDetail] = useState<RiderProfile | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // new: tabs
  const [tab, setTab] = useState<"profiles" | "map">("profiles");

  // map refs & lazy loading
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const leafletLoadedRef = useRef(false);
  const mapInitializedRef = useRef(false);
  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [mapModalMessage, setMapModalMessage] = React.useState('');

  /* --- Data fetchers --- */
  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setErrorProfiles(null);
    try {
      const res = await fetch(`${API_BASE}/riders/profiles/`, { method: "GET", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Profiles fetch failed: ${res.status} ${res.statusText}`);
      const data = await res.json().catch(() => null);
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setProfiles(
        list.map((p: any) => ({
          id: p.id,
          user: p.user ?? p.username ?? (p.user && p.user.username) ?? null,
          display_name: p.display_name ?? null,
          phone: p.phone ?? null,
          vehicle_type: (p.vehicle_type ?? "").toString().toLowerCase() ?? null,
          vehicle_reg: p.vehicle_reg ?? null,
          rating: p.rating ?? null,
          completed_jobs: p.completed_jobs ?? null,
          id_document: p.id_document ?? null,
          license_document: p.license_document ?? null,
          created_at: p.created_at ?? null,
          updated_at: p.updated_at ?? null,
          raw: p,
        }))
      );
    } catch (err: any) {
      console.error("fetchProfiles error:", err);
      setErrorProfiles(err?.message ?? "Failed to load profiles");
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    setErrorLocations(null);
    try {
      const res = await fetch(`${API_BASE}/riders/`, { method: "GET", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Locations fetch failed: ${res.status} ${res.statusText}`);
      const data = await res.json().catch(() => null);
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      console.debug("Fetched locations count:", list.length, "sample:", list.slice(0, 5));
      setLocations(
        list.map((l: any) => ({
          id: l.id,
          rider: l.rider ?? null,
          rider_display: l.rider_display ?? (l.rider && l.rider.username) ?? null,
          latitude: l.latitude !== undefined ? Number(l.latitude) : (l.lat !== undefined ? Number(l.lat) : null),
          longitude: l.longitude !== undefined ? Number(l.longitude) : (l.lon !== undefined ? Number(l.lon) : null),
          accuracy: l.accuracy ?? null,
          speed: l.speed ?? null,
          recorded_at: l.recorded_at ?? l.created_at ?? null,
          raw: l,
        }))
      );
    } catch (err: any) {
      console.error("fetchLocations error:", err);
      setErrorLocations(err?.message ?? "Failed to load rider locations");
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchLocations();
  }, [fetchProfiles, fetchLocations]);

  const refresh = async () => {
    await Promise.all([fetchProfiles(), fetchLocations()]);
  };

  // lookup latest location by rider ID/string
  const latestLocationByRider = useMemo(() => {
    const m = new Map<string, RiderLocation>();
    for (const loc of locations) {
      const key = String(loc.rider ?? loc.rider_display ?? loc.id ?? Math.random());
      const cur = m.get(key);
      const tsCur = cur ? new Date(cur.recorded_at ?? 0).getTime() : 0;
      const tsNew = new Date(loc.recorded_at ?? 0).getTime();
      if (!cur || tsNew >= tsCur) m.set(key, loc);
    }
    return m;
  }, [locations]);

  const filteredProfiles = profiles.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = (p.display_name ?? p.user ?? "").toLowerCase();
    const phone = (p.phone ?? "").toLowerCase();
    const vehicle = (p.vehicle_type ?? "").toLowerCase();
    return name.includes(q) || phone.includes(q) || vehicle.includes(q);
  });

  async function openProfileDetail(id: number) {
    setSelectedProfileId(id);
    setProfileDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE}/riders/profiles/${encodeURIComponent(id)}/`, { method: "GET", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status} ${res.statusText}`);
      const p = await res.json();
      setProfileDetail({
        id: p.id,
        user: p.user ?? p.username ?? null,
        display_name: p.display_name ?? null,
        phone: p.phone ?? null,
        vehicle_type: (p.vehicle_type ?? "").toString().toLowerCase() ?? null,
        vehicle_reg: p.vehicle_reg ?? null,
        rating: p.rating ?? null,
        completed_jobs: p.completed_jobs ?? null,
        id_document: p.id_document ?? null,
        license_document: p.license_document ?? null,
        created_at: p.created_at ?? null,
        updated_at: p.updated_at ?? null,
        raw: p,
      });
    } catch (err: any) {
      console.error("openProfileDetail error:", err);
      setDetailError(err?.message ?? "Failed to load profile");
    } finally {
      setLoadingDetail(false);
    }
  }

  const [mapModalOpen, setMapModalOpen] = React.useState(false);
  const [mapModalMessage, setMapModalMessage] = React.useState('');

  function openMaps(lat?: number | null, lon?: number | null) {
    if (lat == null || lon == null) {
      setMapModalMessage("No coordinates available for this rider.");
      setMapModalOpen(true);
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* ------------------------- Map init helpers ------------------------- */
  async function injectLeafletCss() {
    // ensure CSS only included once
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.id = "leaflet-css";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    // allow cross-origin so integrity (if present) can be checked without blocking
    link.crossOrigin = "anonymous";
    // NOTE: if you still get SRI/CORS issues, comment out any integrity attribute you may add here
    document.head.appendChild(link);
  }

  // Parse values like "-1.2921,36.8219" or single numbers
  function parseMaybeCombined(value?: any) {
    if (value == null) return null;
    if (typeof value === "number") return value;
    const s = String(value).trim();
    if (s === "") return null;
    if (s.includes(",")) {
      const parts = s.split(",").map((p) => p.trim());
      if (parts.length === 2) {
        const a = Number(parts[0]);
        const b = Number(parts[1]);
        if (isFinite(a) && isFinite(b)) return { a, b };
      }
    }
    const n = Number(s);
    return isFinite(n) ? n : null;
  }

  function normalizeLatLon(latRaw: any, lonRaw: any): { lat: number; lon: number } | null {
    let la: number | null = null;
    let lo: number | null = null;

    const pLat = parseMaybeCombined(latRaw);
    const pLon = parseMaybeCombined(lonRaw);

    if (pLat && typeof pLat === "object" && pLon == null) {
      la = pLat.a;
      lo = pLat.b;
    } else if (pLon && typeof pLon === "object" && pLat == null) {
      la = pLon.a;
      lo = pLon.b;
    } else {
      la = typeof pLat === "number" ? pLat : null;
      lo = typeof pLon === "number" ? pLon : null;
    }

    if (la == null || lo == null) return null;

    // If latitude looks like a longitude (>90) and the other fits latitude, swap
    if (Math.abs(la) > 90 && Math.abs(lo) <= 90) {
      const tmp = la;
      la = lo;
      lo = tmp;
    }

    if (!isFinite(la) || !isFinite(lo)) return null;
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;

    return { lat: la, lon: lo };
  }

  function svgDataUrl(svgString: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }

  function getSvgDataUrlForVehicle(vehicle?: string) {
    const v = (vehicle ?? "").toLowerCase();
    let svg = "";
    if (v.includes("van") || v.includes("truck") || v.includes("car")) {
      svg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><rect x='1' y='6' width='18' height='8' rx='1.2' fill='%23105969'/><rect x='19' y='8' width='3' height='6' rx='0.5' fill='%23005966'/><circle cx='6.5' cy='16' r='1.6' fill='%23000000'/><circle cx='15.5' cy='16' r='1.6' fill='%23000000'/></svg>`;
    } else if (v.includes("motor") || (v.includes("bike") && v.includes("motor"))) {
      svg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><path d='M2 16a3 3 0 006 0' fill='%23105969'/><path d='M16 13l2-2 3 1' stroke='%23000000' stroke-width='1.2' fill='none'/><circle cx='6' cy='17' r='2' fill='%23000000'/><circle cx='18' cy='17' r='2' fill='%23000000'/></svg>`;
    } else if (v.includes("bicycle") || v.includes("bike")) {
      svg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><circle cx='6' cy='17' r='2' fill='%23000000'/><circle cx='18' cy='17' r='2' fill='%23000000'/><path d='M6 17L10 7h3l2 6' stroke='%23105969' stroke-width='1.2' fill='none'/></svg>`;
    } else {
      svg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24'><path d='M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z' fill='%23105969'/><circle cx='12' cy='9' r='2.5' fill='%23fff'/></svg>`;
    }
    return svgDataUrl(svg);
  }

  function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[m];
    });
  }

  function googleMapsLink(lat: number, lon: number) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
  }

  /* ------------------------- Map initialization & markers (Leaflet loaded dynamically) ------------------------- */
  async function ensureMapAndMarkers() {
    try {
      await injectLeafletCss();
      // @ts-ignore - project may not have Leaflet types installed. Install @types/leaflet or add a declaration file (see comments below) to remove this ignore.
      // Recommendation: `npm i -D @types/leaflet` or create `types/leaflet.d.ts` with `declare module 'leaflet';`
      const mod = await import("leaflet");
      const L = (mod as any).default || mod;
      leafletLoadedRef.current = true;

      if (!mapContainerRef.current) return;

      // first time init map
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, { center: [0, 0], zoom: 2, preferCanvas: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        mapInstanceRef.current = map;
        // ensure layout calculation after creation
        setTimeout(() => {
          try {
            map.invalidateSize(true);
          } catch (e) {
            // ignore
          }
        }, 120);
      }

      // clear old markers
      markersRef.current.forEach((m) => {
        try {
          mapInstanceRef.current.removeLayer(m);
        } catch {}
      });
      markersRef.current = [];

      const map = mapInstanceRef.current;
      const bounds: any[] = [];

      // iterate locations (latestLocationByRider) to add markers
      for (const [key, loc] of latestLocationByRider.entries()) {
        const maybe = normalizeLatLon(
          loc.latitude ?? loc.raw?.latitude ?? loc.raw?.lat,
          loc.longitude ?? loc.raw?.longitude ?? loc.raw?.lon
        );
        if (!maybe) {
          console.warn("Skipping invalid coords for rider", key, loc);
          continue;
        }
        const lat = Number(maybe.lat);
        const lon = Number(maybe.lon);

        const vehicleType = (() => {
          const profile = profiles.find((p) => String(p.id) === String(loc.rider) || String(p.user) === String(loc.rider));
          return profile?.vehicle_type ?? loc.raw?.vehicle_type ?? loc.raw?.vehicle ?? null;
        })();

        const iconUrl = getSvgDataUrlForVehicle(vehicleType ?? "");
        const icon = L.icon({ iconUrl, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -30] });

        const marker = L.marker([lat, lon], { icon }).addTo(map);

        const title = loc.rider_display ?? String(loc.rider ?? key ?? "Rider");
        const when = loc.recorded_at ? new Date(loc.recorded_at).toLocaleString() : "unknown";
        const vehicleLabel = (vehicleType ? `${String(vehicleType)}` : "unknown vehicle").replace(/^[a-z]/, (c) => c.toUpperCase());

        const popupHtml = `
          <div style="font-size:13px">
            <div style="font-weight:600">${escapeHtml(title)}</div>
            <div style="font-size:12px;color:#444">${escapeHtml(vehicleLabel)}</div>
            <div style="font-size:12px;color:#666;margin-top:6px">Last seen: ${escapeHtml(when)}</div>
            <div style="margin-top:8px"><a target="_blank" rel="noreferrer" href="${googleMapsLink(lat, lon)}">Open in Maps</a></div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        markersRef.current.push(marker);
        bounds.push([lat, lon]);
      }

      if (bounds.length) {
        try {
          // Make sure map knows its container size (important if container was hidden)
          try {
            map.invalidateSize(true);
          } catch (e) {
            // ignore
          }
          map.fitBounds(bounds as any, { padding: [60, 60], maxZoom: 16 });
        } catch (err) {
          console.warn("fitBounds failed, falling back to setView", err);
          const first = bounds[0];
          map.setView(first as any, 12);
        }
      } else {
        // no markers -> reset to world view
        try {
          map.setView([0, 0], 2);
        } catch {}
      }
    } catch (err) {
      console.error("ensureMapAndMarkers error:", err);
    }
  }

  // When switching to map tab, or when locations/profiles update while on map tab, (re)init markers
  // OPTIMIZED: Only initialize map once, then just update markers
  useEffect(() => {
    if (tab !== "map") return;
    // small delay to allow container to be in DOM and have size
    const t = setTimeout(() => {
      // Only initialize map on first visit to map tab
      if (!mapInitializedRef.current) {
        mapInitializedRef.current = true;
      }
      ensureMapAndMarkers();
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, locations, profiles]);

  /* ------------------------- UI render ------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Riders</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">View rider profiles, last-known locations, and a live map categorized by vehicle type.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-white/80 dark:bg-white/5 px-1 py-1 border dark:border-slate-700">
              <button onClick={() => setTab("profiles")} className={`px-3 py-1 text-sm ${tab === "profiles" ? "font-semibold bg-red-600 text-white rounded" : ""}`}>List</button>
              <button onClick={() => setTab("map")} className={`ml-1 px-3 py-1 text-sm ${tab === "map" ? "font-semibold bg-red-600 text-white rounded" : ""}`}>Map</button>
            </div>
            <button onClick={refresh} className="inline-flex items-center gap-2 rounded-full border dark:border-slate-700 px-3 py-2 bg-white/80 dark:bg-white/5 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Profiles list & search */}
          <section className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold">Profiles</h2>
              </div>
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or vehicle" className="rounded-md border dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600" />
              </div>
            </div>

            {loadingProfiles ? (
              <div className="py-8 text-center">Loading profiles…</div>
            ) : errorProfiles ? (
              <div className="py-4 text-red-600">Error: {errorProfiles}</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-6 text-center text-slate-500">No riders found.</div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((p) => {
                  const key = String(p.id);
                  const latest = latestLocationByRider.get(key) ?? latestLocationByRider.get(String(p.user)) ?? undefined;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5">
                      <div>
                        <div className="font-semibold">{p.display_name ?? p.user ?? `Rider ${p.id}`}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{p.vehicle_type ? `${capitalize(p.vehicle_type)}${p.vehicle_reg ? ` • ${p.vehicle_reg}` : ""}` : "No vehicle info"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {latest && latest.latitude && latest.longitude && (
                          <button onClick={() => openMaps(Number(latest.latitude), Number(latest.longitude))} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Locate</button>
                        )}
                        <button onClick={() => openProfileDetail(p.id)} className="text-xs px-2 py-1 rounded bg-slate-100">View</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right: depending on tab show locations or map + details */}
          <aside className="rounded-2xl bg-white/80 dark:bg-white/5 p-4 shadow space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">Latest Locations</h3>
              </div>
              <div className="text-xs text-slate-500">{locations.length} points</div>
            </div>

            {tab === "profiles" ? (
              <>
                {loadingLocations ? (
                  <div className="py-6 text-center">Loading locations…</div>
                ) : errorLocations ? (
                  <div className="text-red-600">Error: {errorLocations}</div>
                ) : locations.length === 0 ? (
                  <div className="text-sm text-slate-500">No locations available.</div>
                ) : (
                  <div className="grid gap-2 max-h-72 overflow-auto">
                    {locations.map((l) => (
                      <div key={l.id ?? `${l.rider}-${l.recorded_at}`} className="flex items-start justify-between gap-3 p-2 rounded border border-slate-100">
                        <div>
                          <div className="text-sm font-medium">{l.rider_display ?? l.rider ?? `R${l.id}`}</div>
                          <div className="text-xs text-slate-500">{formatDateTime(l.recorded_at)} • {l.accuracy ? `${l.accuracy}m` : "—"} • {l.speed ? `${l.speed} m/s` : "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-600">{l.latitude ?? "—"}, {l.longitude ?? "—"}</div>
                          <div className="mt-1 flex gap-2 justify-end">
                            <button onClick={() => openMaps(Number(l.latitude), Number(l.longitude))} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Map</button>
                            <button onClick={() => { if (l.rider && typeof l.rider === "number") openProfileDetail(Number(l.rider)); else { setMapModalMessage("Open profile not available for this point."); setMapModalOpen(true); } }} className="text-xs px-2 py-1 rounded bg-slate-100">Profile</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Map tab content
              <div className="space-y-3">
                <div className="text-sm text-slate-500">Map view: markers coloured by vehicle. Click a marker for details.</div>
                <div ref={mapContainerRef} style={{ height: 420, width: "100%" }} className="rounded" />
                <div className="text-xs text-slate-500 pt-2">Legend: <span className="inline-block px-2">Van</span> <span className="inline-block px-2">Motorbike</span> <span className="inline-block px-2">Bicycle</span> <span className="inline-block px-2">Pin</span></div>
              </div>
            )}

            {/* Profile detail panel (shared) */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold">Profile details</h4>
              {!selectedProfileId ? (
                <div className="text-sm text-slate-500">Select a profile to see details</div>
              ) : loadingDetail ? (
                <div className="text-sm">Loading profile…</div>
              ) : detailError ? (
                <div className="text-sm text-red-600">Error: {detailError}</div>
              ) : profileDetail ? (
                <div className="mt-3 text-sm space-y-2">
                  <div className="font-medium">{profileDetail.display_name ?? profileDetail.user}</div>
                  <div className="text-xs text-slate-600"><Phone className="inline-block w-3 h-3 mr-1 align-text-bottom"/> {profileDetail.phone ?? "—"}</div>
                  <div className="text-xs text-slate-600"><Truck className="inline-block w-3 h-3 mr-1 align-text-bottom"/> {profileDetail.vehicle_type ? capitalize(profileDetail.vehicle_type) : "—"} {profileDetail.vehicle_reg ? ` • ${profileDetail.vehicle_reg}` : ""}</div>
                  <div className="text-xs text-slate-600 flex items-center gap-2"><Star className="w-3 h-3"/> {profileDetail.rating ?? "—"} • Jobs: {profileDetail.completed_jobs ?? "—"}</div>
                  <div className="mt-2 flex gap-2">
                    {profileDetail.id_document && <a className="text-xs px-2 py-1 rounded bg-slate-100" href={profileDetail.id_document} target="_blank" rel="noreferrer">ID doc</a>}
                    {profileDetail.license_document && <a className="text-xs px-2 py-1 rounded bg-slate-100" href={profileDetail.license_document} target="_blank" rel="noreferrer">License</a>}
                    <button onClick={() => { setSelectedProfileId(null); setProfileDetail(null); }} className="text-xs px-2 py-1 rounded bg-rose-50">Close</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No profile loaded.</div>
              )}
            </div>

          </aside>
        </div>
      </div>
      
      <Modal
        isOpen={mapModalOpen}
        title="Error"
        message={mapModalMessage}
        type="error"
        onClose={() => setMapModalOpen(false)}
      />
    </div>
  );
}

/* --- helpers --- */
function formatDateTime(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

function capitalize(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
