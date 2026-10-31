import React from "react";
import CheckoutClient from "./CheckoutClient";
import { getCartByUserId } from "@/lib/api/cart";
import { getSavedAddresses } from "@/lib/api/address";
import { getUserSession } from "@/lib/core/session";
import { CartData, SavedAddress } from "@/types";
import { getSiteSettings } from "@/lib/api/siteSettings";

export async function generateMetadata() {
  const res = await getSiteSettings();
  const siteName = res?.data?.siteName || "Sparq";

  return {
    title: "Checkout",
    description: `Complete your order securely with ${siteName}. Enter your shipping address and choose from Cash on Delivery or instant mobile wallet payments (bKash, Rocket, Nagad).`,
  };
}

interface CheckoutPageProps {
  /** `?coupon=<CODE>` is the cart's code, carried over so a refresh keeps it. */
  searchParams: Promise<{ coupon?: string }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  // The cart hands its code over in the url, so a refreshed page keeps the
  // shopper's deal. Only the name is trusted - checkout re-prices it below.
  const { coupon: couponParam } = await searchParams;
  const initialCouponCode = couponParam?.trim().toUpperCase() || undefined;

  const user = await getUserSession();
  let initialCart: CartData | null = null;
  let savedAddresses: SavedAddress[] = [];

  if (user?.id) {
    try {
      const res = await getCartByUserId(user.id);
      if (res?.success && res.data) {
        initialCart = res.data;
      }
    } catch {
      // Unauthenticated or backend unavailable during SSR
    }

    try {
      // The address book only exists for a signed-in customer, so this is
      // fetched together with the cart and handed to the client as a prop.
      const res = await getSavedAddresses();
      if (Array.isArray(res?.data)) {
        savedAddresses = res.data;
      }
    } catch {
      // No saved addresses is a normal state, not an error worth blocking on
    }
  }

  return (
    <CheckoutClient
      initialCart={initialCart}
      user={user}
      savedAddresses={savedAddresses}
      initialCouponCode={initialCouponCode}
    />
  );
}
