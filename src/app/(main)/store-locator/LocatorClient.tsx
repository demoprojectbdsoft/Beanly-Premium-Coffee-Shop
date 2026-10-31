"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Star,
  Store,
} from "lucide-react";

/**
 * The two sources the server page hands down, in one shape: the platform's own
 * branch (Settings, geocoded) and every shop trading today. A shop row never
 * carries the seller's phone or street address — the public API does not send
 * them — so a card for a seller links to its storefront instead.
 */
export interface LocatorPlace {
  id: string;
  kind: "branch" | "shop";
  name: string;
  address: string;
  city: string;
  area: string;
  /** Branch only: straight from Settings. */
  phone?: string;
  /** Branch only: the hours the store team publishes. */
  hours?: string;
  /** Shop only: the storefront slug, when the shop has one. */
  slug?: string;
  category?: string;
  rating?: number;
  productCount?: number;
  lat: number | null;
  lng: number | null;
}

interface LocatorClientProps {
  branch: LocatorPlace;
  shops: LocatorPlace[];
  siteName: string;
}

/** Straight-line distance, in km. Good enough for "near me", not for routing. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** A place the browser can put on the map, once the reader shares their own. */
function coordsOf(place: LocatorPlace): { lat: number; lng: number } | null {
  return place.lat !== null && place.lng !== null ? { lat: place.lat, lng: place.lng } : null;
}

