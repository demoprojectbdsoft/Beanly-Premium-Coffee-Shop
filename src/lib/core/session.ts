"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";
import { hasRole, isAdminRole, rolesOf, suspendedRolesOf } from "./roles";

type Role = "admin" | "customer" | "rider" | "vendor" | "user";

/** Reads the better-auth session for the current request. */
const readSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
};

/** The signed-in user, or null when the request has no session. */
export const getUserSession = async () => {
  const session = await readSession();
  if (!session?.user) return null;
  // better-auth types `availability` as a plain string because it is an
  // additionalField. The rest of the app only ever sees the two real values
  // the schema allows, so narrow it here instead of at every call site.
  const { availability, ...rest } = session.user;
  return {
    ...rest,
    availability: availability === "offline" ? ("offline" as const) : ("online" as const),
  };
};

/** The session token the backend expects as a Bearer credential. */
export const getToken = async (): Promise<string | null> => {
  const session = await readSession();
  return session?.session?.token ?? null;
};

/**
 * Returns the current user if their approved `roles` array contains `role`,
 * otherwise redirects.
 *
 * With the multi-role design the account holds every authority at once, so a
 * customer who was later approved as a rider can open both dashboards without
 * signing out. The check reads the array, not `activeRole`, because the
 * switcher only points the shell at a dashboard — it never grants access on
 * its own. Admin access also covers the demo admin account.
 *
 * A parked role is still approved but the door is closed, so a suspension the
 * store team wrote is honoured here too — otherwise the workspace would keep
 * rendering for someone the review desk just stopped.
 */
export const getRequiredRole = async (role: Role) => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  const parked = suspendedRolesOf(user);
  const hasAccess =
    role === "admin"
      ? isAdminRole(user)
      : role === "user"
        ? true
        : hasRole(user, role) && (role === "customer" || !parked.includes(role));

  if (!hasAccess) {
    redirect("/forbidden");
  }

  return user;
};

/**
 * Returns the current user when their approved `roles` array contains
 * `customer`, otherwise redirects.
 *
 * This is the door to the buyer workspace, and nothing more. The URL is what
 * says which dashboard a person is reading, so reaching `/dashboard/customer`
 * only has to prove they hold the buyer entry — a vendor or a rider who also
 * buys has always been meant to keep their cart, wishlist and orders here, and
 * making them write a session hint first just produced a forbidden page for
 * somebody standing in the right place.
 *
 * The buying rules are a separate, stricter question (`canShop`: the buyer
 * entry AND the customer dashboard actually active) and they are enforced where
 * the money is — in the cart, wishlist and checkout actions, and again on the
 * API. Opening this door never lets a rider or a seller place an order they
 * could not place before.
 */
export const getRequiredCustomer = async () => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (!rolesOf(user).includes("customer")) {
    redirect("/forbidden");
  }

  return user;
};
