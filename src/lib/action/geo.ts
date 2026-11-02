"use server";

import { geocodeAddress } from "@/lib/geo";
import type { DeliveryDestination } from "@/types/delivery";

/**
 * Puts a selected store-locator place on the map.
 *
 * The branch already arrives with coordinates (the server page geocodes it
 * once). Seller shops publish only an area and a city — the street and the
 * exact point stay private — so their coordinates are looked up on demand, the
 * first time a shopper opens their card, and answered from the same day-long
 * cache the tracking map uses. One lookup per shop, never a batch, keeps the
 * free Nominatim service honest.
 */
export const geocodePlaceAction = async (
  address: string,
  city?: string
): Promise<DeliveryDestination | null> => {
  return geocodeAddress(address, city);
};
