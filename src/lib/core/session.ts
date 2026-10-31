"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";
import { canShop, roleOf } from "./roles";

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
 * Returns the current user if they hold `role`, otherwise redirects.
 * Admin access also covers the demo admin account.
 */
export const getRequiredRole = async (role: Role) => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  const hasAccess =
    role === "admin"
      ? user.role === "admin" || roleOf(user) === "demoadmin"
      : user.role === role;

  if (!hasAccess) {
    redirect("/forbidden");
  }

  return user;
};

/**
 * Returns the current user when they are allowed to shop: a customer, or a
 * vendor buying from another shop. An approved seller keeps the same account
 * they had as a customer, so their cart, wishlist and orders stay reachable
 * from the buyer dashboard alongside the seller workspace. Staff and riders are
 * never buyers, so they are still sent to /forbidden.
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
