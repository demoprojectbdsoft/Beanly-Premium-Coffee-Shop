import { getRequiredRole } from "@/lib/core/session";

/**
 * Only vendors reach the vendor workspace. Everyone else is sent to /forbidden,
 * and a signed-out visitor to the login page.
 */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("vendor");
  return <>{children}</>;
}
