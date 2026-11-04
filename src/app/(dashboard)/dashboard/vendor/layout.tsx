import { getRequiredRole } from "@/lib/core/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Only vendors reach the vendor workspace. Everyone else is sent to /forbidden,
 * and a signed-out visitor to the login page.
 *
 * The guard comes before the chrome, so a refusal never carries the seller
 * sidebar on screen: the seller's screens only appear once this account has
 * been read as a seller.
 */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("vendor");
  return <DashboardShell workspace="vendor">{children}</DashboardShell>;
}
