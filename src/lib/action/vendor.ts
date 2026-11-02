"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole, isVendorRole } from "../core/roles";
import type {
  BillingCycle,
  VendorBusinessAddress,
  VendorPersonalInfo,
  VendorPlanId,
  VendorProductDraft,
  VendorStoreInfo,
  VendorVerification,
} from "@/types/vendor";

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

/**
 * What the seller's own profile page sends.
 *
 * The profile shows the whole application file — the person, the shop, the
 * business address and the verification upload — so a save carries the sections
 * the form holds rather than one strict submission. The slug is left out of the
 * payload because every published link to the shop is built from it, and the
 * plan is left out because changing one is a paid action that belongs on the
 * subscription desk.
 */
export interface VendorProfileUpdate {
  personalInfo?: Partial<VendorPersonalInfo>;
  storeInfo?: Partial<Omit<VendorStoreInfo, "slug">>;
  businessAddress?: Partial<VendorBusinessAddress>;
  verification?: Partial<VendorVerification>;
  isVisible?: boolean;
}

/**
 * Saves the signed-in seller's application file.
 *
 * One call writes the record the review desk read, the storefront row buyers
 * actually see, and the account's display name and phone, because those are the
 * same answers kept in three places. The API resolves every row from the token,
 * so this can never be pointed at another seller's shop.
 */
export const updateMyVendorProfile = async (data: VendorProfileUpdate) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to edit your store profile." };
  }
  return serverMutation("/vendor-applications/mine", data, "PATCH");
};

/** Saves a new product as a draft, or publishes it in the same call. */
export const createVendorProduct = async (
  data: Partial<VendorProductDraft> & {
    title: string;
    categoryId: string;
    price: number;
    image: string;
  },
  publish: boolean
) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation("/vendor-products", { ...data, publish }, "POST");
};

/** Edits one of the vendor's own products; the id is checked against the token. */
export const updateVendorProduct = async (
  productId: string,
  data: Partial<VendorProductDraft> & { status?: string }
) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-products/${productId}`, data, "PATCH");
};

/** Archives a product; orders that already reference it are untouched. */
export const archiveVendorProduct = async (productId: string) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-products/${productId}`, {}, "DELETE");
};

/**
 * Buys one plan period with the demo wallet.
 *
 * The price is decided by the API from the plan table, so nothing here can
 * change what a plan costs. `idempotencyKey` turns a double click into one
 * payment instead of two.
 */
export const checkoutVendorSubscription = async (data: {
  planId: VendorPlanId;
  billingCycle: BillingCycle;
  method: "bkash" | "nagad" | "rocket" | "wallet";
  transactionId?: string;
  idempotencyKey?: string;
}) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation("/vendor-subscription/checkout", data, "POST");
};

/**
 * Moves one of the vendor's own order groups forward.
 *
 * The API checks ownership and which step is legal, so a stale tab cannot skip
 * a stage or touch another seller's lines. Rejecting needs a reason.
 */
export const updateVendorOrderStatus = async (
  orderId: string,
  status: "accepted" | "processing" | "ready_for_shipment" | "rejected",
  reason?: string
) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-orders/${orderId}/status`, { status, reason }, "PATCH");
};

/** Stops the renewal; the period the vendor already paid for still runs out. */
export const cancelVendorRenewal = async () => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation("/vendor-subscription/cancel-renewal", {}, "POST");
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
