"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole } from "../core/roles";
import type { BillingCycle, VendorPlanId } from "@/types/vendor";

/**
 * The marketplace writes.
 *
 * Identity is never sent from the browser: the API reads the account from the
 * token, so submitting or withdrawing can only ever touch the caller's own row.
 * The admin actions check the role again here as well, because a server action
 * is a public endpoint and hiding the button is not a permission.
 */

export interface VendorApplicationPayload {
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    contactInfo?: string;
  };
  storeInfo: {
    name: string;
    slug?: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    email?: string;
    phone?: string;
    category?: string;
    website?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      x?: string;
      linkedin?: string;
    };
  };
  businessAddress: {
    country?: string;
    division?: string;
    city?: string;
    area?: string;
    address?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  verification?: {
    businessType?: string;
    registrationNumber?: string;
    documentUrl?: string;
    notes?: string;
  };
  selectedPlan: VendorPlanId;
  billingCycle: BillingCycle;
}

/**
 * Submits — or resubmits — the application of the signed-in account.
 *
 * The same call converts an existing customer: the API links the row to the
 * account it already has, so no second user is ever created and the orders,
 * reviews, wishlist and wallet stay untouched.
 */
export const submitVendorApplication = async (data: VendorApplicationPayload) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to apply as a vendor." };
  }
  return serverMutation("/vendor-applications", data, "POST");
};

/** Withdraws the caller's pending application, freeing the account to log in. */
export const cancelVendorApplication = async () => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to withdraw your application." };
  }
  return serverMutation("/vendor-applications/mine/cancel", {}, "POST");
};

/**
 * Moves one application through review: `under_review`, `approve` or `reject`.
 *
 * Approval is the only action that changes the account's role, and the API
 * performs the store, role, subscription and application writes together, so a
 * failed review leaves the applicant exactly where they were.
 */
export const reviewVendorApplication = async (
  applicationId: string,
  data: {
    action: "under_review" | "approve" | "reject";
    reason?: string;
    notes?: string;
  }
) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation(`/vendor-applications/${applicationId}/review`, data, "PATCH");
};

/** The fields a vendor may change about their own storefront. */
export interface VendorStoreUpdate {
  name?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email?: string;
  phone?: string;
  category?: string;
  website?: string;
  isVisible?: boolean;
  address?: {
    country?: string;
    division?: string;
    city?: string;
    area?: string;
    address?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    x?: string;
    linkedin?: string;
  };
}

/**
 * Saves the signed-in vendor's storefront.
 *
 * The store is resolved from the token by the API, so this action cannot be
 * pointed at another seller's shop. The slug and the store status are not part
 * of the payload for the same reason.
 */
export const updateMyStore = async (data: VendorStoreUpdate) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to edit your store." };
  }
  return serverMutation("/vendor-store/mine", data, "PATCH");
};

/** The store team edits a plan's numbers; every limit check reads the result. */
export const updateVendorPlan = async (
  planId: VendorPlanId,
  data: Record<string, unknown>
) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation(`/vendor-plans/${planId}`, data, "PATCH");
};
