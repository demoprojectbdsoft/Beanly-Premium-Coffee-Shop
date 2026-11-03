"use client";

/**
 * Which dashboard the screen is showing, read from the URL first.
 *
 * Every piece of the dashboard shell (header, switcher, bell, bottom bar) used
 * to ask the session `activeRole` and then patch in the route as a fallback.
 * That order is what produced the bug: a rider sitting on `/dashboard/rider`
 * got a header that said "Customer", because the session hint had not caught up
 * with the page they were already reading. The session hint is a mirror the API
 * writes, so it can be one request behind, a different tab, or a stale cookie.
 * The URL cannot be any of those — it is the page.
 *
 * So: the path decides, the session only fills in for routes that are not
 * inside a workspace at all (`/dashboard/profile` redirects, the storefront).
 */

import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { NotificationView } from "@/lib/notifications";
import {
  WORKSPACE_LABELS,
  canEnterWorkspace,
  isStoreWorkspace,
  resolveWorkspace,
  rolesOf,
  suspendedRolesOf,
  type WorkspaceRole,
} from "@/lib/core/roles";

/** The session user carries more than better-auth's public type admits. */
type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  activeRole?: string | null;
  roles?: string[] | string | null;
  roleSuspensions?: { role?: string }[] | null;
};

export type DashboardRole = {
  pathname: string;
  user: SessionUser | undefined;
  /** The workspace the URL says we are in. Never unknown: it always draws a sidebar. */
  workspace: WorkspaceRole;
  /** The word the shell prints for it ("Seller", "Demo admin", ...). */
  label: string;
  /** Staff board rather than a buyer, rider or seller workspace. */
  isStore: boolean;
  /** Which copy and links the bell should use. */
  notificationView: NotificationView;
  /** Shopping only happens while the customer workspace is on screen. */
  showsCart: boolean;
  /** Every authority the account holds, for the switcher's row list. */
  heldRoles: string[];
  /** Roles the store team parked: still held, but the door is closed. */
  suspendedRoles: string[];
  /** Same answer the server guard will give, so a row can be greyed out. */
  canEnter: (role: WorkspaceRole) => boolean;
};

export function useDashboardRole(): DashboardRole {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user as SessionUser | undefined;

  const workspace = resolveWorkspace(pathname, user);
  const heldRoles = rolesOf(user);
  const isStore = isStoreWorkspace(workspace);

  // `/dashboard/admin` is the same desk for staff and for the sandbox, so the
  // URL cannot tell them apart — only the account can. Nothing else about the
  // workspace changes: the label is the one place it shows.
  const label =
    workspace === "admin" && heldRoles.includes("demoadmin") && !heldRoles.includes("admin")
      ? WORKSPACE_LABELS.demoadmin
      : WORKSPACE_LABELS[workspace];

  const notificationView: NotificationView = isStore
    ? "store"
    : workspace === "rider"
      ? "rider"
      : workspace === "vendor"
        ? "vendor"
        : "customer";

  // The cart is the buyer's basket, so it only belongs on the buyer dashboard —
  // not on the seller or rider board of an account that also happens to buy.
  const showsCart = workspace === "customer" && heldRoles.includes("customer");

  return {
    pathname,
    user,
    workspace,
    label,
    isStore,
    notificationView,
    showsCart,
    heldRoles,
    suspendedRoles: suspendedRolesOf(user),
    canEnter: (role: WorkspaceRole) => canEnterWorkspace(user, role),
  };
}
