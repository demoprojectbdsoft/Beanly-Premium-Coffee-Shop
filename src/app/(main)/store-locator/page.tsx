import { getSiteSettings } from "@/lib/api/siteSettings";
import { asStoreList, getPublicStores } from "@/lib/api/stores";
import { geocodeAddress } from "@/lib/geo";
import LocatorClient, { type LocatorPlace } from "./LocatorClient";

export const dynamic = "force-dynamic";

/**
 * Where to find us.
 *
 * The list is two real sources, not a sample: the platform's own branch is
 * whatever the store team typed into Settings (its address is looked up once,
 * through the same cached geocoder the tracking map uses), and every row under
 * it is a seller's shop that trades today. Shops whose address has no usable
 * coordinates still appear — they simply sit at the end of a distance-sorted
 * list instead of vanishing from a map page that cannot place them.
 */
export default async function StoreLocatorPage() {
  const [settingsRes, storesRes] = await Promise.all([
    getSiteSettings(),
    getPublicStores({ limit: 50, sort: "rating" }),
  ]);

  const settings = settingsRes?.data ?? {};
  const branchAddress: string = settings.address || "";

  const destination = branchAddress ? await geocodeAddress(branchAddress) : null;

  const branch: LocatorPlace = {
    id: "head-office",
    kind: "branch",
    name: `${settings.siteName || "Sparq"} Head Office`,
    address: branchAddress || "Address not set yet",
    city: "",
    area: "",
    phone: settings.supportPhone || "",
    hours: settings.openingHours || "",
    lat: destination?.lat ?? null,
    lng: destination?.lng ?? null,
  };

  const shops: LocatorPlace[] = (asStoreList(storesRes)?.stores ?? []).map((store) => ({
    id: store._id,
    kind: "shop" as const,
    name: store.name,
    address: [store.address.area, store.address.city].filter(Boolean).join(", "),
    city: store.address.city,
    area: store.address.area,
    slug: store.slug,
    category: store.category,
    rating: store.rating,
    productCount: store.productCount,
    // The public DTO keeps a shop's street address and coordinates private;
    // Directions then points at the city and area, which is still a place.
    lat: null,
    lng: null,
  }));

  return <LocatorClient branch={branch} shops={shops} siteName={settings.siteName || "Sparq"} />;
}
