"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";
import { canShop, hasRole, isAdminRole, roleOf } from "./roles";

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
  return session?.user ?? null;
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
 */
export const getRequiredRole = async (role: Role) => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  const hasAccess =
    role === "admin"
      ? isAdminRole(user)
      : role === "user"
        ? true
        : hasRole(user, role);

  if (!hasAccess) {
    redirect("/forbidden");
  }

  return user;
};

/**
 * Returns the current user when they are allowed to shop: an account whose
 * approved `roles` array contains `customer`.
 *
 * The strict multi-role rule means an approved rider or vendor who never had
 * the customer entry — a legacy row that skipped the migration, or an account
 * granted authority directly — is refused here as well as at the API boundary.
 * A customer who also sells or delivers still passes, because the customer
 * entry stays in their array the whole time.
 */
export const getRequiredShopper = async () => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (!canShop(user)) {
    redirect("/forbidden");
  }

  return user;
};

/**
 * The dashboard the account should land on after signing in.
 *
 * Reads `activeRole`, but only trusts it when the same value also appears in
 * the approved array — otherwise a stale session would send someone to a
 * dashboard they no longer hold. Falls back to the first approved role, then
 * to customer, which is the entry every fresh registration gets.
 */
export const resolveActiveRole = (user: {
  role?: string | null;
  activeRole?: string | null;
  roles?: string[] | string | null;
}): string => {
  const pool = ((): string[] => {
    const raw = (user as any).roles;
    if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
    if (typeof raw === "string" && raw) return raw.split(",").map((r) => r.trim().toLowerCase());
    const fallback = roleOf(user);
    return fallback ? [fallback] : ["customer"];
  })();
  const wanted = roleOf(user);
  if (wanted && pool.includes(wanted)) return wanted;
  return pool[0] || "customer";
};
