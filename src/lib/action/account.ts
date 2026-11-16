"use server";

import { serverFetch } from "../core/server";
import { getDb } from "../core/mongo";

/**
 * Collects the caller's own site data — profile, orders, payments, reviews,
 * wishlist and cart — so the settings page can save it as a JSON file before
 * the account is deleted.
 *
 * The API decides whose data this is: it reads the id from the session token,
 * so this can only ever return the signed-in customer's records.
 */
export const exportMyAccountData = async () => {
  const res = await serverFetch("/users/me/export", true);

  if (!res?.data) {
    return { success: false as const, message: "Could not collect your data. Please try again." };
  }

  return { success: true as const, data: res.data };
};

/** Escapes regex special characters, so an address is matched literally. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does this email have an account?
 *
 * better-auth answers "check your inbox" for every address, so a page that
 * only asks better-auth can never say "there is no such account" — and the
 * customer then waits for a link that was never sent.
 *
 * The check reads the `user` collection better-auth writes to, ignoring case
 * so `John@Shop.com` finds `john@shop.com`.
 *
 * Trade-off: it reveals which emails are registered. For one store that is
 * worth a clear answer; a public multi-tenant service would keep the reply
 * uniform instead.
 */
export const isEmailRegistered = async (email: string): Promise<boolean> => {
  const address = email.trim();
  if (!address) return false;

  const user = await getDb()
    .collection("user")
    .findOne(
      { email: { $regex: `^${escapeRegex(address)}$`, $options: "i" } },
      { projection: { _id: 1 } }
    );

  return Boolean(user);
};
