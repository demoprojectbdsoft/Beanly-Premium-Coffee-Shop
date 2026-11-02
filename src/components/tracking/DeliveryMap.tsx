"use client";

import React, { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import type { DeliveryDestination } from "@/types/delivery";
import { vehicleMarker } from "@/lib/rider";

/**
 * The customer's map.
 *
 * Leaflet draws onto OpenStreetMap tiles: no API key, no billing, and no socket
 * — the position arrives from the page's poll, so the whole feature runs on a
 * serverless host. The module itself is imported inside the effect because
 * Leaflet reaches for `window` the moment it loads, which a server render must
 * never do.
 */

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/** A dot with a halo — the rider, when no vehicle is on file. */
const RIDER_DOT = `<span style="position:absolute;left:50%;top:50%;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:9999px;background:#16a34a;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></span>`;

/** The halo every rider marker wears, so a moving dot reads as live. */
const RIDER_HALO = `<span style="position:absolute;inset:0;border-radius:9999px;background:rgba(22,163,74,0.18);border:1px solid rgba(22,163,74,0.45)"></span>`;

/** The marker's HTML: the halo, then the vehicle or a dot inside it. */
function riderIconHtml(vehicleType?: string | null): string {
  const vehicle = vehicleMarker(vehicleType);
  if (!vehicle) {
    return `<div style="position:relative;width:30px;height:30px">${RIDER_HALO}${RIDER_DOT}</div>`;
  }
  const badge = `<span style="position:absolute;left:50%;top:50%;width:23px;height:23px;margin:-11.5px 0 0 -11.5px;border-radius:9999px;background:#fff;border:2px solid #16a34a;box-shadow:0 1px 5px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1">${vehicle.glyph}</span>`;
  return `<div style="position:relative;width:30px;height:30px">${RIDER_HALO}${badge}</div>`;
}

/** A teardrop — the delivery address. */
const DESTINATION_ICON = `<div style="width:18px;height:18px;background:#ef4444;border:2px solid #fff;border-radius:3px 12px 3px 12px;transform:rotate(-45deg);box-shadow:0 1px 6px rgba(0,0,0,0.35)"></div>`;

export interface DeliveryMapPoint {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  /** The rider's newest position, or null before the first ping. */
  rider: DeliveryMapPoint | null;
  /** Where the rider has already been, oldest first. */
  trail: DeliveryMapPoint[];
  destination: DeliveryDestination | null;
  /** The rider's vehicle, so the marker shows what is coming. */
  vehicleType?: string | null;
  /** The address we could not place on the map, so the panel can say so. */
  destinationUnavailable?: boolean;
  height?: number;
}

export default function DeliveryMap({
  rider,
  trail,
  destination,
  vehicleType,
  destinationUnavailable = false,
  height = 340,
}: DeliveryMapProps) {
  const vehicle = vehicleMarker(vehicleType);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const riderRef = useRef<Marker | null>(null);
  const destinationRef = useRef<Marker | null>(null);
  const trailRef = useRef<Polyline | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  /** The marker HTML last drawn, so a vehicle change swaps the icon only once. */
  const riderHtmlRef = useRef("");

  /** Frames everything we know about, once, and again on demand. */
  const frame = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const points: [number, number][] = [];
    if (rider) points.push([rider.lat, rider.lng]);
    if (destination) points.push([destination.lat, destination.lng]);

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [rider, destination]);

  // Create the map once, then hand it back when the screen goes away.
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
      }).setView([23.8103, 90.4125], 12);

      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(created);
      mapRef.current = created;
    })();

    return () => {
      cancelled = true;
      created?.remove();
      mapRef.current = null;
      riderRef.current = null;
      destinationRef.current = null;
      trailRef.current = null;
    };
  }, []);

  // Keep the markers in step with each poll.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Trail first, so both markers always draw above the line.
    const line = trail.map((point) => [point.lat, point.lng] as [number, number]);
    if (rider) line.push([rider.lat, rider.lng]);

    if (line.length < 2) {
      trailRef.current?.remove();
      trailRef.current = null;
    } else if (trailRef.current) {
      trailRef.current.setLatLngs(line);
    } else {
      trailRef.current = L.polyline(line, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.7,
        lineCap: "round",
      }).addTo(map);
    }

    if (rider) {
      const at: [number, number] = [rider.lat, rider.lng];
      const html = riderIconHtml(vehicleType);
      if (riderRef.current) {
        riderRef.current.setLatLng(at);
        if (riderHtmlRef.current !== html) {
          riderRef.current.setIcon(
            L.divIcon({ html, className: "", iconSize: [30, 30], iconAnchor: [15, 15] })
          );
          riderHtmlRef.current = html;
        }
      } else {
        riderRef.current = L.marker(at, {
          icon: L.divIcon({ html, className: "", iconSize: [30, 30], iconAnchor: [15, 15] }),
          title: "Your rider",
        }).addTo(map);
        riderHtmlRef.current = html;
      }
    } else if (riderRef.current) {
      riderRef.current.remove();
      riderRef.current = null;
      riderHtmlRef.current = "";
    }

    if (destination) {
      const at: [number, number] = [destination.lat, destination.lng];
      if (destinationRef.current) {
        destinationRef.current.setLatLng(at);
      } else {
        destinationRef.current = L.marker(at, {
          icon: L.divIcon({
            html: DESTINATION_ICON,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          title: "Delivery address",
        }).addTo(map);
      }
    } else if (destinationRef.current) {
      destinationRef.current.remove();
      destinationRef.current = null;
    }
  }, [rider, trail, destination, vehicleType, height]);

  // The first time a position arrives the map should jump to it, not sit on
  // the city centre; afterwards it only reframes when the reader asks.
  useEffect(() => {
    if (rider || destination) frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(rider), Boolean(destination)]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-alt)]">
        <div ref={containerRef} style={{ height }} className="w-full z-0" />

        <button
          type="button"
          onClick={frame}
          className="absolute top-3 right-3 z-[500] px-2.5 py-1.5 rounded-lg bg-[var(--surface-elevated)]/95 backdrop-blur border border-[var(--border-color)] text-[10px] font-bold text-[var(--foreground)] shadow-xs cursor-pointer hover:bg-[var(--surface-elevated)]"
        >
          Recenter
        </button>

        {!rider && (
          <div className="absolute inset-x-0 bottom-0 z-[500] p-2.5 bg-[var(--surface-elevated)]/95 backdrop-blur border-t border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground-muted)] text-center">
            Waiting for the rider to share their position
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-[var(--foreground-muted)]">
        <span className="inline-flex items-center gap-1.5">
          {vehicle ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-emerald-600 text-[11px] leading-none shadow-xs">
              {vehicle.glyph}
            </span>
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/70 shadow-xs" />
          )}
          Rider, live{vehicle ? ` · ${vehicle.label}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500 border border-white/70 shadow-xs" />
          {destinationUnavailable ? "Address, not placed on the map" : "Delivery address"}
        </span>
        {trail.length > 1 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded-full bg-emerald-500/70" />
            Route so far
          </span>
        )}
      </div>
    </div>
  );
}
