import { getRequiredCustomer } from "@/lib/core/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * The buyer workspace. A customer reaches it directly, and an approved vendor
 * keeps reaching it too: becoming a seller changes the role, not the account,
 * so the cart, wishlist and orders built up as a customer stay open here
 * alongside the seller pages. Staff and riders, who never buy, are refused.
 *
 * The door only asks whether the account holds the buyer entry. Which
 * dashboard is on screen is the URL's job, so a guard that also demanded a
 * matching session hint would send someone standing in the right place to the
 * forbidden page. Buying itself is still checked where the money moves.
 *
 * The guard is above the chrome, not below it: an account without the buyer
 * entry is refused before the buyer sidebar, the basket shortcut and the
 * workspace note have been drawn.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await getRequiredCustomer();
  return <DashboardShell workspace="customer">{children}</DashboardShell>;
}
