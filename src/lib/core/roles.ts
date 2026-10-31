/**
 * Role helpers shared by the server actions and layouts.
 *
 * Roles arrive from the session user as free-form strings ("Admin", "ADMIN",
 * "demoadmin", ...), so every comparison goes through a lowercased form.
 */

type RoleCarrier = { role?: string | null } | null | undefined;

/** The user's role, lowercased, or "" when unknown. */
export function roleOf(user: RoleCarrier): string {
  return (user?.role || "").toLowerCase();
}

/**
 * Admin and demo admin have the same authority; the demo admin is only
 * sandboxed on the backend (undoable writes), not by permission checks.
 */
export function isAdminRole(user: RoleCarrier): boolean {
  const role = roleOf(user);
  return role === "admin" || role === "demoadmin";
}

export function isRiderRole(user: RoleCarrier): boolean {
  return roleOf(user) === "rider";
}

/** Approved seller. They run a shop and still buy from other shops as customers. */
export function isVendorRole(user: RoleCarrier): boolean {
  return roleOf(user) === "vendor";
}

/**
 * Only a customer — or a vendor buying from another vendor — shops. Staff and
 * riders can browse the storefront, but a cart or a wishlist belongs to a
 * buyer.
 */
export function canShop(user: RoleCarrier): boolean {
  const role = roleOf(user);
  return role !== "admin" && role !== "demoadmin" && role !== "rider";
}

/**
 * The failure payload to send back when a non-shopper taps add-to-cart or
 * add-to-wishlist, or null when the action is allowed.
 */
export function shopperBlockedResult(user: RoleCarrier, action: string) {
  if (canShop(user)) return null;

  const role = roleOf(user);
  const who = role === "demoadmin" ? "Demo admin" : role === "admin" ? "Admin" : "Riders";
  return { success: false as const, message: `${who} cannot ${action}!` };
}
