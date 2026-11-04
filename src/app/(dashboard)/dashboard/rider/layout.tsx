import { getRequiredRole } from "@/lib/core/session";
import RiderLocationProvider from "@/context/RiderLocationContext";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Only riders reach the rider workspace. Everyone else is sent to /forbidden,
 * and a signed-out visitor to the login page.
 *
 * The guard runs before the chrome, so a reader who is not a rider is refused
 * without ever seeing the rider sidebar and its job-sheet links.
 *
 * The provider below keeps the live position feed alive for every page in the
 * workspace, because this layout is mounted once and stays there while the
 * rider moves between their own screens. That is where the customer's map gets
 * its rider from: see RiderLocationContext for why the watch cannot live in a
 * job sheet.
 */
export default async function RiderLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("rider");
  return (
    <RiderLocationProvider>
      <DashboardShell workspace="rider">{children}</DashboardShell>
    </RiderLocationProvider>
  );
}
