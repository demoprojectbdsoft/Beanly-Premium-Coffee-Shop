"use client";

import React, { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

/**
 * The store-locator map.
 *
 * Same free stack as the order-tracking map — Leaflet on OpenStreetMap tiles,
 * no API key and no socket — drawing a pin for every place the page has
 * coordinates for. The branch is always shown; a seller shop appears once the
 * shopper opens its card and the server action returns a point. Selecting a
 * place flies the map to its pin so the list and the map never disagree about
 * which one is active.
 *
 * Leaflet is imported inside the effect because it reaches for `window` the
 * moment it loads, which a server render must never do.
 */

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/** A pin. The active place is the brand colour, the rest are muted. */
function pinIcon(active: boolean): string {
  const bg = active ? "#0284c7" : "#94a3b8";
  return `<div style="position:relative;width:26px;height:26px">
  <span style="position:absolute;left:50%;top:0;width:18px;height:18px;margin-left:-9px;background:${bg};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 6px rgba(0,0,0,0.35)"></span>
</div>`;
}

/** A blue dot — "you are here" when the shopper shared their location. */
const YOU_ICON = `<div style="position:relative;width:24px;height:24px">
  <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,0.18);border:1px solid rgba(37,99,235,0.45)"></span>
  <span style="position:absolute;left:50%;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></span>
</div>`;

export interface LocatorMapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  active?: boolean;
}

interface LocatorMapProps {
  points: LocatorMapPoint[];
  /** The shopper's own position, when they asked for "near me". */
  myLocation?: { lat: number; lng: number } | null;
  height?: number;
}

export default function LocatorMap({
  points,
  myLocation = null,
  height = 288,
}: LocatorMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const youRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  /** Frames every pin, plus the shopper when they are on the map. */
  const frame = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const all: [number, number][] = points.map((p) => [p.lat, p.lng]);
    if (myLocation) all.push([myLocation.lat, myLocation.lng]);
    if (all.length === 0) return;
    if (all.length === 1) {
      map.setView(all[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 16 });
  }, [points, myLocation]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let created: LeafletMap | null = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      created = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([23.8103, 90.4125], 11);

      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(created);
      mapRef.current = created;
    })();

    return () => {
      cancelled = true;
      // created.remove() disposes the map and every layer on it, so the marker
      // objects are gone too — the JS refs are left for garbage collection.
      created?.remove();
      mapRef.current = null;
      youRef.current = null;
    };
  }, []);

  // Keep the pins in step with the list.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const seen = new Set<string>();
    for (const point of points) {
      seen.add(point.id);
      const at: [number, number] = [point.lat, point.lng];
      const existing = markersRef.current.get(point.id);
      if (existing) {
        existing.setLatLng(at);
        existing.setIcon(
          L.divIcon({
            html: pinIcon(Boolean(point.active)),
            className: "",
            iconSize: [26, 26],
            iconAnchor: [13, 24],
          })
        );
      } else {
        const marker = L.marker(at, {
          icon: L.divIcon({
            html: pinIcon(Boolean(point.active)),
            className: "",
            iconSize: [26, 26],
            iconAnchor: [13, 24],
          }),
          title: point.label,
        }).addTo(map);
        markersRef.current.set(point.id, marker);
      }
    }

    // Drop pins that are no longer in the list.
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // The shopper's own dot.
    if (myLocation) {
      const at: [number, number] = [myLocation.lat, myLocation.lng];
      if (youRef.current) {
        youRef.current.setLatLng(at);
      } else {
        youRef.current = L.marker(at, {
          icon: L.divIcon({
            html: YOU_ICON,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          title: "You are here",
          zIndexOffset: 1000,
        }).addTo(map);
      }
    } else if (youRef.current) {
      youRef.current.remove();
      youRef.current = null;
    }
  }, [points, myLocation]);

  // Reframe when the set of pins or the active pin changes.
  useEffect(() => {
    frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, myLocation]);

  // Pan to the active pin when the shopper picks a place, without reframing
  // the whole bounds (which would jump around as more shops load in).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const active = points.find((p) => p.active);
    if (active) map.panTo([active.lat, active.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.find((p) => p.active)?.id]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-alt)]">
      <div ref={containerRef} style={{ height }} className="w-full z-0" />

      <button
        type="button"
        onClick={frame}
        className="absolute top-3 right-3 z-[500] px-2.5 py-1.5 rounded-lg bg-[var(--surface-elevated)]/95 backdrop-blur border border-[var(--border-color)] text-[10px] font-bold text-[var(--foreground)] shadow-xs cursor-pointer hover:bg-[var(--surface-elevated)]"
      >
        Recenter
      </button>

      {points.length === 0 && !myLocation && (
        <div className="absolute inset-x-0 bottom-0 z-[500] p-2.5 bg-[var(--surface-elevated)]/95 backdrop-blur border-t border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground-muted)] text-center">
          Open a place to see it on the map
        </div>
      )}
    </div>
  );
}
