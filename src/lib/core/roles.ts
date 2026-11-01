/**
 * Role helpers shared by the server actions and layouts.
 *
 * Roles arrive from the session user as free-form strings ("Admin", "ADMIN",
 * "demoadmin", ...), so every comparison goes through a lowercased form.
 *
 * With the multi-role system the session carries both a `roles: string[]`
 * array (every authority the account has been approved for) and an `activeRole`
 * /`role` string (the dashboard the account is currently looking at). Layouts
 * and guards must read the array, not the string — the string is a hint the
 * user could edit, while the array is the truth the store API wrote after an
 * admin review. The single-role helpers below stay exported because plenty of
 * older call-sites still read `user.role`; they treat that string as a
 * one-entry list so nothing regresses for accounts the migration has not
 * touched yet.
 */

type RoleCarrier = {
  role?: string | null;
  activeRole?: string | null;
  roles?: string[] | string | null;
  /** Per-role suspensions as the API stores them: [{ role, reason, ... }]. */
  roleSuspensions?: unknown;
} | null | undefined;

/** The user's active role, lowercased, or "" when unknown. */
export function roleOf(user: RoleCarrier): string {
  return ((user as any)?.activeRole || user?.role || "").toLowerCase();
}

/**
 * Normalises the approved-roles field into a lowercase, de-duplicated list.
 *
 * Better-auth may hand us a real array, a comma-joined string (older rows), a
 * single string, or nothing at all. Legacy sessions with only `role` are
 * treated as a one-entry list so existing checks keep working until the
 * migration fills the array.
 */
export function rolesOf(user: RoleCarrier): string[] {
  const raw = (user as any)?.roles;
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string" && raw.length > 0
      ? raw.split(",")
      : [user?.role, (user as any)?.activeRole];

  const seen = new Set<string>();
  for (const entry of list) {
    const value = typeof entry === "string" ? entry.toLowerCase().trim() : "";
    if (value) seen.add(value);
  }
  return Array.from(seen);
}

/**
 * Admin and demo admin have the same authority; the demo admin is only
 * sandboxed on the backend (undoable writes), not by permission checks.
 *
 * Reads the array so a customer who also happens to be a demo admin is still
 * treated as staff by the shell.
 */
export function isAdminRole(user: RoleCarrier): boolean {
  const pool = rolesOf(user);
  if (pool.length > 0) return pool.includes("admin") || pool.includes("demoadmin");
  const role = roleOf(user);
  return role === "admin" || role === "demoadmin";
}

export function isRiderRole(user: RoleCarrier): boolean {
  return hasRole(user, "rider");
}

/** Approved seller. They run a shop and still buy from other shops as customers. */
export function isVendorRole(user: RoleCarrier): boolean {
  return hasRole(user, "vendor");
}

/**
 * True when the account holds `wanted` anywhere in its approved array.
 *
 * Falls back to the single-role string for pre-migration rows so an existing
 * rider or vendor does not lose access to their own dashboard while the sweep
 * is still running.
 */
export function hasRole(user: RoleCarrier, wanted: string): boolean {
  const needle = wanted.toLowerCase();
  const pool = rolesOf(user);
  if (pool.length > 0) return pool.includes(needle);
  return roleOf(user) === needle;
}

/**
 * Only a customer shops, and only while they are actually on the customer
 * dashboard.
 *
 * Two conditions must both hold: `customer` appears in the approved array AND
 * the active dashboard (`activeRole`, mirrored into `role`) is `customer`. A
 * rider or a vendor who also carries the customer entry is refused while they
 * sit in their rider / vendor workspace — they have to switch to the customer
 * role first. An admin or demo admin never qualifies, because their array has
 * no customer entry to switch into. For legacy rows with no array the check
 * falls back to the single-role string, which still refuses staff and riders.
 */
export function canShop(user: RoleCarrier): boolean {
  const pool = rolesOf(user);
  const active = roleOf(user);
  if (pool.length === 0) return active === "customer";
  return pool.includes("customer") && active === "customer";
}

/**
 * True when the account could shop if it switched to the customer dashboard —
 * it holds the customer entry but is currently on a different workspace. Used
 * only to pick a friendlier "switch to Customer" message over a hard refusal.
 */
export function canSwitchToShopper(user: RoleCarrier): boolean {
  return rolesOf(user).includes("customer") && roleOf(user) !== "customer";
}

/**
 * The failure payload to send back when a non-shopper taps add-to-cart or
 * add-to-wishlist, or null when the action is allowed.
 */
export function shopperBlockedResult(user: RoleCarrier, action: string) {
  if (canShop(user)) return null;

  if (canSwitchToShopper(user)) {
    return {
      success: false as const,
      message: `Switch to the customer dashboard to ${action}!`,
    };
  }

  const role = roleOf(user);
  const who =
    role === "demoadmin" ? "Demo admin" : role === "admin" ? "Admin" : role === "vendor" ? "Vendors" : "Riders";
  return { success: false as const, message: `${who} cannot ${action}!` };
}

/**
 * The roles parked by the store team, normalised to lowercase names.
 *
 * A suspended role is still approved — it only cannot be entered — so every
 * switcher and fallback needs this list beside the approved array.
 */
export function suspendedRolesOf(user: RoleCarrier): string[] {
  const raw = (user as any)?.roleSuspensions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: unknown) =>
      typeof (row as any)?.role === "string" ? ((row as any).role as string).toLowerCase() : ""
    )
    .filter(Boolean);
}

/**
 * The dashboard the account should land on after signing in.
 *
 * Reads `activeRole`, but only trusts it when the same value also appears in
 * the approved array — otherwise a stale session would send someone to a
 * dashboard they no longer hold. A suspended entry is skipped the same way:
 * the role is still approved, but the door is parked until an admin reopens
 * it. Falls back to the first approved, unsuspended role, then to customer,
 * which is the entry every fresh registration gets.
 *
 * This is a pure helper, so it lives with the other role readers rather than
 * in the `"use server"` session module, where every export must be async.
 */
export function resolveActiveRole(user: RoleCarrier): string {
  const pool = rolesOf(user);
  const suspended = suspendedRolesOf(user);
  const wanted = roleOf(user);
  if (wanted && pool.includes(wanted) && (wanted === "customer" || !suspended.includes(wanted))) {
    return wanted;
  }
  return pool.find((role) => role === "customer" || !suspended.includes(role)) || pool[0] || "customer";
}
