import { getRequiredRole } from "@/lib/core/session";

/**
 * Only vendors reach the seller workspace. Everyone else is sent to
 * /forbidden, and a signed-out visitor to the login page.
 *
 * The role is read from the session, which is minted after the API confirmed
 * the account is a vendor — a customer cannot reach these pages by guessing a
 * URL, and neither can an applicant whose review is still open.
 */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("vendor");
  return <>{children}</>;
}