export default function LocatorClient({ branch, shops, siteName }: LocatorClientProps) {
  const [places] = useState<LocatorPlace[]>([branch, ...shops]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(branch.id);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? places.filter(
          (place) =>
            place.name.toLowerCase().includes(q) ||
            place.city.toLowerCase().includes(q) ||
            place.area.toLowerCase().includes(q) ||
            place.address.toLowerCase().includes(q)
        )
      : places;

    if (!myLocation) return list;
    // Nearest first; a place without coordinates cannot be placed, so it goes
    // last rather than disappearing from a page that is about finding places.
    return [...list].sort((a, b) => {
      const da = coordsOf(a);
      const db = coordsOf(b);
      return (
        (da ? distanceKm(myLocation, da) : Infinity) -
        (db ? distanceKm(myLocation, db) : Infinity)
      );
    });
  }, [places, search, myLocation]);

  const active = filtered.find((place) => place.id === selectedId) ?? filtered[0] ?? null;

  const askNearMe = () => {
    if (!("geolocation" in navigator)) {
      setLocationNote("This browser cannot share a location, so the list stays in its default order.");
      return;
    }
    setLocating(true);
    setLocationNote("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // The list re-sorts off `myLocation`, so saving the point is the whole
        // answer — distances change as the reader moves, which is exactly why
        // the fix comes from the browser and not from the server read.
        setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationNote("No location came back, so the list stays in its default order.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const distanceWords = (place: LocatorPlace): string => {
    const coords = coordsOf(place);
    if (!myLocation || !coords) return "";
    const km = distanceKm(myLocation, coords);
    return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;
  };

  const directionsHref = active
    ? `https://maps.google.com/?q=${encodeURIComponent(
        active.kind === "branch"
          ? active.address
          : [active.area, active.city, siteName].filter(Boolean).join(", ")
      )}`
    : "";

  return (
    <section className="w-full text-[var(--foreground)] py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* ── Page Header ── */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wide uppercase">
            <Store className="w-4 h-4 stroke-[2.2]" />
            Find Us Nearby
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Store <span className="text-gradient-primary">Locator</span>
          </h1>
          <p className="text-sm md:text-base text-[var(--foreground-muted)]">
            The {siteName} head office, and every seller shop trading on the platform right
            now. Pick a shop to open its storefront.
          </p>
        </div>

        {/* ── Search & near me ── */}
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--foreground-muted)]">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city or area..."
              className="w-full pl-11 pr-4 py-3.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs placeholder:text-[var(--foreground-muted)]"
            />
          </div>
          <button
            type="button"
            onClick={askNearMe}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-bold hover:border-primary/50 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-primary" />}
            Near me
          </button>
        </div>
        {locationNote && (
          <p className="text-center text-[11px] text-[var(--foreground-muted)] -mt-4">{locationNote}</p>
        )}

        {/* ── Main Interactive Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Place cards */}
          <div className="lg:col-span-5 space-y-4 max-h-[680px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider px-1">
              <span>
                Results ({filtered.length})
                {myLocation && <span className="normal-case font-normal"> · nearest first</span>}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-8 text-center space-y-3">
                <MapPin className="w-8 h-8 text-[var(--foreground-muted)] mx-auto" />
                <h3 className="font-bold">No place found</h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Nothing matches “{search}”. A shop that is hidden, suspended or closed is
                  not listed here.
                </p>
              </div>
            ) : (
              filtered.map((place) => {
                const isSelected = active?.id === place.id;
                const distance = distanceWords(place);
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => setSelectedId(place.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-[var(--surface-elevated)] border-primary shadow-md ring-2 ring-primary/20"
                        : "bg-[var(--surface-elevated)] border-[var(--border-color)] hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {place.kind === "branch" ? (
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Store className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <h3 className="font-bold text-base truncate">{place.name}</h3>
                        </div>
                        <p className="text-xs text-[var(--foreground-muted)] mt-1">
                          {place.address || "No street address published"}
                        </p>
                      </div>
                      {distance ? (
                        <span className="text-xs font-bold text-primary shrink-0 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                          {distance}
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border shrink-0 ${
                            place.kind === "branch"
                              ? "text-primary border-primary/20 bg-primary/10"
                              : "text-emerald-600 dark:text-emerald-400 border-emerald-300/50 dark:border-emerald-700/50 bg-emerald-500/10"
                          }`}
                        >
                          {place.kind === "branch" ? "Office" : "Trading"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs">
                      {place.kind === "branch" ? (
                        <>
                          <span className="text-[var(--foreground-muted)] flex items-center gap-1 truncate">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            {place.phone || "No phone set"}
                          </span>
                          {place.hours && (
                            <span className="text-[var(--foreground-muted)] truncate">{place.hours}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {place.rating !== undefined && place.rating > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {place.rating.toFixed(1)}
                            </span>
                          )}
                          {place.category && (
                            <span className="text-[var(--foreground-muted)] truncate">{place.category}</span>
                          )}
                          <span className="text-[var(--foreground-muted)]">
                            {place.productCount ?? 0} products
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active place detail */}
          {active && (
            <div className="lg:col-span-7 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              {/* Map box */}
              <div className="relative w-full h-64 md:h-72 bg-[var(--surface-alt)] rounded-2xl overflow-hidden border border-[var(--border-color)] flex flex-col items-center justify-center p-6 text-center group">
                <div className="relative z-10 flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{active.name}</h4>
                    <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                      {[active.address, active.city].filter(Boolean).join(", ") ||
                        "Address on request"}
                      {distanceWords(active) ? ` · ${distanceWords(active)}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Get Directions
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </a>
                    {active.kind === "shop" && active.slug && (
                      <Link
                        href={`/stores/${active.slug}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-bold hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <Store className="w-3.5 h-3.5" />
                        Visit shop
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {active.kind === "branch" ? (
                      <>
                        <Phone className="w-4 h-4 text-primary" />
                        <span>Contact & Hours</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-4 h-4 text-primary" />
                        <span>About this shop</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs md:text-sm text-[var(--foreground-muted)] leading-relaxed bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border-color)] space-y-1">
                    {active.kind === "branch" ? (
                      <>
                        <p>{active.phone || "No phone set in Settings"}</p>
                        <p>{active.hours || "Opening hours are not published"}</p>
                      </>
                    ) : (
                      <>
                        <p>
                          A seller shop on {siteName}. Its{" "}
                          {active.productCount ?? 0} published{" "}
                          {(active.productCount ?? 0) === 1 ? "listing is" : "listings are"} on
                          the storefront, and orders ship from the shop itself.
                        </p>
                        {active.rating !== undefined && active.rating > 0 && (
                          <p>Shoppers rate it {active.rating.toFixed(1)} out of 5.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Where</span>
                  </div>
                  <p className="text-xs md:text-sm text-[var(--foreground-muted)] leading-relaxed bg-[var(--surface-alt)] p-4 rounded-xl border border-[var(--border-color)]">
                    {active.kind === "branch"
                      ? active.address
                      : [active.area, active.city].filter(Boolean).join(", ") ||
                        "This shop has not filled in its address yet — follow it on its storefront."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
