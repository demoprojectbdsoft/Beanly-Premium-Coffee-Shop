"use server";

import { serverMutation } from "../core/server";

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
