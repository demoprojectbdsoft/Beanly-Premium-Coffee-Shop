"use server";

import { serverMutation } from "../core/server";
import { getRequiredRole } from "../core/session";
import { getUserById } from "../api/user";
import { getVendorApplication } from "../api/vendor";
import { getRiderApplication } from "../api/rider";
import { getUserOrdersAction } from "./orders";

export const updateUser = async (id: string, data: Record<string, unknown>) => {
  return serverMutation(`/users/${id}`, data, "PATCH");
};

export const deleteUser = async (id: string) => {
  return serverMutation(`/users/${id}`, {}, "DELETE");
};

/**
 * Points the account at a different dashboard.
 *
 * The store API refuses anything the caller does not already hold in their
 * approved array, so a hacked request cannot escalate a plain customer into an
 * admin. The session cookie refreshes on the next request, and the layout
 * guards read the array from the database, so the switch is instant.
 */
export const setActiveRole = async (role: string) => {
  return serverMutation("/users/me/active-role", { role }, "PATCH");
};

/** Admin-only: revoke one approved role from an account. */
export const revokeUserRole = async (
  id: string,
  payload: { role: string; reason?: string }
) => {
  return serverMutation(`/users/${id}/roles/revoke`, payload, "PATCH");
};

/** Admin-only: overwrite the full approved list on an account. */
export const setUserRoles = async (id: string, roles: string[]) => {
  return serverMutation(`/users/${id}/roles`, { roles }, "POST");
};

/**
 * Admin-only: park or release one approved role.
 *
 * A suspension closes one dashboard while the person keeps every other role
 * — unlike a revoke, the entry stays approved, so releasing it never needs a
 * fresh application.
 */
export const setUserRoleSuspension = async (
  id: string,
  payload: { role: string; suspended: boolean; reason?: string }
) => {
  return serverMutation(`/users/${id}/roles/suspension`, payload, "PATCH");
};

/**
 * Admin-only: the whole account as the store team reads it, for the inline
 * profile row on the users desk.
 *
 * The same bundle the dedicated `/users/[id]` page assembles server-side, but
 * callable from the client when a row expands: the fresh user row (authorities
 * and suspensions), the purchase list for the customer panel, and only the
 * marketplace applications the account actually reached for. Everything is read
 * here rather than trusted from the list row, so the panel never renders from a
 * stale claim about who someone is.
 */
export const getUserAdminDetail = async (id: string) => {
  await getRequiredRole("admin");
  if (!id) return null;

  const userResponse = await getUserById(id);
  const user = (userResponse?.data ?? null) as Record<string, unknown> | null;
  if (!user || !(user._id || user.id)) return null;

  const vendorApplicationId = user.vendorApplicationId
    ? String(user.vendorApplicationId)
    : "";
  const riderApplicationId = user.riderApplicationId
    ? String(user.riderApplicationId)
    : "";

  const [orders, vendorResponse, riderResponse] = await Promise.all([
    getUserOrdersAction(id),
    vendorApplicationId
      ? getVendorApplication(vendorApplicationId)
      : Promise.resolve(null),
    riderApplicationId ? getRiderApplication(riderApplicationId) : Promise.resolve(null),
  ]);

  return {
    user,
    orders: Array.isArray(orders) ? orders : [],
    vendorDetail: (vendorResponse?.data ?? null) as Record<string, unknown> | null,
    riderDetail: (riderResponse?.data ?? null) as Record<string, unknown> | null,
  };
};
