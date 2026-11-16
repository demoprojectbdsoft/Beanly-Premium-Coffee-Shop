"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole, rolesOf } from "../core/roles";

/**
 * Who may work a warranty claim.
 *
 * The store team works any of them; a seller works the ones on their own
 * products. The API is the one that checks the product's owner, so this only
 * decides whether the call is worth making.
 */
const canWorkWarranties = (user: Parameters<typeof isAdminRole>[0]) =>
  isAdminRole(user) || rolesOf(user).includes("vendor");

/**
 * Customer: submit a warranty claim for one of their own warranties.
 * The caller's identity is resolved server-side from the auth token, so the
 * request body only carries the warranty reference and the claim details.
 */
export const submitWarrantyClaim = async (
  warrantyId: string,
  data: {
    reason: string;
    description: string;
    images?: string[];
  }
) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false, message: "Authentication required." };
  }
  return serverMutation(`/warranties/claim/${warrantyId}`, data, "POST");
};

/**
 * Admin: process a claim — mark under review, resolve, or reject.
 */
export const adminUpdateClaim = async (
  warrantyId: string,
  data: {
    action: "mark_under_review" | "resolve" | "reject";
    adminNote?: string;
    resolution?: string;
  }
) => {
  const user = await getUserSession();
  if (!canWorkWarranties(user)) {
    return { success: false, message: "Store access required." };
  }
  return serverMutation(`/warranties/claim/${warrantyId}`, data, "PATCH");
};

/**
 * Admin: add months to a warranty's coverage. The reason is required, because
 * the customer is emailed it and the record keeps it forever.
 */
export const adminExtendWarranty = async (
  warrantyId: string,
  data: { months: number; reason: string }
) => {
  const user = await getUserSession();
  if (!canWorkWarranties(user)) {
    return { success: false, message: "Store access required." };
  }
  return serverMutation(`/warranties/${warrantyId}/extend`, data, "PATCH");
};

/**
 * Admin: email the customer about one warranty. Only the subject and message are
 * sent; the server reads the address from the warranty record itself.
 */
export const emailWarrantyCustomer = async (
  warrantyId: string,
  data: { subject: string; message: string }
) => {
  const user = await getUserSession();
  if (!canWorkWarranties(user)) {
    return { success: false, message: "Store access required." };
  }
  return serverMutation(`/warranties/email/${warrantyId}`, data, "POST");
};