"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole } from "../core/roles";
import type { RiderApplicationDraft, RiderApplicationProfileUpdate } from "@/types/rider";

/**
 * The rider writes.
 *
 * Identity is never sent from the browser: the API reads the account from the
 * token, so submitting or withdrawing can only ever touch the caller's own row.
 * The admin actions check the role again here as well, because a server action
 * is a public endpoint and hiding the button is not a permission.
 */

/**
 * Submits — or resubmits — the rider application of the signed-in account.
 *
 * The same call converts an existing customer: the API links the row to the
 * account it already has, so no second user is ever created and the orders,
 * reviews, wishlist and wallet stay untouched. Approval adds the `rider` entry
 * to the account's roles array without removing `customer`, so a delivery
 * driver who was a shopper keeps shopping.
 */
export const submitRiderApplication = async (data: RiderApplicationDraft) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to apply as a rider." };
  }
  return serverMutation("/rider-applications", data, "POST");
};

/**
 * Saves the rider's own copy of the application file.
 *
 * The profile page shows everything the wizard once collected — filled and
 * unfilled — so this is the one place a rider may correct a plate number, renew
 * a licence date or swap a document without a support ticket. The API finds the
 * row from the token, so the body can never name another person's file, and the
 * service keeps the account row in step so dispatch and the customer's tracking
 * screen read the same vehicle.
 */
export const updateMyRiderProfile = async (data: RiderApplicationProfileUpdate) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to edit your rider profile." };
  }
  return serverMutation("/rider-applications/mine", data, "PATCH");
};

/** Withdraws the caller's pending rider application. */
export const cancelRiderApplication = async () => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to withdraw your application." };
  }
  return serverMutation("/rider-applications/mine/cancel", {}, "POST");
};

/**
 * Moves one rider application through review: `under_review`, `approve` or
 * `reject`.
 *
 * Approval is the only action that changes the account's roles array, and the
 * API performs the user, application and notification writes together, so a
 * failed review leaves the applicant exactly where they were.
 */
export const reviewRiderApplication = async (
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
  return serverMutation(`/rider-applications/${applicationId}/review`, data, "PATCH");
};
