import { getRequiredRole } from "@/lib/core/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * The staff desk, and the chrome around it.
 *
 * The order of these two lines is the whole point: the guard runs first and
 * throws the reader out to the login page or the forbidden page before
 * `DashboardShell` exists, so an account without the admin entry never receives
 * the admin sidebar at all. The chrome used to sit one level up in the
 * `/dashboard` layout, which meant it was already on screen — links, labels,
 * workspace toast and all — by the time this refusal arrived.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("admin");
  return <DashboardShell workspace="admin">{children}</DashboardShell>;
}
